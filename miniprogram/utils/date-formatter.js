/**
 * 时间格式化工具
 * 统一处理前端展示、后端交互、iOS兼容
 */

// 填充0
function pad(num) {
  return num < 10 ? `0${num}` : `${num}`
}

/**
 * iOS兼容的日期解析
 * "2025-11-08 10:28:30" → Date对象
 */
function parseDate(dateStr) {
  if (!dateStr) return null
  
  // 如果已经是Date对象，直接返回
  if (dateStr instanceof Date) {
    return dateStr
  }
  
  // iOS兼容：替换 - 为 /
  const iosCompatible = String(dateStr).replace(/-/g, '/')
  const date = new Date(iosCompatible)
  
  return isNaN(date.getTime()) ? null : date
}

/**
 * Date对象 → 展示格式
 * Date → "2025-11-08 10:28:30"
 */
function formatDateToDisplay(date) {
  if (!date) return ''
  
  const d = parseDate(date)
  if (!d) return ''
  
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * Date对象 → 短格式（月-日 时:分）
 * Date → "11-08 10:28"
 */
function formatDateToShort(date) {
  if (!date) return ''
  
  const d = parseDate(date)
  if (!d) return ''
  
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 相对时间
 * Date → "3小时前"
 */
function formatRelativeTime(date) {
  if (!date) return ''
  
  const d = parseDate(date)
  if (!d) return ''
  
  const now = Date.now()
  const target = d.getTime()
  const diff = now - target
  
  if (diff < 0) return '未来'
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`
  
  return formatDateToDisplay(date)
}

/**
 * 计算剩余时间
 * deadline → "剩余2天3小时"
 */
function calculateTimeLeft(deadline) {
  if (!deadline) return ''
  
  const d = parseDate(deadline)
  if (!d) return ''
  
  const now = Date.now()
  const target = d.getTime()
  const diff = target - now
  
  if (diff < 0) return '已截稿'
  
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  
  if (days > 0) {
    return `剩余${days}天${hours}小时`
  }
  
  if (hours > 0) {
    return `剩余${hours}小时`
  }
  
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `剩余${minutes}分钟`
}

/**
 * 计算距今天数
 * date → 正数表示未来，负数表示过去
 */
function getDaysDiff(date) {
  if (!date) return 0
  
  const d = parseDate(date)
  if (!d) return 0
  
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

/**
 * 生成订单号（时间戳格式）
 * → "202511081028301234"
 */
function generateOrderId() {
  const now = new Date()
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${Math.floor(Math.random() * 10000)}`
}

module.exports = {
  parseDate,
  formatDateToDisplay,
  formatDateToShort,
  formatRelativeTime,
  calculateTimeLeft,
  getDaysDiff,
  generateOrderId,
  pad
}

