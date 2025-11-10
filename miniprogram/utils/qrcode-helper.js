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
  
  // 1️⃣ 优先通过 serviceId 从客服列表动态读取最新二维码
  if (order.serviceId) {
    let serviceList = wx.getStorageSync('customer_service_list') || []
    if (!serviceList.length) {
      serviceList = wx.getStorageSync('service_list') || []
    }

    const service = serviceList.find(
      s => String(s.id) === String(order.serviceId) || String(s.userId) === String(order.serviceId)
    )

    if (service) {
      // 🎯 尝试多个可能的二维码字段名
      const qrImage = normalizeString(
        service.qrCode ||
        service.qrcode ||
        service.qrcodeUrl ||
        service.serviceQrcode ||
        service.serviceQrcodeUrl ||
        service.serviceQrCode ||
        service.wechatQrcode ||
        service.qrcodeNumber ||
        ''
      )

      if (qrImage) {
        return { value: qrImage, source: 'service_list' }
      }
    }
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

  // 3️⃣ 系统默认二维码
  const systemSettings = wx.getStorageSync('system_settings') || {}
  const defaultQr = normalizeString(
    order.systemServiceQrcode ||
    systemSettings.serviceQrcode ||
    systemSettings.serviceQrCode ||
    systemSettings.defaultServiceQr ||
    systemSettings.customerServiceQr
  )
  if (defaultQr) {
    return { value: defaultQr, source: 'system_settings' }
  }

  // 4️⃣ 遗留数据兜底
  const legacy = normalizeString(wx.getStorageSync('service_qrcode'))
  if (legacy) {
    return { value: legacy, source: 'legacy_storage' }
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

  const systemSettings = wx.getStorageSync('system_settings') || {}
  const systemQr = normalizeString(
    systemSettings.complaintQrcode ||
    systemSettings.complaintQrCode ||
    systemSettings.complaintQRCode ||
    systemSettings.afterSaleQrcode ||
    systemSettings.afterSaleQrCode ||
    systemSettings.afterSaleQRCode ||
    systemSettings.afterSalesQrcode ||
    systemSettings.afterSalesQr
  )
  if (systemQr) {
    return { value: systemQr, source: 'system_settings' }
  }

  const fallbackQr = normalizeString(
    wx.getStorageSync('complaint_qrcode') ||
    wx.getStorageSync('complaintQRCode') ||
    wx.getStorageSync('after_sale_qrcode') ||
    wx.getStorageSync('after_sale_QRcode') ||
    wx.getStorageSync('afterSaleQrCode')
  )
  if (fallbackQr) {
    return { value: fallbackQr, source: 'legacy_storage' }
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
