/**
 * 订单状态计算工具
 * 
 * 统一管理订单状态的映射、计算和格式化
 * ⚠️ 所有页面必须使用这里的函数，禁止硬编码状态文字
 */

// ==========================================
// 全局统一状态映射表（唯一出口）
// ==========================================
const STATUS_TEXT_MAP = {
  'unpaid': '待支付',
  'paid': '已支付',
  'created': '待处理',
  'inProgress': '制作中',        // ✅ 统一使用
  'processing': '制作中',         // ⚠️ 兼容旧数据
  'waitingConfirm': '待确认',
  'nearDeadline': '临近截稿',
  'overdue': '已拖稿',
  'completed': '已完成',
  'refunding': '退款中',
  'refunded': '已退款',
  'cancelled': '已取消'
}

/**
 * 获取状态的中文文本（统一出口）
 * @param {string} status - 状态代码
 * @returns {string} 中文文本
 */
function textOf(status) {
  return STATUS_TEXT_MAP[status] || status
}

/**
 * 获取状态的样式类名（统一出口）
 * @param {string} status - 状态代码
 * @returns {string} CSS 类名
 */
function classOf(status) {
  return `status-${status}`
}

/**
 * 默认头像（base64 SVG）
 */
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lrqI8L3RleHQ+PC9zdmc+'

/**
 * 将日期字符串转换为 iOS 兼容格式
 * @param {string} dateStr - 日期字符串
 * @returns {Date} Date 对象
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date()
  
  // 将 "yyyy-MM-dd HH:mm:ss" 或 "yyyy-MM-dd HH:mm" 转换为 "yyyy/MM/dd HH:mm:ss"
  // iOS 不支持 "yyyy-MM-dd HH:mm:ss" 格式，需要将 - 替换为 /
  const iosCompatibleDate = dateStr.replace(/-/g, '/')
  return new Date(iosCompatibleDate)
}

/**
 * 根据截稿时间计算订单状态
 * @param {Object} order - 订单对象
 * @returns {Object} 更新后的订单对象
 */
function calculateOrderStatus(order) {
  // 如果订单已完成，不需要重新计算
  if (order.status === 'completed') {
    return { ...order, statusText: '已完成' }
  }
  
  // 如果订单已标记为画师完成（等待客户确认），保持该状态
  if (order.status === 'waitingConfirm' || order.workCompleted) {
    return {
      ...order,
      status: 'waitingConfirm',
      statusText: '待客户确认',
      urgent: false
    }
  }
  
  const now = new Date()
  const deadline = parseDate(order.deadline)
  
  // 计算剩余时间（毫秒）
  const timeLeft = deadline.getTime() - now.getTime()
  
  // 计算剩余天数和小时
  const daysLeft = timeLeft / (24 * 60 * 60 * 1000)
  const hoursLeft = timeLeft / (60 * 60 * 1000)
  
  let status = 'inProgress'
  let statusText = '制作中'
  let urgent = false
  
  if (timeLeft < 0) {
    // 已经超过截稿时间
    status = 'overdue'
    statusText = '已拖稿'
    urgent = true
  } else if (hoursLeft <= 12) {
    // 剩余时间小于等于12小时（0.5天）
    status = 'nearDeadline'
    statusText = '临近截稿'
    urgent = true
  } else {
    // 正常制作中
    status = 'inProgress'
    statusText = '制作中'
    urgent = false
  }
  
  return {
    ...order,
    status,
    statusText,
    urgent
  }
}

/**
 * 批量计算订单状态
 * @param {Array} orders - 订单数组
 * @returns {Array} 更新后的订单数组
 */
function calculateOrdersStatus(orders) {
  return orders.map(order => calculateOrderStatus(order))
}

/**
 * 统计订单状态
 * @param {Array} orders - 订单数组
 * @returns {Object} 统计结果
 */
