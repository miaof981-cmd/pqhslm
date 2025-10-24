Page({
  data: {
    loading: true,
    orderId: '',
    order: null,
    isArtist: false,
    isAdmin: false,
    isArtistOrAdmin: false
  },

  onLoad(options) {
    const { id } = options
    if (!id) {
      wx.showToast({ title: '订单ID不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.setData({ orderId: id })
    this.checkUserRole()
    this.loadOrderDetail()
  },

  // 检查用户角色
  checkUserRole() {
    const role = wx.getStorageSync('userRole') || 'customer'
    this.setData({
      isArtist: role === 'artist',
      isAdmin: role === 'admin',
      isArtistOrAdmin: role === 'artist' || role === 'admin'
    })
  },

  // 加载订单详情
  async loadOrderDetail() {
    this.setData({ loading: true })
    
    try {
      // 模拟数据 - 实际应从云数据库获取
      const mockOrder = {
        _id: this.data.orderId,
        orderNo: 'ORD202401250001',
        productId: '1',
        productName: '精美头像设计',
        productImage: 'https://via.placeholder.com/400',
        categoryName: '头像设计',
        deliveryDays: 3,
        amount: '88.00',
        
        artistId: '1',
        artistName: '画师小A',
        artistAvatar: 'https://via.placeholder.com/100',
        artistLevel: 'S',
        artistOrders: 156,
        
        buyerName: '张三',
        buyerPhone: '138****1234',
        
        status: 'processing',
        statusText: '制作中',
        statusDesc: '画师正在为您精心创作',
        statusIndex: 1,
        
        createTime: '2024-01-25 10:30:00',
        payTime: '2024-01-25 10:31:00',
        startTime: '2024-01-25 11:00:00',
        deadline: '2024-01-28 10:30:00',
        completeTime: '',
        
        isOverdue: false,
        remark: '希望画风可爱一些，背景要简洁',
        
        serviceQR: 'https://via.placeholder.com/200',
        
        attachments: [],
        
        logs: [
          {
            action: '订单已创建',
            time: '2024-01-25 10:30:00',
            operator: '系统'
          },
          {
            action: '支付成功',
            time: '2024-01-25 10:31:00',
            operator: '买家'
          },
          {
            action: '画师开始制作',
            time: '2024-01-25 11:00:00',
            operator: '画师小A'
          }
        ]
      }
      
      // 根据状态设置不同的信息
      if (mockOrder.status === 'completed') {
        mockOrder.statusText = '已完成'
        mockOrder.statusDesc = '订单已完成，感谢您的支持'
        mockOrder.statusIndex = 2
        mockOrder.completeTime = '2024-01-27 15:00:00'
        mockOrder.attachments = [
          { type: 'image', url: 'https://via.placeholder.com/400', name: '作品1.jpg' },
          { type: 'image', url: 'https://via.placeholder.com/400', name: '作品2.jpg' },
          { type: 'file', url: '', name: '源文件.psd' }
        ]
        mockOrder.logs.push({
          action: '订单已完成',
          time: '2024-01-27 15:00:00',
          operator: '画师小A'
        })
      }
      
      this.setData({ order: mockOrder })
    } catch (error) {
      console.error('加载订单详情失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 查看商品
  viewProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${id}`
    })
  },

  // 查看画师
  viewArtist(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  // 联系画师
  contactArtist() {
    wx.showModal({
      title: '联系画师',
      content: '请通过专属客服二维码联系画师',
      showCancel: false
    })
  },

  // 复制订单号
  copyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.orderNo,
      success: () => {
        wx.showToast({ title: '已复制订单号', icon: 'success' })
      }
    })
  },

  // 预览附件
  previewAttachment(e) {
    const url = e.currentTarget.dataset.url
    const images = this.data.order.attachments
      .filter(a => a.type === 'image')
      .map(a => a.url)
    
    if (images.includes(url)) {
      wx.previewImage({
        current: url,
        urls: images
      })
    } else {
      wx.showToast({ title: '暂不支持预览此文件', icon: 'none' })
    }
  },

  // 预览二维码
  previewQR() {
    wx.previewImage({
      current: this.data.order.serviceQR,
      urls: [this.data.order.serviceQR]
    })
  },

  // 买家操作
  payOrder() {
    wx.showModal({
      title: '支付订单',
      content: '确认支付此订单？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '支付中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrderDetail()
          }, 1000)
        }
      }
    })
  },

  applyRefund() {
    wx.showModal({
      title: '申请退款',
      content: '确认申请退款？退款后订单将被取消',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已提交退款申请', icon: 'success' })
          this.loadOrderDetail()
        }
      }
    })
  },

  confirmOrder() {
    wx.showModal({
      title: '确认收货',
      content: '确认收到作品并满意？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '确认成功', icon: 'success' })
          this.loadOrderDetail()
        }
      }
    })
  },

  deleteOrder() {
    wx.showModal({
      title: '删除订单',
      content: '确认删除此订单？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1000)
        }
      }
    })
  },

  // 画师操作
  startWork() {
    wx.showModal({
      title: '开始制作',
      content: '确认开始制作此订单？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已开始制作', icon: 'success' })
          this.loadOrderDetail()
        }
      }
    })
  },

  uploadWork() {
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' })
        // 实际应上传到云存储
        setTimeout(() => {
          wx.hideLoading()
          wx.showToast({ title: '上传成功', icon: 'success' })
        }, 1000)
      }
    })
  },

  completeOrder() {
    wx.showModal({
      title: '完成订单',
      content: '确认完成此订单？请确保已上传所有作品',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '订单已完成', icon: 'success' })
          this.loadOrderDetail()
        }
      }
    })
  },

  // 管理员操作
  processRefund() {
    wx.showModal({
      title: '处理退款',
      content: '确认退款给买家？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '退款已处理', icon: 'success' })
          this.loadOrderDetail()
        }
      }
    })
  },

  editOrder() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOrderDetail()
    wx.stopPullDownRefresh()
  }
})
