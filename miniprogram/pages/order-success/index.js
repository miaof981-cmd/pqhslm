const orderHelper = require('../../utils/order-helper.js')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')
const categoryService = require('../../utils/category-service.js')
const productSales = require('../../utils/product-sales.js')
const { resolveServiceQRCode } = require('../../utils/qrcode-helper.js')  // 🎯 新增
const cloudAPI = require('../../utils/cloud-api.js')
const envConfig = require('../../config/env.js')

Page({
  data: {
    orderInfo: null,
    productInfo: null,
    serviceQR: null,
    serviceInfo: null,
    orderItems: [],
    countdown: 3 // 倒计时秒数
  },

  async onLoad(options) {
    console.log('========================================')
    console.log('📦 开始创建订单')
    console.log('========================================')
    
    // === 1️⃣ 从商品表获取画师信息 ===
    const products = wx.getStorageSync('mock_products') || []
    let product = null
    
    if (options.productId) {
      product = products.find(p => String(p.id) === String(options.productId))
    }
    if (!product && options.productName) {
      product = products.find(p => p.name === decodeURIComponent(options.productName))
    }
    
    if (!product) {
      console.warn('⚠️ 商品未在本地商品池中找到，尝试使用页面参数回填。', {
        productId: options.productId,
        productName: options.productName
      })
      product = {
        id: options.productId || '',
        name: decodeURIComponent(options.productName || '商品'),
        deliveryDays: parseInt(options.deliveryDays, 10) || 7,
        images: []
      }
    }
    
    const decodeIfNeeded = (value) => {
      if (value == null) return ''
      const trimmed = String(value).trim()
      if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return ''
      try {
        return decodeURIComponent(trimmed)
      } catch (err) {
        return trimmed
      }
    }
    
    // 🎯 画师信息：优先本地商品，其次页面参数
    let artistId = product.artistId || decodeIfNeeded(options.artistId)
    let artistName = product.artistName || decodeIfNeeded(options.artistName)
    let artistAvatar = product.artistAvatar || decodeIfNeeded(options.artistAvatar)
    
    const artistResolution = this.fillArtistInfo(
      { artistId, artistName, artistAvatar },
      { product, options }
    )
    artistId = artistResolution.artistInfo.artistId
    artistName = artistResolution.artistInfo.artistName
    artistAvatar = artistResolution.artistInfo.artistAvatar
    
    if (artistResolution.fallbackLogs && artistResolution.fallbackLogs.length > 0) {
      artistResolution.fallbackLogs.forEach(msg => console.log('🔄 画师信息补全:', msg))
    }
    
    if (artistResolution.missingFields && artistResolution.missingFields.length > 0) {
      const fieldLabelMap = {
        artistId: '画师ID',
        artistName: '画师名称',
        artistAvatar: '画师头像'
      }
      const missingText = artistResolution.missingFields.map(key => fieldLabelMap[key] || key).join('、')
      const extraHint = artistResolution.invalidFields && artistResolution.invalidFields.includes('artistAvatar')
        ? ' 当前画师头像为临时路径，请在画师资料或商品信息中上传正式头像，或执行初始化脚本补齐数据。'
        : ''
      console.error('❌ 商品缺少画师信息:', { artistId, artistName, artistAvatar: artistAvatar ? '有' : '无' })
      wx.showModal({
        title: '商品信息不完整',
        content: `缺少以下画师字段：${missingText}。${extraHint}`,
        showCancel: false,
        complete: () => wx.navigateBack()
      })
      return
    }
    
    if (artistAvatar && this.isInvalidImagePath(artistAvatar)) {
      console.error('❌ 画师头像路径无效:', artistAvatar)
      wx.showModal({
        title: '商品信息错误',
        content: '画师头像路径无效，请联系管理员更新为正式图片链接',
        showCancel: false,
        complete: () => wx.navigateBack()
      })
      return
    }
    
    console.log('✅ 画师信息验证通过:', { artistId, artistName, artistAvatar: artistAvatar.substring(0, 50) + '...' })
    
    // === 2️⃣ 分配客服（异步，确保头像转换完成）===
    let service = null
    try {
      service = await this.assignService()
    } catch (err) {
      console.error('❌ 客服分配异常:', err)
      service = {
        serviceId: '',
        serviceName: '待分配客服',
        serviceAvatar: '',
        serviceQrcodeUrl: '',
        serviceQrcodeNumber: null,
        isPlaceholder: true
      }
    }
    
    const isPlaceholderService = service?.isPlaceholder === true
    
    if (!isPlaceholderService) {
      // ⚠️ 验证客服分配
      if (!service || !service.serviceId || !service.serviceName || !service.serviceAvatar) {
        console.error('❌ 客服分配失败:', service)
        wx.showModal({
          title: '系统错误',
          content: '客服分配失败，请稍后再试',
          showCancel: false,
          complete: () => wx.navigateBack()
        })
        return
      }
      
      // ⚠️ 禁止临时路径
      if (service.serviceAvatar.startsWith('http://tmp/') || service.serviceAvatar.startsWith('/assets/')) {
        console.error('❌ 客服头像是临时路径或本地路径:', service.serviceAvatar)
        wx.showModal({
          title: '系统错误',
          content: '客服头像路径无效，请联系管理员',
          showCancel: false,
          complete: () => wx.navigateBack()
        })
        return
      }
    }
    
    console.log('✅ 客服分配结果:', { 
      serviceId: service.serviceId || '',
      serviceName: service.serviceName,
      serviceAvatar: service.serviceAvatar ? service.serviceAvatar.substring(0, 50) + '...' : '(空)',
      isPlaceholder: isPlaceholderService
    })
    
    const serviceId = service.serviceId || ''
    const serviceName = service.serviceName || '待分配客服'
    const serviceAvatar = service.serviceAvatar || ''
    
    // --- 控制台打印检查 ---
    console.log("📦 下单前检查:", { 
      product: product ? { id: product.id, name: product.name, artistName: product.artistName } : null,
      artistName, 
      serviceName 
    })
    
    // 从URL参数获取订单信息（需要解码）
    const decodedProductImage = decodeURIComponent(options.productImage || '')

    const orderInfo = {
      orderNo: this.generateOrderNo(),
      productId: options.productId || '',
      productName: decodeURIComponent(options.productName || '商品'),
      productImage: decodedProductImage,
      originalProductImage: decodedProductImage,
      spec1: decodeURIComponent(options.spec1 || ''),
      spec2: decodeURIComponent(options.spec2 || ''),
      quantity: parseInt(options.quantity) || 1,
      price: parseFloat(options.price) || 0,
      totalAmount: parseFloat(options.totalAmount) || 0,
      deliveryDays: parseInt(options.deliveryDays) || 7,
      
      // ✅ 画师完整信息（从商品表/当前用户获取）
      artistId: artistId,
      artistName: artistName,
      artistAvatar: artistAvatar,
      
      createTime: this.formatDateTime(new Date())
    }
    
    // 计算截稿时间
    orderInfo.deadline = this.calculateDeadline(orderInfo.createTime, orderInfo.deliveryDays)
    
    console.log('✅ 订单信息格式化完成')
    console.log('- 画师:', orderInfo.artistName)
    console.log('- 下单时间:', orderInfo.createTime)
    console.log('- 出稿天数:', orderInfo.deliveryDays)
    console.log('- 截稿时间:', orderInfo.deadline)

    console.log('订单信息:', orderInfo)
    console.log('原始参数:', options)
    
    let orderItems = []
    const cachedOrderItems = wx.getStorageSync('order_success_items')
    if (Array.isArray(cachedOrderItems) && cachedOrderItems.length > 0) {
      orderItems = cachedOrderItems
        .map(item => this.normalizeOrderItem(item, orderInfo.productImage))
        .filter(Boolean)
      wx.removeStorageSync('order_success_items')
    }
    
    if (orderItems.length === 0) {
      orderItems = [
        this.normalizeOrderItem({
          productId: orderInfo.productId,
          productName: orderInfo.productName,
          productImage: orderInfo.productImage,
          spec1: orderInfo.spec1,
          spec2: orderInfo.spec2,
          quantity: orderInfo.quantity,
          unitPrice: orderInfo.price || orderInfo.totalAmount,
          totalPrice: orderInfo.totalAmount,
          deliveryDays: orderInfo.deliveryDays,
          categoryId: product.category || '',
          categoryName: product.categoryName || ''
        }, orderInfo.productImage)
      ].filter(Boolean)
    }
    
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmountFromItems = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    orderInfo.items = orderItems
    orderInfo.quantity = totalQuantity
    orderInfo.totalAmount = Number(totalAmountFromItems.toFixed(2))
    orderInfo.totalAmountDisplay = orderInfo.totalAmount.toFixed(2)
    orderInfo.productImage = ensureRenderableImage(orderInfo.productImage, {
      namespace: 'order-success-cover',
      fallback: DEFAULT_PLACEHOLDER
    })
    if (!orderInfo.productImage && orderItems[0]) {
      orderInfo.productImage = orderItems[0].productImage
    }
    orderInfo.serviceStatus = isPlaceholderService ? 'pending' : 'assigned'
    orderInfo.serviceAssigned = !isPlaceholderService
    orderInfo.needsService = isPlaceholderService
    
    // 构建客服信息对象
    const serviceInfo = {
      serviceId: serviceId,
      serviceName: serviceName,
      serviceAvatar: serviceAvatar,
      serviceQrcodeUrl: service?.serviceQrcodeUrl || service?.qrcodeUrl || '',
      serviceQrcodeNumber: service?.serviceQrcodeNumber || service?.qrcodeNumber || null,
      isPlaceholder: isPlaceholderService
    }
    
    // 🎯 动态读取客服二维码（不依赖订单中保存的空值）
    let serviceQR = null
    if (!isPlaceholderService && serviceId) {
      const qrResult = resolveServiceQRCode({
        serviceId: serviceId,
        serviceName: serviceName,
        serviceQRCode: serviceInfo.serviceQrcodeUrl || ''
      })
      
      if (qrResult.value) {
        serviceQR = { 
          imageUrl: qrResult.value, 
          number: serviceInfo.serviceQrcodeNumber 
        }
        console.log('✅ 客服二维码已动态读取，来源:', qrResult.source)
      } else {
        console.warn('⚠️ 客服二维码未找到，来源:', qrResult.source)
      }
    }

    console.log('📋 订单成功页面数据:')
    console.log('- 客服ID:', serviceInfo.serviceId)
    console.log('- 客服名:', serviceInfo.serviceName)
    console.log('- 客服头像:', serviceInfo.serviceAvatar ? '有' : '无')
    console.log('- 客服二维码:', serviceQR ? '有 (' + (serviceQR.imageUrl ? '图片' : '空') + ')' : '无')

    // 记录客户端生成的订单号，便于和云端对齐
    orderInfo.clientOrderNo = orderInfo.orderNo

    this.setData({
      orderInfo: orderInfo,
      orderItems: orderItems,
      serviceInfo: serviceInfo,  // 保存客服信息
      serviceQR: serviceQR,
      servicePending: isPlaceholderService
    })

    // ✅ 统一持久化逻辑：优先写入云端，失败后保留本地兜底
    await this.persistOrder(orderInfo, serviceInfo, orderItems)

    // 禁止用户返回（可选）
    // wx.hideHomeButton() // 隐藏返回首页按钮
  },

  normalizeOrderItem(item, fallbackImage = '') {
    if (!item) return null
    const quantity = Number(item.quantity) || 1
    const rawUnitPrice = item.unitPrice != null ? item.unitPrice : item.price
    const unitPrice = parseFloat(rawUnitPrice) || 0
    const totalPrice = item.totalPrice != null ? parseFloat(item.totalPrice) : unitPrice * quantity
    const categoryId = item.categoryId || item.category || ''
    const categoryName = item.categoryName || categoryService.getCategoryNameById(categoryId) || ''
    const productImage = ensureRenderableImage(item.productImage || fallbackImage, {
      namespace: 'order-success-item',
      fallback: DEFAULT_PLACEHOLDER
    })
    const specParts = []
    if (item.spec1) specParts.push(item.spec1)
    if (item.spec2) specParts.push(item.spec2)

    return {
      productId: item.productId || item.id || '',
      productName: item.productName || item.name || '商品',
      productImage,
      spec1: item.spec1 || '',
      spec2: item.spec2 || '',
      specText: specParts.join(' / '),
      quantity,
      unitPrice: Number(unitPrice.toFixed(2)),
      totalPrice: Number(totalPrice.toFixed(2)),
      deliveryDays: item.deliveryDays || 0,
      categoryId,
      categoryName,
      tags: item.tags || []
    }
  },
  
  // 自动分配客服（异步，确保头像转换完成）
  async assignService() {
    console.log('📞 开始分配客服...')
    
    // 获取所有客服
    let serviceList = wx.getStorageSync('customer_service_list') || []
    
    // 🎯 如果客服列表为空，自动创建默认客服
    if (serviceList.length === 0) {
      console.log('⚠️ customer_service_list 为空，尝试从 service_list 加载')
      
      // 🎯 尝试从 service_list 加载（另一个数据源）
      const backupServiceList = wx.getStorageSync('service_list') || []
      if (backupServiceList.length > 0) {
        serviceList = backupServiceList
        wx.setStorageSync('customer_service_list', serviceList)
        console.log('✅ 从 service_list 恢复客服列表')
      }
    }
    
    if (serviceList.length === 0) {
      console.warn('⚠️ 当前未配置任何客服账号，将以待分配状态继续下单')
      return {
        serviceId: '',
        serviceName: '待分配客服',
        serviceAvatar: '',
        serviceQrcodeUrl: '',
        serviceQrcodeNumber: null,
        isPlaceholder: true
      }
    }
    
    // 🎯 确保至少有一个客服在线
    const activeServices = serviceList.filter(s => s.isActive)
    if (activeServices.length === 0) {
      console.log('⚠️ 所有客服离线，强制第一个客服上线')
      serviceList[0].isActive = true
      wx.setStorageSync('customer_service_list', serviceList)
      wx.setStorageSync('service_list', serviceList)
    }
    
    // 重新获取在线客服
    const finalActiveServices = serviceList.filter(s => s.isActive)
    
    // Round-robin 分配（轮询）
    const lastAssignedIndex = wx.getStorageSync('lastAssignedServiceIndex') || 0
    const nextIndex = (lastAssignedIndex + 1) % finalActiveServices.length
    wx.setStorageSync('lastAssignedServiceIndex', nextIndex)
    
    let assignedService = finalActiveServices[nextIndex]

    if (!assignedService) {
      console.warn('⚠️ 未找到可用客服，将使用占位信息')
      return {
        serviceId: '',
        serviceName: '待分配客服',
        serviceAvatar: '',
        serviceQrcodeUrl: '',
        serviceQrcodeNumber: null,
        isPlaceholder: true
      }
    }
    
    console.log('📞 客服分配结果:')
    console.log('- 在线客服数:', finalActiveServices.length)
    console.log('- 分配索引:', nextIndex)
    console.log('- 客服ID:', assignedService.userId || assignedService.id)
    console.log('- 客服名:', assignedService.name || assignedService.nickName)
    
    // 🎯 确保头像是永久路径
    let serviceAvatar = assignedService.avatar || assignedService.avatarUrl || ''
    
    if (serviceAvatar.startsWith('http://tmp/')) {
      console.log('⚠️ 检测到临时头像，正在转换...')
      serviceAvatar = await this.convertTempAvatar(serviceAvatar)
      
      // 更新客服列表中的头像
      const serviceIndex = serviceList.findIndex(s => 
        (s.userId || s.id) === (assignedService.userId || assignedService.id)
      )
      if (serviceIndex !== -1) {
        serviceList[serviceIndex].avatar = serviceAvatar
        serviceList[serviceIndex].avatarUrl = serviceAvatar
        wx.setStorageSync('customer_service_list', serviceList)
        wx.setStorageSync('service_list', serviceList)
        console.log('✅ 客服头像已更新为永久路径')
      }
    }
    
    // 🎯 重要：订单只保存 serviceId，不保存二维码 URL
    // 这样订单详情页每次都会从客服列表动态读取最新二维码
    // 即使客服更换二维码，历史订单也能显示最新的
    console.log('✅ 客服分配完成，订单将保存 serviceId，二维码将动态读取')
    
    return {
      serviceId: assignedService.userId || assignedService.id,
      serviceName: assignedService.name || assignedService.nickName,
      serviceAvatar: serviceAvatar,
      serviceQrcodeUrl: '',  // ⚠️ 故意留空，强制动态读取
      serviceQrcodeNumber: assignedService.qrcodeNumber,
      isPlaceholder: false
    }
  },
  
  isInvalidImagePath(path) {
    if (path == null) return true
    if (typeof path !== 'string') {
      path = String(path)
    }
    const trimmed = path.trim()
    if (!trimmed) return true
    const lower = trimmed.toLowerCase()
    if (lower === 'undefined' || lower === 'null') return true
    return trimmed.startsWith('http://tmp/') || trimmed.startsWith('/assets/')
  },

  fillArtistInfo(initialInfo = {}, context = {}) {
    const ensure = (value) => {
      if (value == null) return ''
      if (typeof value !== 'string') {
        value = String(value)
      }
      const trimmed = value.trim()
      if (!trimmed) return ''
      const lower = trimmed.toLowerCase()
      if (lower === 'undefined' || lower === 'null') return ''
      return trimmed
    }
    
    const info = {
      artistId: ensure(initialInfo.artistId),
      artistName: ensure(initialInfo.artistName),
      artistAvatar: ensure(initialInfo.artistAvatar)
    }
    
    const fallbackLogs = []
    const invalidFields = []
    
    if (info.artistAvatar && this.isInvalidImagePath(info.artistAvatar)) {
      fallbackLogs.push('画师头像为临时路径，准备重新查找正式头像')
      invalidFields.push('artistAvatar')
      info.artistAvatar = ''
    }
    
    const candidateIds = []
    if (info.artistId) candidateIds.push(info.artistId)
    if (context.product && ensure(context.product.artistId)) {
      candidateIds.push(ensure(context.product.artistId))
    }
    if (context.options && ensure(context.options.artistId)) {
      candidateIds.push(ensure(context.options.artistId))
    }
    
    const applications = wx.getStorageSync('artist_applications') || []
    let matchedApplication = null
    if (applications.length > 0) {
      matchedApplication = applications.find(app => {
        const appId = ensure(app.userId)
        return appId && candidateIds.includes(appId)
      })
      if (!matchedApplication && info.artistName) {
        matchedApplication = applications.find(app => ensure(app.name) === info.artistName)
      }
    }
    
    if (matchedApplication) {
      fallbackLogs.push('从 artist_applications 补全画师信息')
      if (!info.artistId) info.artistId = ensure(matchedApplication.userId)
      if (!info.artistName) info.artistName = ensure(matchedApplication.name || matchedApplication.realName)
      const avatarFromApp = matchedApplication.avatarUrl || matchedApplication.avatar
      const normalizedAvatar = ensure(avatarFromApp)
      if (!info.artistAvatar && normalizedAvatar && !this.isInvalidImagePath(normalizedAvatar)) {
        info.artistAvatar = normalizedAvatar
        const index = invalidFields.indexOf('artistAvatar')
        if (index !== -1) invalidFields.splice(index, 1)
      }
    }
    
    if (!info.artistAvatar && info.artistId) {
      const profiles = wx.getStorageSync('artist_profiles') || {}
      const profile = profiles[info.artistId]
      if (profile) {
        const profileAvatar = ensure(profile.avatar || profile.avatarUrl)
        if (profileAvatar && !this.isInvalidImagePath(profileAvatar)) {
          info.artistAvatar = profileAvatar
          fallbackLogs.push('从 artist_profiles 补全画师头像')
          const index = invalidFields.indexOf('artistAvatar')
          if (index !== -1) invalidFields.splice(index, 1)
        }
      }
    }
    
    if ((!info.artistName || !info.artistAvatar) && info.artistId) {
      const mockUsers = wx.getStorageSync('mock_users') || []
      const matchedUser = mockUsers.find(user => ensure(user.userId) === info.artistId)
      if (matchedUser) {
        fallbackLogs.push('从 mock_users 补全画师基础信息')
        if (!info.artistName) {
          info.artistName = ensure(matchedUser.nickname || matchedUser.nickName || matchedUser.name)
        }
        const userAvatar = ensure(matchedUser.avatar || matchedUser.avatarUrl)
        if (!info.artistAvatar && userAvatar && !this.isInvalidImagePath(userAvatar)) {
          info.artistAvatar = userAvatar
          const index = invalidFields.indexOf('artistAvatar')
          if (index !== -1) invalidFields.splice(index, 1)
        }
      }
    }
    
    const missingFields = []
    if (!info.artistId) missingFields.push('artistId')
    if (!info.artistName) missingFields.push('artistName')
    if (!info.artistAvatar) missingFields.push('artistAvatar')
    
    return {
      artistInfo: info,
      missingFields,
      fallbackLogs,
      invalidFields
    }
  },

  // 转换临时头像为 base64
  async convertTempAvatar(tempPath) {
    const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')
    
    return new Promise((resolve) => {
      try {
        const fs = wx.getFileSystemManager()
        fs.readFile({
          filePath: tempPath,
          encoding: 'base64',
          success: (res) => {
            const base64 = 'data:image/jpeg;base64,' + res.data
            console.log('✅ 临时头像转换成功')
            resolve(base64)
          },
          fail: (err) => {
            console.error('❌ 临时头像转换失败:', err)
            resolve(DEFAULT_AVATAR_DATA)
          }
        })
      } catch (err) {
        console.error('❌ 读取临时文件异常:', err)
        resolve(DEFAULT_AVATAR_DATA)
      }
    })
  },
  
  async persistOrder(orderInfo, serviceInfo, orderItems = []) {
    const clientOrderNo = orderInfo.clientOrderNo || orderInfo.orderNo
    let cloudResult = { success: false, skipped: false }

    try {
      cloudResult = await this.createOrderInCloud(orderInfo, orderItems)
    } catch (error) {
      console.error('❌ 云端订单创建异常:', error)
      cloudResult = { success: false, skipped: false, message: error.message }
    }

    if (cloudResult.success && cloudResult.data && cloudResult.data.orderId) {
      const cloudOrderId = cloudResult.data.orderId
      orderInfo.cloudOrderId = cloudOrderId
      orderInfo.orderNo = cloudOrderId
      this.setData({ 'orderInfo.orderNo': cloudOrderId })
      console.log('✅ 云端订单号同步完成:', cloudOrderId)
    } else if (!cloudResult.success && !cloudResult.skipped) {
      wx.showToast({ title: '订单已暂存，云端同步失败', icon: 'none' })
      console.warn('⚠️ 云端订单创建失败，已保留客户端订单号:', clientOrderNo)
    } else if (cloudResult.skipped) {
      console.log('ℹ️ 当前为 mock/降级模式，跳过云端下单')
    }

    this.saveOrderToLocal(orderInfo, serviceInfo, orderItems, {
      clientOrderNo,
      cloudSynced: Boolean(cloudResult.success && !cloudResult.skipped),
      cloudOrderId: orderInfo.cloudOrderId || '',
      cloudError: cloudResult.message
    })
  },

  // 自动保存订单到本地存储
  saveOrderToLocal(orderInfo, serviceInfo, orderItems = [], options = {}) {
    console.log(
      '[order-success] 保存订单',
      {
        customerId: wx.getStorageSync('userId'),
        serviceId: serviceInfo?.serviceId,
        serviceName: serviceInfo?.serviceName
      }
    )

    console.log('========================================')
    console.log('💾 订单自动保存 - 开始')
    console.log('========================================')

    try {
      let pendingOrders = wx.getStorageSync('pending_orders') || []
      console.log('当前订单数量:', pendingOrders.length)

      // 检查是否已存在相同订单号（避免重复保存）
      const existingIndex = pendingOrders.findIndex(o => o.id === orderInfo.orderNo)

      // ✅ 引入用户工具模块（方案3：创建兜底）
      const userHelper = require('../../utils/user-helper.js')

      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo') || {}

      // 🎯 多层兜底获取 userId
      let userId = wx.getStorageSync('userId')
      const { userId: finalUserId, isGuest } = userHelper.getOrCreateUserId(userId)
      userId = finalUserId

      console.log('📱 获取用户信息:')
      console.log('- 昵称:', userInfo.nickName)
      console.log('- 头像:', userInfo.avatarUrl ? '已设置' : '未设置')
      console.log('- 用户ID:', userId)
      console.log('- 是否游客:', isGuest ? '是 ⚠️' : '否 ✅')

      const { specSummary } = this.buildSpecPayload(orderInfo, orderItems)

      const newOrder = {
        id: orderInfo.orderNo,
        productId: orderInfo.productId,
        productName: orderInfo.productName,
        productImage: orderInfo.productImage && !orderInfo.productImage.startsWith('data:image')
          ? orderInfo.productImage
          : '',
        spec: specSummary || '无',
        price: Number(orderInfo.totalAmount),
        quantity: orderInfo.quantity,
        deliveryDays: orderInfo.deliveryDays,
        items: orderItems,
        totalAmount: Number(orderInfo.totalAmount),

        createTime: orderInfo.createTime,
        startDate: orderInfo.createTime,
        createdAt: orderInfo.createTime,
        deadline: orderInfo.deadline,

        status: 'inProgress',

        buyerId: String(userId),
        buyerName: userInfo.nickName || '客户',
        buyerAvatar: userInfo.avatarUrl || '',
        buyerOpenId: userInfo.openid || '',

        artistId: String(orderInfo.artistId || ''),
        artistName: orderInfo.artistName,
        artistAvatar: orderInfo.artistAvatar || '',

        serviceId: String(serviceInfo.serviceId || ''),
        serviceName: serviceInfo.serviceName,
        serviceAvatar: serviceInfo.serviceAvatar,
        serviceQrcodeUrl: serviceInfo.serviceQrcodeUrl,
        serviceQrcodeNumber: serviceInfo.serviceQrcodeNumber,
        serviceStatus: serviceInfo.isPlaceholder ? 'pending' : 'assigned',
        needsService: serviceInfo.isPlaceholder ? true : false,

        clientOrderNo: options.clientOrderNo || orderInfo.clientOrderNo || orderInfo.orderNo,
        cloudOrderId: options.cloudOrderId || orderInfo.cloudOrderId || '',
        cloudSyncStatus: options.cloudSynced ? 'synced' : 'pending'
      }

      console.log('[order-success] newOrder.service', {
        id: newOrder.serviceId,
        name: newOrder.serviceName,
        avatar: newOrder.serviceAvatar?.slice(0, 80)
      })

      const serviceAssigned = !serviceInfo?.isPlaceholder

      const requiredFields = [
        { name: 'artistId', value: newOrder.artistId },
        { name: 'artistName', value: newOrder.artistName },
        { name: 'artistAvatar', value: newOrder.artistAvatar }
      ]
      if (serviceAssigned) {
        requiredFields.push(
          { name: 'serviceId', value: newOrder.serviceId },
          { name: 'serviceName', value: newOrder.serviceName },
          { name: 'serviceAvatar', value: newOrder.serviceAvatar }
        )
      }

      const missingFields = requiredFields.filter(f => !f.value)
      if (missingFields.length > 0) {
        console.error('❌ 订单缺少必填字段:', missingFields.map(f => f.name).join(', '))

        if (missingFields.some(f => f.name === 'artistId')) {
          console.error('🚨 [严重] artistId 为空，画师端将无法看到此订单！')
          console.error('商品信息:', {
            productId: orderInfo.productId,
            productName: orderInfo.productName,
            orderNo: orderInfo.orderNo
          })
          console.error('⚠️ 这是商品数据问题，请检查商品发布时是否正确绑定了画师ID')
        }

        wx.showToast({ title: '订单信息不完整', icon: 'none' })
        return
      }

      if (newOrder.artistAvatar.startsWith('http://tmp/') || newOrder.artistAvatar.startsWith('/assets/')) {
        console.error('❌ 画师头像是临时路径:', newOrder.artistAvatar)
        wx.showToast({ title: '画师头像无效', icon: 'none' })
        return
      }
      if (serviceAssigned && (newOrder.serviceAvatar.startsWith('http://tmp/') || newOrder.serviceAvatar.startsWith('/assets/'))) {
        console.error('❌ 客服头像是临时路径:', newOrder.serviceAvatar)
        wx.showToast({ title: '客服头像无效', icon: 'none' })
        return
      }

      console.log('✅ 订单验证通过，准备保存')
      console.log('========================================')

      if (existingIndex === -1) {
        const stockResult = productSales.decreaseStock(orderInfo.productId, orderInfo.quantity)
        if (!stockResult.success) {
          console.error('❌ 库存扣减失败:', stockResult.message)
          wx.showToast({ title: stockResult.message, icon: 'none', duration: 2000 })
          if (stockResult.message.includes('库存不足')) {
            return
          }
        } else {
          console.log('✅ 库存扣减成功，剩余库存:', stockResult.remainingStock === Infinity ? '无限' : stockResult.remainingStock)
        }
      }

      if (existingIndex !== -1) {
        console.log('⚠️ 订单已存在，进行合并更新')
        pendingOrders[existingIndex] = orderHelper.mergeOrderRecords(pendingOrders[existingIndex], newOrder)
      } else {
        pendingOrders.push(newOrder)
      }

      wx.setStorageSync('pending_orders', pendingOrders)

      const savedPending = wx.getStorageSync('pending_orders') || []
      const savedAll = orderHelper.getAllOrders()

      console.log('========================================')
      console.log('✅ 订单保存成功！')
      console.log('========================================')
      console.log('订单号:', orderInfo.orderNo)
      console.log('商品名:', orderInfo.productName)
      console.log('总价:', orderInfo.totalAmount)
      console.log('保存后 pending_orders 总数:', savedPending.length)
      console.log('聚合后订单池总数:', savedAll.length)
      console.log('验证: 订单已在 pending_orders 中')
      console.log('========================================')

    } catch (error) {
      console.log('========================================')
      console.error('❌ 订单保存失败！')
      console.log('========================================')
      console.error('错误信息:', error)
      console.log('========================================')
    } finally {
      const userId = wx.getStorageSync('userId')
      if (userId) {
        wx.removeStorageSync(`processing_count_${userId}`)
        console.log('✅ 已清除订单数量缓存，下次进入用户中心将显示最新数据')
      }
    }
  },

  buildSpecPayload(orderInfo, orderItems = []) {
    const primaryItem = orderItems[0] || {}
    const specSummary = primaryItem.specText || (orderInfo.spec1 || orderInfo.spec2
      ? `${orderInfo.spec1 || ''}${orderInfo.spec2 ? ' / ' + orderInfo.spec2 : ''}`
      : '')

    const specsPayload = orderItems.map(item => {
      const safeUnitPrice = Number(item.unitPrice != null ? item.unitPrice : item.price || 0)
      const quantity = Number(item.quantity) || 1
      return {
        productId: item.productId || orderInfo.productId || '',
        spec1: item.spec1 || '',
        spec2: item.spec2 || '',
        specText: item.specText || specSummary || '',
        quantity,
        unitPrice: Number(safeUnitPrice.toFixed(2)),
        totalPrice: Number((item.totalPrice != null ? item.totalPrice : safeUnitPrice * quantity).toFixed(2)),
        deliveryDays: item.deliveryDays || orderInfo.deliveryDays || 0
      }
    })

    return {
      specSummary: specSummary || '无',
      specsPayload
    }
  },

  getCloudProductImage(orderInfo, orderItems = []) {
    const candidates = []
    const pushCandidate = (value) => {
      if (!value || typeof value !== 'string') return
      const trimmed = value.trim()
      if (!trimmed || trimmed.startsWith('data:image')) return
      candidates.push(trimmed)
    }

    pushCandidate(orderInfo.originalProductImage)
    if (Array.isArray(orderInfo.productImages)) {
      orderInfo.productImages.forEach(pushCandidate)
    }
    orderItems.forEach(item => pushCandidate(item.productImage))
    pushCandidate(orderInfo.productImage)

    return candidates[0] || ''
  },

  async createOrderInCloud(orderInfo, orderItems = []) {
    if (envConfig.useMockData || envConfig.emergencyFallback) {
      return { success: true, skipped: true, message: 'mock 模式下跳过云端下单' }
    }

    const { specSummary, specsPayload } = this.buildSpecPayload(orderInfo, orderItems)

    const payload = {
      productId: orderInfo.productId,
      productName: orderInfo.productName,
      productImage: this.getCloudProductImage(orderInfo, orderItems),
      spec: specSummary,
      specs: specsPayload,
      quantity: orderInfo.quantity,
      price: Number(orderInfo.price || orderInfo.totalAmount || 0),
      totalAmount: Number(orderInfo.totalAmount || 0),
      deadline: orderInfo.deadline,
      deliveryDays: orderInfo.deliveryDays,
      artistId: orderInfo.artistId,
      artistName: orderInfo.artistName,
      artistAvatar: orderInfo.artistAvatar,
      notes: orderInfo.notes || '',
      clientOrderNo: orderInfo.clientOrderNo || orderInfo.orderNo
    }

    console.log('📡 正在同步订单到云数据库:', payload)

    const res = await cloudAPI.createOrder(payload)
    if (!res || !res.success) {
      const message = res?.message || '云端创建订单失败'
      console.error('❌ 云端订单创建失败:', message, res)
      return { success: false, message }
    }

    console.log('✅ 云端订单创建成功:', res.data)
    return { success: true, data: res.data }
  },

  // ❌ 已废弃：销量应在订单完成时更新，使用 utils/product-sales.js
  // incrementProductSales(orderItems = []) {
  //   ...
  // }

  // 生成订单号
  generateOrderNo() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    
    return `${year}${month}${day}${hours}${minutes}${seconds}${random}`
  },
  
  // 格式化日期时间（统一格式，便于解析）
  formatDateTime(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    // 统一格式：YYYY-MM-DD HH:mm（不显示秒）
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 长按保存二维码
  onLongPressQR() {
    const { serviceQR } = this.data
    if (!serviceQR || !serviceQR.imageUrl) return

    wx.showModal({
      title: '保存二维码',
      content: '长按二维码可以保存到相册，或使用微信扫一扫识别',
      showCancel: false,
      confirmText: '知道了'
    })

    // 真实场景：下载并保存图片
    // wx.downloadFile({
    //   url: serviceQR.imageUrl,
    //   success: (res) => {
    //     wx.saveImageToPhotosAlbum({
    //       filePath: res.tempFilePath,
    //       success: () => {
    //         wx.showToast({ title: '已保存到相册', icon: 'success' })
    //       }
    //     })
    //   }
    // })
  },

  // 复制订单号
  copyOrderNo() {
    wx.setClipboardData({
      data: this.data.orderInfo.orderNo,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        })
      }
    })
  },

  // 查看订单详情
  viewOrderDetail() {
    const { orderInfo } = this.data
    
    // 保存订单到本地存储
    const orders = wx.getStorageSync('pending_orders') || []
    
    // 检查订单是否已存在
    const existingIndex = orders.findIndex(o => o.id === orderInfo.orderNo)
    
    if (existingIndex === -1) {
      // 创建完整的订单对象
      const specText = orderInfo.spec1 && orderInfo.spec2 
        ? `${orderInfo.spec1}/${orderInfo.spec2}`
        : orderInfo.spec1 || orderInfo.spec2 || '无'
      
      const newOrder = {
        id: orderInfo.orderNo,
        productId: orderInfo.productId,
        productName: orderInfo.productName,
        // ⚠️ 不保存 base64 图片
        productImage: orderInfo.productImage && !orderInfo.productImage.startsWith('data:image') 
          ? orderInfo.productImage 
          : '',
        spec: specText,
        price: orderInfo.totalAmount.toFixed(2),
        quantity: orderInfo.quantity,
        status: 'inProgress',
        statusText: '进行中',
        createTime: orderInfo.createTime,
        deadline: this.calculateDeadline(orderInfo.createTime, orderInfo.deliveryDays),
        urgent: false,
        step: 2,
        buyerName: wx.getStorageSync('userInfo')?.nickName || '匿名用户',
        artistName: orderInfo.artistName
      }
      
      orders.push(newOrder)
      wx.setStorageSync('pending_orders', orders)
      console.log('✅ 订单已保存:', newOrder)
    }
    
    // 跳转到订单详情页
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderInfo.orderNo}`
    })
  },
  
  // 计算截稿日期
  calculateDeadline(createTime, days) {
    // 确保时间格式可以被正确解析
    const createTimeStr = createTime.replace(/-/g, '/')
    const create = new Date(createTimeStr)
    
    // 检查日期是否有效
    if (isNaN(create.getTime())) {
      console.error('❌ 无效的创建时间:', createTime)
      return '待确认'
    }
    
    // 计算截稿时间
    const deadline = new Date(create.getTime() + days * 24 * 60 * 60 * 1000)
    
    // 格式化为标准格式：YYYY-MM-DD HH:mm
    const year = deadline.getFullYear()
    const month = String(deadline.getMonth() + 1).padStart(2, '0')
    const day = String(deadline.getDate()).padStart(2, '0')
    const hours = String(deadline.getHours()).padStart(2, '0')
    const minutes = String(deadline.getMinutes()).padStart(2, '0')
    
    const formatted = `${year}-${month}-${day} ${hours}:${minutes}`
    
    console.log('✅ 截稿时间计算:', {
      创建时间: createTime,
      出稿天数: days,
      截稿时间: formatted
    })
    
    return formatted
  },

  // 返回首页
  backToHome() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  // 联系客服（预留方法）
  contactService() {
    wx.showModal({
      title: '温馨提示',
      content: '请长按二维码添加客服微信，客服将为您提供专属服务',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
