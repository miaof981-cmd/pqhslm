// miniprogram/utils/order-helper.js

const orderStatusUtil = require('./order-status.js')
const { DEFAULT_AVATAR_DATA } = require('./constants.js')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('./image-helper.js')

const PLACEHOLDER_NAME_KEYWORDS = ['未知', '待分配', '未分配', '默认', 'unknown']
const PLACEHOLDER_ARTIST_NAMES = ['画师', '匿名画师', 'artist']
const PLACEHOLDER_SERVICE_NAMES = ['客服', '客服人员', 'customer service']
const PLACEHOLDER_AVATAR_EXACT = [
  '',
  orderStatusUtil.DEFAULT_AVATAR,
  DEFAULT_AVATAR_DATA,
  '/assets/default-avatar.png',
  '/assets/avatar.png'
]

const PLACEHOLDER_AVATAR_KEYWORDS = ['default-avatar', 'default_service', 'default-service']

function normalizeString(value) {
  if (value == null) return ''
  if (typeof value !== 'string') value = String(value)
  return value.trim()
}

function isMeaningfulName(name, type) {
  const normalized = normalizeString(name)
  if (!normalized) return false

  const lower = normalized.toLowerCase()
  const basePlaceholders = PLACEHOLDER_NAME_KEYWORDS
  if (basePlaceholders.some(keyword => lower.startsWith(keyword))) {
    return false
  }

  const specific = type === 'artist' ? PLACEHOLDER_ARTIST_NAMES : PLACEHOLDER_SERVICE_NAMES
  if (specific.some(placeholder => lower === placeholder.toLowerCase())) {
    return false
  }

  return true
}

function getMeaningfulName(name, type) {
  const normalized = normalizeString(name)
  return isMeaningfulName(normalized, type) ? normalized : ''
}

function isMeaningfulAvatar(avatar) {
  const normalized = normalizeString(avatar)
  if (!normalized) return false

  if (PLACEHOLDER_AVATAR_EXACT.includes(normalized)) {
    return false
  }

  const lower = normalized.toLowerCase()
  if (PLACEHOLDER_AVATAR_EXACT.includes(lower)) {
    return false
  }

  if (PLACEHOLDER_AVATAR_KEYWORDS.some(keyword => lower.includes(keyword))) {
    return false
  }

  return true
}

