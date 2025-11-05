Page({
  data: {
    orderInfo: null,
    productInfo: null,
    serviceQR: null,
    countdown: 3 // 倒计时秒数
  },

  onLoad(options) {
    // 从URL参数获取订单信息（需要解码）
    const orderInfo = {
      orderNo: this.generateOrderNo(),
      productId: options.productId || '',
      productName: decodeURIComponent(options.productName || '商品'),
      productImage: decodeURIComponent(options.productImage || '/assets/default-product.png'),
      spec1: decodeURIComponent(options.spec1 || ''),
      spec2: decodeURIComponent(options.spec2 || ''),
      quantity: parseInt(options.quantity) || 1,
      price: parseFloat(options.price) || 0,
      totalAmount: parseFloat(options.totalAmount) || 0,
      deliveryDays: parseInt(options.deliveryDays) || 7,
      
      // ✅ 画师完整信息
      artistId: options.artistId || '',
      artistName: decodeURIComponent(options.artistName || '画师'),
      artistAvatar: options.artistAvatar ? decodeURIComponent(options.artistAvatar) : '',
      
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
    
    // ✅ 获取分配的客服信息
    const serviceInfo = this.assignService()
    
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
    // 获取所有在线客服
    const serviceList = wx.getStorageSync('service_list') || []
    const activeServices = serviceList.filter(s => s.isActive)
    
    console.log('📞 自动分配客服:')
    console.log('- 客服总数:', serviceList.length)
    console.log('- 在线客服数:', activeServices.length)
    
    if (activeServices.length === 0) {
      console.log('⚠️ 暂无在线客服，订单待分配')
      return {
        serviceId: '',
        serviceName: '待分配',
        serviceAvatar: '',
        serviceQrcodeUrl: '',
        serviceQrcodeNumber: null
      }
    }
    
    // 随机选择一个在线客服
    const randomIndex = Math.floor(Math.random() * activeServices.length)
    const assignedService = activeServices[randomIndex]
    
    console.log('✅ 分配客服成功:')
    console.log('- 客服ID:', assignedService.userId)
    console.log('- 客服姓名:', assignedService.name)
    console.log('- 客服编号:', assignedService.serviceNumber)
    console.log('- 二维码编号:', assignedService.qrcodeNumber)
    
    return {
      serviceId: assignedService.userId,
      serviceName: assignedService.name,
      serviceAvatar: assignedService.avatar || '',
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
      
      console.log('新订单数据:', newOrder)
      
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

