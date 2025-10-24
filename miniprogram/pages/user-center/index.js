Page({
  data: {
    userInfo: null,
    orders: [],
    loading: true,
    isArtist: false,
    memberInfo: null,
    orderStats: {
      created: 0,
      completed: 0,
      refunded: 0,
      total: 0
    }
  },

  onLoad(options) {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadUserInfo(),
        this.loadOrders(),
        this.checkArtistStatus()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    const app = getApp()
    this.setData({ 
      userInfo: {
        openid: app.globalData.openid,
        name: '妙妙',
        avatar: 'https://via.placeholder.com/100x100.png?text=妙妙',
        role: 'customer'
      }
    })
  },

  // 检查画师状态
  async checkArtistStatus() {
    const app = getApp()
    const isArtist = app.globalData.role === 'artist' || app.globalData.role === 'admin'
    
    this.setData({ isArtist: isArtist })
    
    if (isArtist) {
      await this.loadMemberInfo()
    }
  },

  // 加载会员信息
  async loadMemberInfo() {
    this.setData({
      memberInfo: {
        isValid: true,
        endDate: '2024-12-31',
        daysLeft: 365,
        amount: 100
      }
    })
  },

  // 加载订单
  async loadOrders() {
    const orders = [
      {
        _id: 'order-1',
        status: 'created',
        createTime: '2024-01-01',
        deadline: '2024-01-04',
        price: 100,
        productName: '精美头像设计'
      },
      {
        _id: 'order-2',
        status: 'completed',
        createTime: '2024-01-02',
        deadline: '2024-01-05',
        price: 168,
        productName: '创意插画作品'
      }
    ]
    
    // 计算订单统计
    const stats = {
      created: orders.filter(o => o.status === 'created').length,
      completed: orders.filter(o => o.status === 'completed').length,
      refunded: 0,
      total: orders.length
    }
    
    this.setData({
      orders: orders,
      orderStats: stats
    })
  },

  // 申请成为画师
  applyArtist() {
    wx.navigateTo({
      url: '/pages/apply/index'
    })
  },

  // 进入画师工作台
  goToArtistDashboard() {
    wx.navigateTo({
      url: '/pages/artist-dashboard/index'
    })
  },

  // 进入管理后台
  goToAdmin() {
    const app = getApp()
    if (app.checkPermission('admin')) {
      wx.navigateTo({
        url: '/pages/admin/index'
      })
    } else {
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      })
    }
  },

  // 查看订单详情
  viewOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 查看全部订单
  viewAllOrders() {
    wx.navigateTo({
      url: '/pages/order-list/index'
    })
  },

  // 更新用户信息
  updateUserInfo() {
    wx.navigateTo({
      url: '/pages/user-edit/index'
    })
  }
})