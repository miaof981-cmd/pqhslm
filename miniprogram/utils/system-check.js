// miniprogram/utils/system-check.js
//
// 下单流程体检工具：
// 汇总当前存储中的关键数据（客服、画师、商品），检测是否存在会阻断或削弱下单体验的问题。
// 返回 issue 列表供管理后台展示，并附带摘要数据，便于后续扩展图表或日志。

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeString(value) {
  if (value == null) return ''
  if (typeof value !== 'string') value = String(value)
  const trimmed = value.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return ''
  return trimmed
}

function isValidImage(url) {
  const normalized = normalizeString(url)
  if (!normalized) return false
  const lower = normalized.toLowerCase()
  if (lower.startsWith('http://tmp/')) return false
  if (lower.startsWith('/assets/')) return false
  if (lower === 'default-avatar' || lower.endsWith('default-avatar.png')) return false
  return true
}

function pickServiceList() {
  // ✅ 已废弃：客服列表应从云端service_qrcodes表读取
  const primary = []
  if (primary.length > 0) return primary
  return []
}

function runOrderFlowDiagnostics(options = {}) {
  const issues = []
  const summary = {
    services: { total: 0, active: 0, missingAvatar: 0 },
    artists: { approved: 0, missingProfile: 0 },
    products: { total: 0, missingArtistInfo: 0, missingCover: 0, orphanArtists: 0 }
  }

  // === 1️⃣ 客服配置检查 ===
  const serviceList = pickServiceList()
  const activeServices = serviceList.filter(service => service && service.isActive !== false)
  const servicesWithAvatarIssues = serviceList.filter(service => {
    const avatar = service && (service.avatar || service.avatarUrl)
    return !isValidImage(avatar)
  })

  summary.services.total = serviceList.length
  summary.services.active = activeServices.length
  summary.services.missingAvatar = servicesWithAvatarIssues.length

  if (serviceList.length === 0) {
    issues.push({
      id: 'orderflow.service.missing',
      level: 'error',
      title: '未配置客服账号',
      message: '当前没有客服可用于接单，买家下单后无法自动分配客服。请前往「客服工作台」添加并启用客服账号。'
    })
  } else if (activeServices.length === 0) {
    issues.push({
      id: 'orderflow.service.inactive',
      level: 'warning',
      title: '客服全部离线',
      message: '客服列表中暂无启用中的客服，买家下单后将处于待分配状态。建议至少启用 1 位客服。'
    })
  }

  if (servicesWithAvatarIssues.length > 0) {
    issues.push({
      id: 'orderflow.service.avatar',
      level: 'warning',
      title: '客服头像存在占位图',
      message: `检测到 ${servicesWithAvatarIssues.length} 位客服头像为临时路径或占位图，建议在「客服二维码管理」中更新为正式头像，避免买家看到默认图。`
    })
  }

  // === 2️⃣ 画师与商品配置检查 ===
  const applications = normalizeArray(wx.getStorageSync('artist_applications'))
  const approvedArtists = applications.filter(app => (app && app.status === 'approved'))
  summary.artists.approved = approvedArtists.length

  const products = normalizeArray(wx.getStorageSync('mock_products'))
  
  // 🎯 优化：如果没有已审核画师，但已有商品，说明画师权限正常（测试环境）
  if (approvedArtists.length === 0 && products.length === 0) {
    issues.push({
      id: 'orderflow.artist.none',
      level: 'error',
      title: '暂无已审核画师和商品',
      message: '当前没有已通过审核的画师，且没有可售商品。买家下单时将无法选择商品。请先添加画师并创建商品。'
    })
  } else if (approvedArtists.length === 0 && products.length > 0) {
    issues.push({
      id: 'orderflow.artist.approval-skipped',
      level: 'warning',
      title: '画师未正式审核',
      message: '检测到已有商品，但画师申请列表中无已通过记录。若为测试环境，可忽略此提示；正式运营时建议完成画师审核流程。'
    })
  }
  summary.products.total = products.length

  if (products.length === 0) {
    issues.push({
      id: 'orderflow.product.empty',
      level: 'error',
      title: '暂无可售商品',
      message: '商品列表为空，买家在橱窗中将无法选择商品。请前往「商品管理」创建至少一件商品。'
    })
  }

  let orphanArtistCount = 0
  const artistIdSet = new Set(approvedArtists.map(app => normalizeString(app.userId)))

  const productsMissingArtistInfo = products.filter(product => {
    if (!product) return true
    const artistId = normalizeString(product.artistId)
    const artistName = normalizeString(product.artistName)
    const artistAvatar = product && (product.artistAvatar || product.artistAvatarUrl)
    const validAvatar = isValidImage(artistAvatar)

    if (artistId && artistIdSet.size > 0 && !artistIdSet.has(artistId)) {
      orphanArtistCount += 1
    }

    if (!artistId || !artistName || !validAvatar) {
      return true
    }
    return false
  })

  summary.products.missingArtistInfo = productsMissingArtistInfo.length
  summary.products.orphanArtists = orphanArtistCount

  const productsMissingCover = products.filter(product => {
    if (!product) return true
    if (!Array.isArray(product.images) || product.images.length === 0) return true
    const primaryImage = product.images[0]
    return !isValidImage(primaryImage)
  })

  summary.products.missingCover = productsMissingCover.length

  if (productsMissingArtistInfo.length > 0) {
    issues.push({
      id: 'orderflow.product.artist',
      level: 'error',
      title: '商品缺少画师信息',
      message: `共有 ${productsMissingArtistInfo.length} 件商品未绑定完整的画师资料（ID/昵称/头像），买家下单时会被拦截。请打开商品编辑页面补齐画师信息。`
    })
  }

  if (orphanArtistCount > 0) {
    issues.push({
      id: 'orderflow.product.orphanArtist',
      level: 'warning',
      title: '商品关联了未通过审核的画师',
      message: `共有 ${orphanArtistCount} 件商品绑定的画师未在审核列表中通过，建议重新指派或尽快完成审核。`
    })
  }

  if (productsMissingCover.length > 0) {
    issues.push({
      id: 'orderflow.product.cover',
      level: 'warning',
      title: '商品缺少有效封面图',
      message: `检测到 ${productsMissingCover.length} 件商品的首图为临时路径或为空，买家可能会看到灰色占位图。建议补充正式图。`
    })
  }

  // === 3️⃣ 输出诊断日志（便于开发扩展）===
  if (options.verbose) {
    console.log('[OrderFlowDiagnostics] summary =>', summary)
    if (issues.length > 0) {
      console.warn('[OrderFlowDiagnostics] issues =>', issues)
    } else {
      console.log('[OrderFlowDiagnostics] 暂无阻断问题')
    }
  }

  return { issues, summary }
}

module.exports = {
  runOrderFlowDiagnostics
}