function getMeaningfulAvatar(avatar) {
  const normalized = normalizeString(avatar)
  return isMeaningfulAvatar(normalized) ? normalized : ''
}

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

    // === 1️⃣ 备份原始字段（包括终态状态） ===
    const rawArtistName = getMeaningfulName(order.artistName, 'artist')
    const rawArtistAvatar = getMeaningfulAvatar(order.artistAvatar)
    const rawServiceName = getMeaningfulName(order.serviceName, 'service')
    const rawServiceAvatar = getMeaningfulAvatar(order.serviceAvatar)
    // 🎯 新增：备份终态相关字段
    const rawStatus = order.status
    const rawRefundStatus = order.refundStatus
    const rawRefundData = {
      refundCompletedAt: order.refundCompletedAt,
      refundAmount: order.refundAmount,
      refundHistory: order.refundHistory
    }

    // === 2️⃣ 计算状态（终态不会被覆盖） ===
    let processed = orderStatusUtil.calculateOrderStatus
      ? orderStatusUtil.calculateOrderStatus(order)
      : { ...order }
    
    // 🎯 双重保险：如果原订单是终态，强制恢复
    const TERMINAL_STATES = ['completed', 'refunded', 'refunding', 'cancelled']
    if (TERMINAL_STATES.includes(rawStatus) && processed.status !== rawStatus) {
      console.warn(`⚠️ [订单标准化] 订单 ${order.id} 终态被覆盖 ${rawStatus} → ${processed.status}，强制恢复`)
      processed.status = rawStatus
      processed.refundStatus = rawRefundStatus
      processed.refundCompletedAt = rawRefundData.refundCompletedAt
      processed.refundAmount = rawRefundData.refundAmount
      processed.refundHistory = rawRefundData.refundHistory
    }

    // 统一清理占位符，避免后续判断被字符串"未知"阻断
    if (!isMeaningfulName(processed.artistName, 'artist')) processed.artistName = ''
    if (!isMeaningfulAvatar(processed.artistAvatar)) processed.artistAvatar = ''
    if (!isMeaningfulName(processed.serviceName, 'service')) processed.serviceName = ''
    if (!isMeaningfulAvatar(processed.serviceAvatar)) processed.serviceAvatar = ''

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
      const productArtistName = getMeaningfulName(product.artistName, 'artist')
      if (!processed.artistName && productArtistName) {
        processed.artistName = productArtistName
      }
      // 🎯 只在为空时补，且不要把默认图写回订单对象
      const productArtistAvatar = getMeaningfulAvatar(product.artistAvatar)
      if (!processed.artistAvatar && productArtistAvatar) {
        processed.artistAvatar = productArtistAvatar
      }
      if (!processed.productImage && product.images && product.images.length > 0) {
        processed.productImage = product.images[0]
      }
    }

    // === 5️⃣ 通过客服表补充客服信息（仅在为空时补，不写默认图）===
    if ((!processed.serviceName || processed.serviceName === '待分配') && processed.serviceId && services.length > 0) {
      const matched = services.find(
        s => String(s.userId) === String(processed.serviceId) || String(s.id) === String(processed.serviceId)
      )
      if (matched) {
        const matchedName = getMeaningfulName(matched.name || matched.nickName, 'service')
        processed.serviceName = matchedName || '待分配'
        // 🎯 只在为空时补，且不要把默认图写回订单对象
        const matchedAvatar = getMeaningfulAvatar(matched.avatar || matched.avatarUrl)
        if (!processed.serviceAvatar && matchedAvatar) {
          processed.serviceAvatar = matchedAvatar
        }
      }
    }

    // === 6️⃣ 修复无效头像：临时路径、本地路径或空值 ===
    // 🎯 画师头像修复逻辑
    const isInvalidArtistAvatar = !processed.artistAvatar || 
                                  processed.artistAvatar.startsWith('http://tmp/') || 
                                  processed.artistAvatar.startsWith('/assets/')
    
    if (isInvalidArtistAvatar && product && product.artistAvatar) {
      const productAvatar = getMeaningfulAvatar(product.artistAvatar)
      if (productAvatar && !productAvatar.startsWith('http://tmp/') && !productAvatar.startsWith('/assets/')) {
        processed.artistAvatar = productAvatar
      }
    }
    
    // 🎯 客服头像修复逻辑
    const isInvalidServiceAvatar = !processed.serviceAvatar || 
                                   processed.serviceAvatar.startsWith('http://tmp/') || 
                                   processed.serviceAvatar.startsWith('/assets/')
    
    if (isInvalidServiceAvatar && processed.serviceId && services.length > 0) {
      const matched = services.find(
        s => String(s.userId) === String(processed.serviceId) || String(s.id) === String(processed.serviceId)
      )
      if (matched) {
        const serviceAvatar = getMeaningfulAvatar(matched.avatar || matched.avatarUrl)
        if (serviceAvatar && !serviceAvatar.startsWith('http://tmp/') && !serviceAvatar.startsWith('/assets/')) {
          processed.serviceAvatar = serviceAvatar
        }
      }
    }

    // === 7️⃣ 恢复有效的原始值（只恢复名字，头像已在上面修复）===
    if (rawArtistName) processed.artistName = rawArtistName
    if (rawServiceName) processed.serviceName = rawServiceName

    // === 8️⃣ 兜底文案：仍未获取到有效信息时提供用户可理解的提示 ===
    if (!isMeaningfulName(processed.artistName, 'artist')) {
      processed.artistName = rawArtistName || '未知画师'
    }
    if (!isMeaningfulName(processed.serviceName, 'service')) {
      processed.serviceName = rawServiceName || '待分配'
    }
    if (!isMeaningfulAvatar(processed.artistAvatar)) {
      processed.artistAvatar = ''
    }
    if (!isMeaningfulAvatar(processed.serviceAvatar)) {
      processed.serviceAvatar = ''
    }

    // === 9️⃣ 状态文本 & class ===
    processed.statusText = orderStatusUtil.textOf(processed.status)
    processed.statusClass = orderStatusUtil.classOf(processed.status)

    // === 🔟 转换可渲染图片路径 ===
    processed.productImage = ensureRenderableImage(
      processed.productImage || (product && product.images && product.images[0]),
      { namespace: 'order-product', fallback: DEFAULT_PLACEHOLDER }
    )

    processed.artistAvatar = ensureRenderableImage(processed.artistAvatar, {
      namespace: 'order-artist',
      fallback: DEFAULT_AVATAR_DATA
    })

    processed.serviceAvatar = ensureRenderableImage(processed.serviceAvatar, {
      namespace: 'order-service',
      fallback: DEFAULT_AVATAR_DATA
    })

    processed.buyerAvatar = ensureRenderableImage(processed.buyerAvatar, {
      namespace: 'order-buyer',
      fallback: DEFAULT_AVATAR_DATA
    })

    if (!processed.serviceStatus && order.serviceStatus) {
      processed.serviceStatus = order.serviceStatus
    }
    if (order.serviceStatus && processed.serviceStatus) {
      processed.serviceStatus = String(processed.serviceStatus)
    }
    if (typeof order.needsService === 'boolean') {
      processed.needsService = order.needsService
    }

    const hasServiceName = isMeaningfulName(processed.serviceName, 'service')
    const hasServiceId = !!normalizeString(processed.serviceId)
    if (!processed.serviceStatus) {
      if (hasServiceId || hasServiceName) {
        processed.serviceStatus = 'assigned'
        processed.needsService = false
      } else {
        processed.serviceStatus = 'pending'
        processed.needsService = true
      }
    } else if (String(processed.serviceStatus).toLowerCase() === 'assigned') {
      processed.needsService = false
    }

    if (Array.isArray(processed.items) && processed.items.length > 0) {
      processed.items = processed.items.map(item => {
        if (!item) return item
        const normalized = { ...item }
        normalized.productImage = ensureRenderableImage(normalized.productImage, {
          namespace: 'order-item',
          fallback: DEFAULT_PLACEHOLDER
        })
        return normalized
      })
    }

    // === 11️⃣ 不写默认头像，让 WXML 自己兜底 ===
    return processed
  })
}

