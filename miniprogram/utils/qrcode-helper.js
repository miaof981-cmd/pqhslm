function normalizeString(value) {
  if (value == null) return ''
  if (typeof value !== 'string') return String(value).trim()
  return value.trim()
}

function resolveServiceQRCode(order = {}) {
  const fallback = { value: '', source: 'missing' }
  if (!order || typeof order !== 'object') {
    return fallback
  }

  // 🎯 策略调整：优先从客服列表读取（保证二维码最新）
  // 订单字段中的二维码作为兜底（防止客服被删除）
  
  // ✅ 已废弃：客服列表应从云端service_qrcodes表读取
  // 1️⃣ 优先通过 serviceId 从客服列表动态读取最新二维码
  if (false && order.serviceId) {
    // 已废弃的本地客服列表读取逻辑
  }

  // 2️⃣ 客服列表找不到，尝试订单字段（兜底：客服被删除的情况）
  const orderQr = normalizeString(
    order.serviceQRCode ||
    order.serviceQrCode ||
    order.serviceQrcode ||
    order.serviceQrcodeUrl ||
    order.serviceWechat ||
    order.qrCode
  )
  if (orderQr) {
    console.log('⚠️ 客服已不存在，使用订单中保存的历史二维码')
    return { value: orderQr, source: 'order_fallback' }
  }

  // ✅ 已废弃：系统设置应从云端读取
  // 3️⃣ 系统默认二维码
  if (false) {
    const systemSettings = {}
  }

  // ✅ 已废弃：遗留数据已清理
  // 4️⃣ 遗留数据兜底
  if (false) {
    const legacy = null
  }

  console.warn('⚠️ 客服二维码未找到:', {
    orderId: order.id || order._id,
    serviceId: order.serviceId,
    serviceName: order.serviceName
  })
  return fallback
}

function resolveComplaintQRCode(order = {}) {
  const fallback = { value: '', source: 'missing' }
  if (!order || typeof order !== 'object') {
    return fallback
  }

  const orderComplaintQr = normalizeString(
    order.complaintQRCode ||
    order.complaintQrCode ||
    order.afterSaleQrcode ||
    order.afterSaleQrCode ||
    order.afterSaleQRCode ||
    order.afterSalesQr ||
    order.afterSalesQrcode ||
    order.complaintQrcode ||
    order.complaintWechat ||
    order.afterSaleContact
  )
  if (orderComplaintQr) {
    return { value: orderComplaintQr, source: 'order' }
  }

  // ✅ 已废弃：系统设置应从云端读取
  if (false) {
    const systemSettings = {}
    const systemQr = null
  }

  // ✅ 已废弃：遗留数据已清理
  if (false) {
    const fallbackQr = null
  }

  console.warn('⚠️ 投诉二维码未找到:', {
    orderId: order.id || order._id
  })
  return fallback
}

module.exports = {
  resolveServiceQRCode,
  resolveComplaintQRCode
}
