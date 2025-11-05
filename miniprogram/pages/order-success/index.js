Page({
  data: {
    orderInfo: null,
    productInfo: null,
    serviceQR: null,
    countdown: 3 // 倒计时秒数
  },

  onLoad(options) {
    // --- 检查数据来源 ---
    const products = wx.getStorageSync('mock_products') || []
    const product = products.find(p => p.id === options.productId)
    const currentUser = wx.getStorageSync('userInfo') || wx.getStorageSync('current_user') || {}
    const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')
    
    console.log('🔍 商品查找结果:', {
      productId: options.productId,
      找到商品: !!product,
      商品名: product?.name,
      商品画师ID: product?.artistId,
      商品画师名: product?.artistName,
      商品画师头像: product?.artistAvatar ? '有' : '无',
      当前用户: currentUser?.nickName
    })
    
    // --- 绑定画师信息（强制使用商品表数据，不兜底到当前用户）---
    const artistId = product?.artistId || ''
    const artistName = product?.artistName || '未知画师'
    const artistAvatar = product?.artistAvatar || DEFAULT_AVATAR_DATA
    
    // --- 分配客服 ---
    const service = this.assignService()
    
    // ⚠️ 如果客服分配失败，阻止下单
    if (!service || !service.serviceId || !service.serviceName) {
      console.error('❌ 客服分配失败:', service)
      wx.showModal({
        title: '系统错误',
        content: '客服分配失败，请稍后再试或联系管理员',
        showCancel: false,
        complete: () => {
          wx.navigateBack()
        }
      })
      return
    }
    
    const serviceId = service.serviceId
    const serviceName = service.serviceName
    const serviceAvatar = service.serviceAvatar || DEFAULT_AVATAR_DATA
    
    // --- 控制台打印检查 ---
    console.log("📦 下单前检查:", { 
      product: product ? { id: product.id, name: product.name, artistName: product.artistName } : null,
      artistName, 
      serviceName 
    })
    
    // 从URL参数获取订单信息（需要解码）
    const orderInfo = {
      orderNo: this.generateOrderNo(),
      productId: options.productId || '',
      productName: decodeURIComponent(options.productName || '商品'),
      productImage: decodeURIComponent(options.productImage || ''),
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
    
    // 构建客服信息对象
    const serviceInfo = {
      serviceId: serviceId,
      serviceName: serviceName,
      serviceAvatar: serviceAvatar,
      serviceQrcodeUrl: service?.serviceQrcodeUrl || service?.qrcodeUrl || '',
      serviceQrcodeNumber: service?.serviceQrcodeNumber || service?.qrcodeNumber || null
    }
    
    // 获取客服二维码（如果有）
    const serviceQR = serviceInfo.serviceQrcodeUrl 
      ? { imageUrl: serviceInfo.serviceQrcodeUrl, number: serviceInfo.serviceQrcodeNumber }
      : { imageUrl: 'https://via.placeholder.com/400x400.png?text=客服二维码', number: null }

    this.setData({
      orderInfo: orderInfo,
      serviceInfo: serviceInfo,  // 保存客服信息
      serviceQR: serviceQR
    })
    
    // ✅ 自动保存订单到本地存储（包含客服信息）
    this.saveOrderToLocal(orderInfo, serviceInfo)

    // 禁止用户返回（可选）
    // wx.hideHomeButton() // 隐藏返回首页按钮
  },
  
  // 自动分配客服
  assignService() {
    // 获取所有客服（统一使用 customer_service_list）
    let serviceList = wx.getStorageSync('customer_service_list') || []
    
    // 🎯 如果客服列表为空，自动创建默认在线客服
    if (serviceList.length === 0) {
      console.log('⚠️ 客服列表为空，自动创建默认在线客服')
      const currentUser = wx.getStorageSync('userInfo') || {}
      const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')
      
      const defaultService = {
        userId: currentUser.userId || 'service_default',
        id: currentUser.userId || 'service_default',
        name: currentUser.nickName || '在线客服',
        nickName: currentUser.nickName || '在线客服',
        avatar: currentUser.avatarUrl || DEFAULT_AVATAR_DATA,
        avatarUrl: currentUser.avatarUrl || DEFAULT_AVATAR_DATA,
        isActive: true,  // 默认客服永远在线
        serviceNumber: 1,
        qrcodeUrl: '',
        qrcodeNumber: null
      }
      
      serviceList = [defaultService]
      wx.setStorageSync('customer_service_list', serviceList)
      console.log('✅ 默认在线客服已创建:', defaultService.name)
    }
    
    // 🎯 确保至少有一个客服在线（强制第一个客服在线）
    const activeServices = serviceList.filter(s => s.isActive)
    if (activeServices.length === 0) {
      console.log('⚠️ 所有客服都离线，强制第一个客服上线')
      serviceList[0].isActive = true
      wx.setStorageSync('customer_service_list', serviceList)
    }
    
    // 重新获取在线客服
    const finalActiveServices = serviceList.filter(s => s.isActive)
    
    console.log('📞 自动分配客服:')
    console.log('- 客服总数:', serviceList.length)
    console.log('- 在线客服数:', finalActiveServices.length)
    
    // 随机选择一个在线客服
    const randomIndex = Math.floor(Math.random() * finalActiveServices.length)
    const assignedService = finalActiveServices[randomIndex]
    
    console.log('✅ 分配客服成功:')
    console.log('- 客服ID:', assignedService.userId || assignedService.id)
    console.log('- 客服姓名:', assignedService.name || assignedService.nickName)
    
    return {
      serviceId: assignedService.userId || assignedService.id,
      serviceName: assignedService.name || assignedService.nickName || '在线客服',
      serviceAvatar: assignedService.avatar || assignedService.avatarUrl || '',
      serviceQrcodeUrl: assignedService.qrcodeUrl || '',
      serviceQrcodeNumber: assignedService.qrcodeNumber
    }
  },
  
  // 自动保存订单到本地存储
  saveOrderToLocal(orderInfo, serviceInfo) {
    console.log('========================================')
    console.log('💾 订单自动保存 - 开始')
    console.log('========================================')
    
    try {
      let orders = wx.getStorageSync('pending_orders') || []
      console.log('当前订单数量:', orders.length)
      
      // 检查是否已存在相同订单号（避免重复保存）
      const existingIndex = orders.findIndex(o => o.id === orderInfo.orderNo)
      if (existingIndex !== -1) {
        console.log('⚠️ 订单已存在，跳过保存')
        console.log('订单号:', orderInfo.orderNo)
        return
      }
      
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
      
      // 构建订单数据
      const newOrder = {
        id: orderInfo.orderNo,
        productId: orderInfo.productId,
        productName: orderInfo.productName,
        // ⚠️ 不保存 base64 图片，避免 setData 数据量过大
        // 页面显示时通过 productId 从商品表动态读取
        productImage: orderInfo.productImage && !orderInfo.productImage.startsWith('data:image') 
          ? orderInfo.productImage 
          : '',
        spec: `${orderInfo.spec1}${orderInfo.spec2 ? ' / ' + orderInfo.spec2 : ''}`,
        price: orderInfo.totalAmount,
        quantity: orderInfo.quantity,
        deliveryDays: orderInfo.deliveryDays,
        
        // ✅ 时间字段（多个字段确保兼容性）
        createTime: orderInfo.createTime,
        startDate: orderInfo.createTime,  // 新增：用于进度条计算
        createdAt: orderInfo.createTime,  // 新增：备用字段
        deadline: orderInfo.deadline,
        
        status: 'inProgress',
        
        // ✅ 保存下单者信息
        buyerId: userId,
        buyerName: userInfo.nickName || '客户',
        buyerAvatar: userInfo.avatarUrl || '',
        buyerOpenId: userInfo.openid || '',
        
        // ✅ 保存画师完整信息
        artistId: orderInfo.artistId || '',
        artistName: orderInfo.artistName,
        artistAvatar: orderInfo.artistAvatar || '',
        
        // ✅ 保存客服信息（已分配）
        serviceId: serviceInfo.serviceId,
        serviceName: serviceInfo.serviceName,
        serviceAvatar: serviceInfo.serviceAvatar,
        serviceQrcodeUrl: serviceInfo.serviceQrcodeUrl,
        serviceQrcodeNumber: serviceInfo.serviceQrcodeNumber
      }
      
      console.log('🔵 保存前订单字段检查', {
        artistId: newOrder.artistId,
        artistName: newOrder.artistName,
        artistAvatar: newOrder.artistAvatar,
        serviceId: newOrder.serviceId,
        serviceName: newOrder.serviceName,
        serviceAvatar: newOrder.serviceAvatar
      })
      
      // 添加新订单
      orders.push(newOrder)
      
      // 保存到本地存储
      wx.setStorageSync('pending_orders', orders)
      
      // 验证保存
      const savedOrders = wx.getStorageSync('pending_orders') || []
      
      console.log('========================================')
      console.log('✅ 订单保存成功！')
      console.log('========================================')
      console.log('订单号:', orderInfo.orderNo)
      console.log('商品名:', orderInfo.productName)
      console.log('总价:', orderInfo.totalAmount)
      console.log('保存后订单总数:', savedOrders.length)
      console.log('验证: 订单已在 pending_orders 中')
      console.log('========================================')
      
    } catch (error) {
      console.log('========================================')
      console.error('❌ 订单保存失败！')
      console.log('========================================')
      console.error('错误信息:', error)
      console.log('========================================')
    }
  },

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
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
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