function isMeaningfulForMerge(key, value) {
  if (value == null) return false

  if (typeof value === 'string') {
    const normalized = normalizeString(value)
    if (!normalized) return false

    if (key === 'artistName') return isMeaningfulName(normalized, 'artist')
    if (key === 'serviceName') return isMeaningfulName(normalized, 'service')
    if (key === 'artistAvatar' || key === 'serviceAvatar' || key === 'buyerAvatar') {
      return isMeaningfulAvatar(normalized)
    }
    if (key === 'productImage') {
      if (normalized.startsWith('http://tmp/')) return false
      if (normalized.startsWith('/assets/')) return false
      return true
    }
    if (key === 'artistId' || key === 'serviceId' || key === 'buyerId') {
      return !!normalizeString(normalized)
    }
    return true
  }

  if (Array.isArray(value)) return value.length > 0

  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }

  if (typeof value === 'number') {
    return !Number.isNaN(value)
  }

  return true
}

function mergeOrderRecords(existing, incoming) {
  if (!existing) {
    return incoming ? { ...incoming } : existing
  }
  if (!incoming) {
    return { ...existing }
  }

  const merged = { ...existing }
  const keys = new Set([
    ...Object.keys(existing),
    ...Object.keys(incoming)
  ])

  // 🎯 关键字段：始终使用 incoming 的值（最新数据优先）
  const priorityKeys = [
    'status', 
    'refundStatus', 
    'refundCompletedAt', 
    'refundHistory',
    'completedAt',
    'wasOverdue',
    'overdueDays'
  ]

  keys.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) return

    const incomingValue = incoming[key]
    const currentValue = merged[key]

    // 🔥 优先级字段：直接覆盖（确保状态更新不被旧数据阻断）
    if (priorityKeys.includes(key) && incomingValue !== undefined) {
      merged[key] = incomingValue
      return
    }

    const incomingMeaningful = isMeaningfulForMerge(key, incomingValue)
    const currentMeaningful = isMeaningfulForMerge(key, currentValue)

    if (!currentMeaningful && incomingMeaningful) {
      merged[key] = incomingValue
    } else if (
      currentMeaningful &&
      incomingMeaningful &&
      typeof currentValue === 'object' &&
      currentValue !== null &&
      typeof incomingValue === 'object' &&
      incomingValue !== null &&
      !Array.isArray(currentValue) &&
      !Array.isArray(incomingValue)
    ) {
      merged[key] = { ...currentValue, ...incomingValue }
    }
  })

  return merged
}