function countOrderStatus(orders) {
  const stats = {
    all: 0,
    inProgress: 0,
    nearDeadline: 0,
    overdue: 0,
    waitingConfirm: 0,
    completed: 0
  }
  
  orders.forEach(order => {
    stats.all++
    
    if (order.status === 'completed') {
      stats.completed++
    } else if (order.status === 'waitingConfirm') {
      stats.waitingConfirm++
    } else if (order.status === 'overdue') {
      stats.overdue++
    } else if (order.status === 'nearDeadline') {
      stats.nearDeadline++
    } else if (order.status === 'inProgress') {
      stats.inProgress++
    }
  })
  
  return stats
}

/**
 * 格式化截稿时间显示
 * @param {string} deadline - 截稿时间字符串
 * @returns {string} 格式化后的时间
 */
function formatDeadline(deadline) {
  const now = new Date()
  const deadlineDate = parseDate(deadline)
  const timeLeft = deadlineDate.getTime() - now.getTime()
  
  if (timeLeft < 0) {
    // 已拖稿
    const daysOverdue = Math.floor(Math.abs(timeLeft) / (24 * 60 * 60 * 1000))
    if (daysOverdue === 0) {
      const hoursOverdue = Math.floor(Math.abs(timeLeft) / (60 * 60 * 1000))
      return `已拖稿 ${hoursOverdue} 小时`
    }
    return `已拖稿 ${daysOverdue} 天`
  } else {
    // 未拖稿
    const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000))
    const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    
    if (daysLeft === 0) {
      return `剩余 ${hoursLeft} 小时`
    } else if (daysLeft === 1) {
      return `剩余 1 天 ${hoursLeft} 小时`
    } else {
      return `剩余 ${daysLeft} 天`
    }
  }
}

/**
 * 客服信息兜底处理（四端统一逻辑）
 * @param {Object} order - 订单对象
 * @param {Array} serviceList - 客服列表（可选，默认从本地存储读取）
 * @returns {Object} 包含完整客服信息的订单对象
 */
function withServiceFallback(order, serviceList) {
  const out = { ...order }
  
  // 如果没有传入客服列表，从本地存储读取
  if (!serviceList) {
    try {
      serviceList = wx.getStorageSync('customer_service_list') || []
    } catch (e) {
      serviceList = []
    }
  }
  
  // 优先级：① 订单中的serviceName/serviceAvatar → ② 通过serviceId匹配客服列表 → ③ 默认值
  
  // 1️⃣ 如果订单已有客服名称和头像，直接使用
  if (out.serviceName && out.serviceName !== '待分配' && out.serviceAvatar) {
    // 确保头像不是旧的错误路径
    if (out.serviceAvatar === '/assets/default-avatar.png') {
      out.serviceAvatar = DEFAULT_AVATAR
    }
    return out
  }
  
  // 2️⃣ 通过serviceId从客服列表查找
  if (out.serviceId && serviceList.length > 0) {
    const matched = serviceList.find(s => s.userId === out.serviceId || s.id === out.serviceId)
    if (matched) {
      out.serviceName = matched.name || matched.nickName || '客服'
      out.serviceAvatar = matched.avatar || matched.avatarUrl || DEFAULT_AVATAR
      return out
    }
  }
  
  // 3️⃣ 兜底：使用默认值
  if (!out.serviceName || out.serviceName === '待分配') {
    out.serviceName = '待分配'
  }
  out.serviceAvatar = DEFAULT_AVATAR
  
  return out
}

/**
 * 批量处理订单的客服信息
 * @param {Array} orders - 订单数组
 * @param {Array} serviceList - 客服列表（可选）
 * @returns {Array} 处理后的订单数组
 */
function withServicesFallback(orders, serviceList) {
  if (!Array.isArray(orders)) return []
  return orders.map(order => withServiceFallback(order, serviceList))
}

module.exports = {
  // 状态计算
  calculateOrderStatus,
  calculateOrdersStatus,
  countOrderStatus,
  formatDeadline,
  
  // 状态映射（新增）
  textOf,
  classOf,
  STATUS_TEXT_MAP,
  
  // 头像兜底（新增）
  withServiceFallback,
  withServicesFallback,
  DEFAULT_AVATAR
}

