/**
 * 订单数据处理辅助函数
 * 
 * 统一四端（用户端、画师端、客服端、管理端）的订单数据处理逻辑
 */

const orderStatusUtil = require('./order-status.js')

/**
 * 标准化订单数据（四端统一入口）
 * 
 * 这个函数确保：
 * 1. 所有订单都有完整的客服信息（名称+头像）
 * 2. 所有订单都有统一的状态文本
 * 3. 所有订单都有CSS类名用于样式绑定
 * 
 * @param {Array} orders - 原始订单数组
 * @param {Object} options - 可选配置
 * @returns {Array} 标准化后的订单数组
 */
function normalizeOrders(orders, options = {}) {
  if (!Array.isArray(orders)) return []
  
  const serviceList = options.serviceList || wx.getStorageSync('customer_service_list') || []
  // 🔧 修复：商品保存在 mock_products，不是 products
  const products = wx.getStorageSync('mock_products') || []
  
  // 🔧 统一 ID 类型转换函数（避免字符串/数字匹配失败）
  const toKey = v => v == null ? '' : String(v).trim()
  
  // 🔧 构建商品 ID 映射表（提升查找性能）
  const productById = new Map()
  products.forEach(p => {
    if (p.id) productById.set(toKey(p.id), p)
  })
  
  return orders.map(order => {
    // ⚠️ 第一步：先备份原始字段（防止被后续逻辑覆盖）
    const rawArtist = order.artistName
    const rawArtistAvatar = order.artistAvatar
    const rawService = order.serviceName
    const rawServiceAvatar = order.serviceAvatar
    
    // 🔧 统一类型 + 清洗空格（避免匹配失败）
    const o = { ...order }
    o.productId = toKey(o.productId)
    o.serviceId = toKey(o.serviceId)
    o.artistId = toKey(o.artistId)
    o.productName = (o.productName || '').trim()
    
    // 第二步：计算订单状态
    let processedOrder = orderStatusUtil.calculateOrderStatus(o)
    
    // 第三步：恢复原始非空字段（防止 calculateOrderStatus 覆盖）
    if (rawArtist && !processedOrder.artistName) processedOrder.artistName = rawArtist
    if (rawArtistAvatar && !processedOrder.artistAvatar) processedOrder.artistAvatar = rawArtistAvatar
    if (rawService && !processedOrder.serviceName) processedOrder.serviceName = rawService
    if (rawServiceAvatar && !processedOrder.serviceAvatar) processedOrder.serviceAvatar = rawServiceAvatar
    
    // 第四步：从商品表补充画师和图片信息（只在缺失时补充）
    let product = null
    if (processedOrder.productId) {
      product = productById.get(processedOrder.productId)
    }
    if (!product && processedOrder.productName) {
      product = products.find(p => (p.name || '').trim() === processedOrder.productName)
    }
    
    if (product) {
      // ⚠️ 只在缺失时补充，不覆盖已有值
      if (!processedOrder.artistName && product.artistName) {
        processedOrder.artistName = product.artistName
      }
      if (!processedOrder.artistAvatar && product.artistAvatar) {
        processedOrder.artistAvatar = product.artistAvatar
      }
      // 图片处理：只在缺失时补充
      if (!processedOrder.productImage && product.images && product.images[0]) {
        const img = product.images[0]
        if (img.startsWith('data:image')) {
          processedOrder.productImage = ''
          processedOrder._hasBase64Image = true
        } else {
          processedOrder.productImage = img
        }
      }
    }
    
    // 第五步：从客服列表补充客服信息（只在缺失时补充）
    processedOrder = orderStatusUtil.withServiceFallback(processedOrder, serviceList)
    
    // 第六步：统一状态文本和样式类名
    processedOrder.statusText = orderStatusUtil.textOf(processedOrder.status)
    processedOrder.statusClass = orderStatusUtil.classOf(processedOrder.status)
    
    // 🎯 最终确保：原始非空值绝对优先（强制恢复）
    if (rawArtist) processedOrder.artistName = rawArtist
    if (rawArtistAvatar) processedOrder.artistAvatar = rawArtistAvatar
    if (rawService) processedOrder.serviceName = rawService
    if (rawServiceAvatar) processedOrder.serviceAvatar = rawServiceAvatar
    
    return processedOrder
  })
}

/**
 * 快速获取订单池（从多个存储源合并）
 * @returns {Array} 合并后的订单数组
 */
function getAllOrders() {
  const orders = wx.getStorageSync('orders') || []
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  const completedOrders = wx.getStorageSync('completed_orders') || []
  
  // 合并并去重（以 id 为准）
  const orderMap = new Map()
  ;[...orders, ...pendingOrders, ...completedOrders].forEach(order => {
    if (order.id && !orderMap.has(order.id)) {
      orderMap.set(order.id, order)
    }
  })
  
  return Array.from(orderMap.values())
}

/**
 * 为页面准备订单数据（完整流程）
 * 
 * @param {Object} filter - 筛选条件
 * @param {string} filter.role - 角色类型 ('customer', 'artist', 'service', 'admin')
 * @param {string} filter.userId - 当前用户ID
 * @param {string} filter.status - 状态筛选（可选）
 * @returns {Array} 处理好的订单数组
 */
function prepareOrdersForPage(filter = {}) {
  // 1. 获取所有订单
  let allOrders = getAllOrders()
  
  // 2. 根据角色筛选
  if (filter.role && filter.userId) {
    switch (filter.role) {
      case 'customer':
        // 用户：只看自己的订单
        allOrders = allOrders.filter(o => o.buyerId === filter.userId)
        break
      case 'artist':
        // 画师：只看分配给自己的订单
        allOrders = allOrders.filter(o => o.artistId === filter.userId)
        break
      case 'service':
        // 客服：只看分配给自己的订单（包括未分配的）
        allOrders = allOrders.filter(o => o.serviceId === filter.userId || !o.serviceId)
        break
      case 'admin':
        // 管理员：查看所有订单
        break
    }
  }
  
  // 3. 标准化处理
  allOrders = normalizeOrders(allOrders)
  
  // 4. 状态筛选（可选）
  if (filter.status && filter.status !== 'all') {
    allOrders = allOrders.filter(o => o.status === filter.status)
  }
  
  return allOrders
}

module.exports = {
  normalizeOrders,
  getAllOrders,
  prepareOrdersForPage
}