/**
 * 快速获取订单池（从多个存储源合并）
 * @returns {Array} 合并后的订单数组
 */
function getAllOrders() {
  const legacyOrders = wx.getStorageSync('mock_orders') || []
  const orders = wx.getStorageSync('orders') || []
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  const completedOrders = wx.getStorageSync('completed_orders') || []  // 🎯 新增：已完成订单源
  
  // 合并订单（去重，以 id 为准）
  const orderMap = new Map()
  ;[...legacyOrders, ...orders, ...pendingOrders, ...completedOrders].forEach(order => {
    if (!order || !order.id) return

    if (!orderMap.has(order.id)) {
      orderMap.set(order.id, { ...order })
    } else {
      const merged = mergeOrderRecords(orderMap.get(order.id), order)
      orderMap.set(order.id, merged)
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

  const toKey = (value) => {
    if (value == null) return ''
    return String(value).trim()
  }
  
  // 2. 根据角色筛选
  if (role === 'customer') {
    // 用户端：只看自己的订单
    allOrders = allOrders.filter(order => toKey(order.buyerId) === toKey(userId))
  } else if (role === 'artist') {
    // 画师端：只看分配给自己的订单
    allOrders = allOrders.filter(order => toKey(order.artistId) === toKey(userId))
  } else if (role === 'service') {
    // 客服端：看分配给自己的订单 + 未分配的订单
    // 🎯 同时从两个数据源读取客服列表（兼容不同页面的保存逻辑）
    const customerServiceList = wx.getStorageSync('customer_service_list') || []
    const serviceList = wx.getStorageSync('service_list') || []
    const allServiceRecords = [...customerServiceList, ...serviceList]
    const myServiceKeys = new Set()

    allServiceRecords.forEach(service => {
      if (!service) return
      const serviceUserId = toKey(service.userId)
      const serviceId = toKey(service.id)

      if (
        serviceUserId === toKey(userId) ||
        serviceId === toKey(userId)
      ) {
        if (serviceUserId) myServiceKeys.add(serviceUserId)
        if (serviceId) myServiceKeys.add(serviceId)
      }
    })

    // 若没有在客服列表中匹配到，则至少保留当前 userId
    if (myServiceKeys.size === 0) {
      myServiceKeys.add(toKey(userId))
    }

    allOrders = allOrders.filter(order => {
      const serviceKey = toKey(order.serviceId)
      if (!serviceKey) return true // 未分配时所有客服可见
      return myServiceKeys.has(serviceKey)
    })
  }
  // admin 不筛选，看所有订单
  
  // 3. 标准化处理
  const serviceList = wx.getStorageSync('customer_service_list') || []
  return normalizeOrders(allOrders, { serviceList })
}

module.exports = {
  normalizeOrders,
  getAllOrders,
  prepareOrdersForPage,
  mergeOrderRecords
}
