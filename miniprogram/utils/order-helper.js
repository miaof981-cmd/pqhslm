// miniprogram/utils/order-helper.js

const orderStatusUtil = require('./order-status.js')

/**
 * 统一处理订单信息
 * 目标：
 * 1️⃣ 绑定正确的画师和客服信息
 * 2️⃣ 确保头像正常显示
 * 3️⃣ 保留已有的非空字段，不被覆盖
 * 4️⃣ 不在数据层写默认头像
 */

function normalizeOrders(orders, options = {}) {
  if (!Array.isArray(orders)) return []

  // 获取数据源
  const products = wx.getStorageSync('mock_products') || []
  const services = options.serviceList || wx.getStorageSync('customer_service_list') || []

  return orders.map(order => {
    if (!order) return order

    // === 1️⃣ 备份原始字段 ===
    const rawArtistName = order.artistName
    const rawArtistAvatar = order.artistAvatar
    const rawServiceName = order.serviceName
    const rawServiceAvatar = order.serviceAvatar
    
    // 🔍 调试：打印原始订单的客服头像
    if (order.id && order.id.includes('202511051')) {
      console.log(`🔍 [order-helper] 订单 ${order.id} 原始数据:`)
      console.log('  - serviceName:', order.serviceName)
      console.log('  - serviceAvatar:', order.serviceAvatar ? order.serviceAvatar.substring(0, 50) + '...' : '❌ 空')
    }

    // === 2️⃣ 计算状态（不改字段） ===
    let processed = orderStatusUtil.calculateOrderStatus
      ? orderStatusUtil.calculateOrderStatus(order)
      : { ...order }
    
    // 🔍 调试：计算状态后检查
    if (order.id && order.id.includes('202511051')) {
      console.log(`  - 计算状态后 serviceAvatar:`, processed.serviceAvatar ? processed.serviceAvatar.substring(0, 50) + '...' : '❌ 空')
    }

    // === 3️⃣ 恢复原始非空字段 ===
    if (rawArtistName && !processed.artistName) processed.artistName = rawArtistName
    if (rawArtistAvatar && !processed.artistAvatar) processed.artistAvatar = rawArtistAvatar
    if (rawServiceName && !processed.serviceName) processed.serviceName = rawServiceName
    if (rawServiceAvatar && !processed.serviceAvatar) processed.serviceAvatar = rawServiceAvatar

    // === 4️⃣ 通过商品表补充画师信息（仅在为空时补，不写默认图）===
    let product = null
    if (processed.productId) {
      product = products.find(p => String(p.id) === String(processed.productId))
    } else if (processed.productName) {
      product = products.find(p => p.name === processed.productName)
    }

    if (product) {
      if (!processed.artistName && product.artistName) {
        processed.artistName = product.artistName
      }
      // 🎯 只在为空时补，且不要把默认图写回订单对象
      if (!processed.artistAvatar && product.artistAvatar) {
        processed.artistAvatar = product.artistAvatar
      }
      if (!processed.productImage && product.images && product.images.length > 0) {
        processed.productImage = product.images[0]
      }
    }

    // === 5️⃣ 通过客服表补充客服信息（仅在为空时补，不写默认图）===
    if ((!processed.serviceName || processed.serviceName === '待分配' || processed.serviceName === '客服未分配') && services.length > 0) {
      let matched = null
      
      // 优先通过 serviceId 匹配
      if (processed.serviceId) {
        matched = services.find(
          s => String(s.userId) === String(processed.serviceId) || String(s.id) === String(processed.serviceId)
        )
      }
      
      // 如果没有 serviceId 或匹配失败，使用第一个在线客服
      if (!matched) {
        matched = services.find(s => s.isActive) || services[0]
      }
      
      if (matched) {
        processed.serviceId = matched.userId || matched.id
        processed.serviceName = matched.name || matched.nickName || '在线客服'
        // 🎯 只在为空时补，且不要把默认图写回订单对象
        if (!processed.serviceAvatar && (matched.avatar || matched.avatarUrl)) {
          processed.serviceAvatar = matched.avatar || matched.avatarUrl
        }
      }
    }

    // === 6️⃣ 最后再次确保不覆盖原值（但不恢复错误值）===
    if (rawArtistName && rawArtistName !== '画师' && rawArtistName !== '未知画师') {
      processed.artistName = rawArtistName
    }
    if (rawArtistAvatar) {
      processed.artistAvatar = rawArtistAvatar
    }
    // ⚠️ 不恢复"待分配"和"客服未分配"，让第5步的补充逻辑生效
    if (rawServiceName && rawServiceName !== '待分配' && rawServiceName !== '客服未分配') {
      processed.serviceName = rawServiceName
    }
    if (rawServiceAvatar) {
      processed.serviceAvatar = rawServiceAvatar
    }
    
    // 🔍 调试：最终结果检查
    if (order.id && order.id.includes('202511051')) {
      console.log(`  - 最终 serviceAvatar:`, processed.serviceAvatar ? processed.serviceAvatar.substring(0, 50) + '...' : '❌ 空')
      console.log(`  - rawServiceAvatar:`, rawServiceAvatar ? rawServiceAvatar.substring(0, 50) + '...' : '❌ 空')
    }

    // === 7️⃣ 状态文本 & class ===
    processed.statusText = orderStatusUtil.textOf(processed.status)
    processed.statusClass = orderStatusUtil.classOf(processed.status)

    // === 8️⃣ 不写默认头像，让 WXML 自己兜底 ===
    return processed
  })
}

/**
 * 快速获取订单池（从多个存储源合并）
 * @returns {Array} 合并后的订单数组
 */
function getAllOrders() {
  const orders = wx.getStorageSync('orders') || []
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  
  // 合并订单（去重，以 id 为准）
  const orderMap = new Map()
  ;[...orders, ...pendingOrders].forEach(order => {
    if (order.id && !orderMap.has(order.id)) {
      orderMap.set(order.id, order)
    }
  })
  
  return Array.from(orderMap.values())
}

/**
 * 统一入口：为页面准备订单数据
 * @param {Object} options - 配置项
 * @param {String} options.role - 角色：'customer' | 'artist' | 'service' | 'admin'
 * @param {String} options.userId - 当前用户ID
 * @returns {Array} 标准化后的订单数组
 */
function prepareOrdersForPage(options = {}) {
  const { role, userId } = options
  
  // 1. 获取所有订单
  let allOrders = getAllOrders()
  
  // 2. 根据角色筛选
  if (role === 'customer') {
    // 用户端：只看自己的订单
    allOrders = allOrders.filter(order => order.buyerId === userId)
  } else if (role === 'artist') {
    // 画师端：只看分配给自己的订单
    allOrders = allOrders.filter(order => order.artistId === userId)
  } else if (role === 'service') {
    // 客服端：看分配给自己的订单 + 未分配的订单
    allOrders = allOrders.filter(order => order.serviceId === userId || !order.serviceId)
  }
  // admin 不筛选，看所有订单
  
  // 3. 标准化处理
  const serviceList = wx.getStorageSync('customer_service_list') || []
  return normalizeOrders(allOrders, { serviceList })
}

module.exports = {
  normalizeOrders,
  getAllOrders,
  prepareOrdersForPage
}
