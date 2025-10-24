Page({
  data: {
    currentTab: 'orders',
    contentTab: 'notices',
    orderFilter: 'all',
    loading: true,
    
    // 数据统计
    stats: {
      totalRevenue: '0',
      revenueGrowth: '0',
      totalOrders: 0,
      orderGrowth: '0',
      totalArtists: 0,
      artistGrowth: '0',
      totalUsers: 0,
      userGrowth: '0'
    },
    
    // 待处理数量
    pendingOrders: 0,
    pendingApplications: 0,
    
    // 订单统计
    orderStats: {
      all: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      refunded: 0
    },
    
    // 数据列表
    orders: [],
    allOrders: [],
    applications: [],
    notices: [],
    serviceQRs: [],
    banners: []
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    this.loadData()
  },

  // 检查管理员权限
  checkPermission() {
    const role = wx.getStorageSync('userRole') || 'customer'
    if (role !== 'admin') {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/home/index'
          })
        }
      })
      return false
    }
    return true
  },

  // 加载所有数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadStats(),
        this.loadOrders(),
        this.loadApplications(),
        this.loadNotices(),
        this.loadServiceQRs(),
        this.loadBanners()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载数据统计
  async loadStats() {
    // 模拟数据
    this.setData({
      stats: {
        totalRevenue: '15,680',
        revenueGrowth: '12.5',
        totalOrders: 156,
        orderGrowth: '8.3',
        totalArtists: 23,
        artistGrowth: '15.0',
        totalUsers: 489,
        userGrowth: '20.1'
      },
      pendingOrders: 5,
      pendingApplications: 3
    })
  },

  // 加载订单列表
  async loadOrders() {
    // 模拟数据
    const mockOrders = [
      {
        _id: '1',
        orderNo: 'ORD202401250001',
        productName: '精美头像设计',
        productImage: 'https://via.placeholder.com/100',
        artistName: '画师A',
        userName: '用户001',
        amount: '88.00',
        status: 'pending',
        statusText: '待处理',
        createTime: '2024-01-25 10:30',
        deadline: '2024-02-01 10:30'
      },
      {
        _id: '2',
        orderNo: 'ORD202401250002',
        productName: '创意插画作品',
        productImage: 'https://via.placeholder.com/100',
        artistName: '画师B',
        userName: '用户002',
        amount: '168.00',
        status: 'processing',
        statusText: '进行中',
        createTime: '2024-01-24 15:20',
        deadline: '2024-02-05 15:20'
      },
      {
        _id: '3',
        orderNo: 'ORD202401240003',
        productName: '企业LOGO设计',
        productImage: 'https://via.placeholder.com/100',
        artistName: '画师C',
        userName: '用户003',
        amount: '299.00',
        status: 'completed',
        statusText: '已完成',
        createTime: '2024-01-23 09:15',
        deadline: '2024-02-10 09:15'
      }
    ]
    
    // 计算订单统计
    const orderStats = {
      all: mockOrders.length,
      pending: mockOrders.filter(o => o.status === 'pending').length,
      processing: mockOrders.filter(o => o.status === 'processing').length,
      completed: mockOrders.filter(o => o.status === 'completed').length,
      refunded: mockOrders.filter(o => o.status === 'refunded').length
    }
    
    this.setData({
      allOrders: mockOrders,
      orders: mockOrders,
      orderStats: orderStats
    })
  },

  // 加载画师申请
  async loadApplications() {
    this.setData({
      applications: [
        {
          _id: '1',
          name: '张三',
          phone: '138****1234',
          specialty: '插画、头像设计',
          portfolio: [
            'https://via.placeholder.com/200',
            'https://via.placeholder.com/200',
            'https://via.placeholder.com/200'
          ],
          status: 'pending',
          createTime: '2024-01-25 14:30'
        },
        {
          _id: '2',
          name: '李四',
          phone: '139****5678',
          specialty: 'LOGO设计',
          portfolio: [
            'https://via.placeholder.com/200',
            'https://via.placeholder.com/200'
          ],
          status: 'pending',
          createTime: '2024-01-24 10:15'
        }
      ]
    })
  },

  // 加载公告
  async loadNotices() {
    this.setData({
      notices: [
        {
          _id: '1',
          title: '新用户专享优惠，首单立减50元！',
          content: '活动详情...',
          status: 'active',
          createTime: '2024-01-20 10:00'
        },
        {
          _id: '2',
          title: '画师认证通道开放',
          content: '欢迎优秀画师加入...',
          status: 'active',
          createTime: '2024-01-18 15:30'
        }
      ]
    })
  },

  // 加载客服二维码
  async loadServiceQRs() {
    this.setData({
      serviceQRs: [
        {
          _id: '1',
          title: '客服A',
          imageUrl: 'https://via.placeholder.com/200',
          assignedCount: 45,
          isActive: true
        },
        {
          _id: '2',
          title: '客服B',
          imageUrl: 'https://via.placeholder.com/200',
          assignedCount: 38,
          isActive: true
        }
      ]
    })
  },

  // 加载轮播图
  async loadBanners() {
    this.setData({
      banners: [
        {
          _id: '1',
          title: '首页轮播图1',
          imageUrl: 'https://via.placeholder.com/750x280',
          sort: 1,
          isActive: true
        },
        {
          _id: '2',
          title: '首页轮播图2',
          imageUrl: 'https://via.placeholder.com/750x280',
          sort: 2,
          isActive: true
        }
      ]
    })
  },

  // 切换主标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 切换内容标签
  switchContentTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ contentTab: tab })
  },

  // 筛选订单
  filterOrders(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ orderFilter: filter })
    
    if (filter === 'all') {
      this.setData({ orders: this.data.allOrders })
    } else {
      const filtered = this.data.allOrders.filter(order => order.status === filter)
      this.setData({ orders: filtered })
    }
  },

  // 快捷操作
  goToOrders() {
    this.setData({ currentTab: 'orders' })
  },

  goToArtists() {
    this.setData({ currentTab: 'artists' })
  },

  goToProducts() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goToCategories() {
    this.manageCategories()
  },

  // 订单操作
  viewOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  confirmOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认订单',
      content: '确认接受此订单？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '订单已确认', icon: 'success' })
          this.loadOrders()
        }
      }
    })
  },

  completeOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '完成订单',
      content: '确认此订单已完成？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '订单已完成', icon: 'success' })
          this.loadOrders()
        }
      }
    })
  },

  // 审核画师申请
  reviewApplication(e) {
    const { id, action } = e.currentTarget.dataset
    const actionText = action === 'approved' ? '通过' : '驳回'
    
    wx.showModal({
      title: `${actionText}申请`,
      content: `确认${actionText}此画师申请？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: `已${actionText}`,
            icon: 'success'
          })
          this.loadApplications()
        }
      }
    })
  },

  // 内容管理操作
  addNotice() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  addBanner() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  addServiceQR() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  // 系统设置操作
  manageCategories() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  manageMembership() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  viewStatistics() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})
