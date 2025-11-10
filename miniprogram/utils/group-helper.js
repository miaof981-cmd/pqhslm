function normalizeValue(value) {
  if (value == null) return ''
  if (value instanceof Date) return value
  return String(value).trim()
}

function tryParseDate(candidate, context = {}) {
  if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
    return candidate
  }
  if (typeof candidate === 'number') {
    const numericDate = new Date(candidate)
    return Number.isNaN(numericDate.getTime()) ? null : numericDate
  }
  if (typeof candidate !== 'string') {
    return null
  }

  let normalized = candidate.trim()
  if (!normalized || normalized.toLowerCase().includes('invalid')) {
    return null
  }

  normalized = normalized
    .replace(/年|\.|\/|月/g, '-')
    .replace(/日|号/g, '')
    .replace(/T/g, ' ')
    .replace(/：/g, ':')
    .replace(/\s+/g, ' ')
    .replace(/--+/g, '-')
    .trim()

  if (/^\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?$/.test(normalized)) {
    const base = context.createTime
      ? tryParseDate(context.createTime)
      : new Date()
    const year = base instanceof Date ? base.getFullYear() : new Date().getFullYear()
    normalized = `${year}-${normalized}`
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    normalized += ' 00:00'
  }

  const iosFriendly = normalized.replace(/-/g, '/')
  const directDate = new Date(iosFriendly)
  if (!Number.isNaN(directDate.getTime())) {
    return directDate
  }

  const timestamp = Date.parse(iosFriendly)
  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp)
  }

  return null
}

function resolveDeadlineDate(source = {}, options = {}) {
  const context = {
    createTime: source.createTime || source.orderTime || options.createTime,
    now: options.now
  }

  const candidates = [
    options.deadline,
    source.deadline,
    source.deliveryDeadline,
    source.deadlineText,
    source.deliveryTime,
    source.deliveryDate,
    source.expectedDelivery,
    source.dueDate
  ].filter(candidate => candidate !== undefined && candidate !== null && candidate !== '')

  for (const candidate of candidates) {
    const parsed = tryParseDate(candidate, context)
    if (parsed) {
      return parsed
    }
  }

  if (typeof source.deadlineTimestamp === 'number') {
    const parsed = tryParseDate(source.deadlineTimestamp)
    if (parsed) return parsed
  }
  if (typeof options.deadlineTimestamp === 'number') {
    const parsed = tryParseDate(options.deadlineTimestamp)
    if (parsed) return parsed
  }

  const deliveryDays = options.deliveryDays ?? source.deliveryDays
  if (deliveryDays != null && deliveryDays !== '') {
    const base = tryParseDate(context.createTime, context) || new Date()
    const milli = Number(deliveryDays) * 24 * 60 * 60 * 1000
    if (!Number.isNaN(milli) && base instanceof Date) {
      return new Date(base.getTime() + milli)
    }
  }

  return null
}

function formatDeadlineText(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

function buildGroupName(order = {}, options = {}) {
  const orderId = normalizeValue(
    options.orderId ||
    order.id ||
    order.fullOrderNo ||
    order.orderNumber ||
    order.orderNo ||
    order._id
  )
  const last4Digits = orderId ? orderId.toString().slice(-4).padStart(4, '0') : '0000'

  const productNameRaw = normalizeValue(order.productName || options.productName || '商品')
  const productName = productNameRaw || '商品'

  const deadlineDate = resolveDeadlineDate(order, {
    createTime: order.createTime || order.orderTime,
    deliveryDays: order.deliveryDays,
    deadline: options.deadline
  })
  const deadlineText = formatDeadlineText(deadlineDate)
  const fallbackDeadlineText = options.fallbackDeadlineText || '日期待定'

  return {
    groupName: `【联盟${last4Digits}】${deadlineText || fallbackDeadlineText}出${productName}`,
    deadlineText,
    usedFallback: !deadlineText,
    last4Digits
  }
}

module.exports = {
  buildGroupName,
  formatDeadlineText,
  resolveDeadlineDate
}
