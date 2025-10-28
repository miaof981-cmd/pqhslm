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
  
  // 获取客服列表（可选传入，默认从本地存储读取）
  const serviceList = options.serviceList || wx.getStorageSync('customer_service_list') || []
  
  return orders.map(order => {
    // 1. 计算订单状态（是否逾期、临近截稿等）
    let processedOrder = orderStatusUtil.calculateOrderStatus(order)
    
    // 2. 补充客服信息（头像兜底）
    processedOrder = orderStatusUtil.withServiceFallback(processedOrder, serviceList)
    
    // 3. 统一状态文本
    processedOrder.statusText = orderStatusUtil.textOf(processedOrder.status)
    
    // 4. 添加CSS类名
    processedOrder.statusClass = orderStatusUtil.classOf(processedOrder.status)
    
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

