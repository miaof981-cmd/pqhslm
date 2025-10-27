/**
 * 订单状态计算工具
 */

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
  const deadline = new Date(order.deadline)
  
  // 计算剩余时间（毫秒）
  const timeLeft = deadline.getTime() - now.getTime()
  
  // 计算剩余天数和小时
  const daysLeft = timeLeft / (24 * 60 * 60 * 1000)
  const hoursLeft = timeLeft / (60 * 60 * 1000)
  
  let status = 'inProgress'
  let statusText = '进行中'
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
    // 正常进行中
    status = 'inProgress'
    statusText = '进行中'
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
  const deadlineDate = new Date(deadline)
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

module.exports = {
  calculateOrderStatus,
  calculateOrdersStatus,
  countOrderStatus,
  formatDeadline
}

