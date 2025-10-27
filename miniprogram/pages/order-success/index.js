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
      artistName: decodeURIComponent(options.artistName || '画师'),
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

    this.setData({
      orderInfo: orderInfo,
      serviceQR: {
        imageUrl: 'https://via.placeholder.com/400x400.png?text=客服二维码'
      }
    })
    
    // ✅ 自动保存订单到本地存储
    this.saveOrderToLocal(orderInfo)

    // 禁止用户返回（可选）
    // wx.hideHomeButton() // 隐藏返回首页按钮
  },
  
  // 自动保存订单到本地存储
  saveOrderToLocal(orderInfo) {
    try {
      let orders = wx.getStorageSync('pending_orders') || []
      
      // 检查是否已存在相同订单号（避免重复保存）
      const existingIndex = orders.findIndex(o => o.id === orderInfo.orderNo)
      if (existingIndex !== -1) {
        console.log('⚠️ 订单已存在，跳过保存')
        return
      }
      
      // 添加新订单
      orders.push({
        id: orderInfo.orderNo,
        productId: orderInfo.productId,
        productName: orderInfo.productName,
        productImage: orderInfo.productImage,
        spec: `${orderInfo.spec1}${orderInfo.spec2 ? ' / ' + orderInfo.spec2 : ''}`,
        price: orderInfo.totalAmount,
        quantity: orderInfo.quantity,
        deliveryDays: orderInfo.deliveryDays,
        artistName: orderInfo.artistName,
        createTime: orderInfo.createTime,
        deadline: orderInfo.deadline,
        status: 'inProgress'
      })
      
      // 保存到本地存储
      wx.setStorageSync('pending_orders', orders)
      
      console.log('✅ 订单已自动保存到本地存储')
      console.log('订单号:', orderInfo.orderNo)
      console.log('订单总数:', orders.length)
    } catch (error) {
      console.error('❌ 订单保存失败:', error)
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
        productImage: orderInfo.productImage,
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

