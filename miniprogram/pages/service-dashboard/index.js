Page({
  data: {
    loading: true,
    // 今日待办
    todoStats: {
      pendingOrders: 0,      // 待处理订单
      pendingMessages: 0,    // 待回复咨询
      delayedOrders: 0       // 延期订单
    },
    // 订单列表
    orders: [],
    currentTab: 'pending',  // pending, processing, completed
    // 快捷统计
    quickStats: {
      todayOrders: 0,
      todayRevenue: 0,
      totalOrders: 0
    }
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    this.loadData()
  },

  // 检查权限
  checkPermission() {
    const app = getApp()
    if (!app.checkPermission('service') && !app.checkPermission('admin')) {
      wx.showModal({
        title: '权限不足',
        content: '您还不是客服，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }
    this.loadData()
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadTodoStats(),
        this.loadOrders(),
        this.loadQuickStats()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载待办统计
  async loadTodoStats() {
    // 模拟数据
    this.setData({
      todoStats: {
        pendingOrders: 5,
        pendingMessages: 3,
        delayedOrders: 2
      }
    })
  },

  // 加载订单列表
  async loadOrders() {
    const { currentTab } = this.data
    
    // 模拟订单数据
    const allOrders = [
      {
        _id: 'order-1',
        orderNo: 'ORD20241026001',
        productName: '精美头像设计',
        customerName: '用户A',
        artistName: '画师小明',
        status: 'pending',
        statusText: '待处理',
        createTime: '2024-10-26 10:30',
        deadline: '2024-10-29 10:30',
        amount: 88.00,
        spec: '半身 / 平板'
      },
      {
        _id: 'order-2',
        orderNo: 'ORD20241026002',
        productName: '创意插画作品',
        customerName: '用户B',
        artistName: '画师小红',
        status: 'processing',
        statusText: '进行中',
        createTime: '2024-10-25 14:20',
        deadline: '2024-10-28 14:20',
        amount: 168.00,
        spec: '全身 / 手机'
      },
      {
        _id: 'order-3',
        orderNo: 'ORD20241025003',
        productName: 'LOGO设计',
        customerName: '用户C',
        artistName: '画师小李',
        status: 'completed',
        statusText: '已完成',
        createTime: '2024-10-23 09:15',
        deadline: '2024-10-26 09:15',
        amount: 299.00,
        spec: '标准版'
      }
    ]
    
    // 根据当前标签筛选订单
    let filteredOrders = allOrders
    if (currentTab === 'pending') {
      filteredOrders = allOrders.filter(o => o.status === 'pending')
    } else if (currentTab === 'processing') {
      filteredOrders = allOrders.filter(o => o.status === 'processing')
    } else if (currentTab === 'completed') {
      filteredOrders = allOrders.filter(o => o.status === 'completed')
    }
    
    this.setData({
      orders: filteredOrders
    })
  },

  // 加载快捷统计
  async loadQuickStats() {
    this.setData({
      quickStats: {
        todayOrders: 8,
        todayRevenue: 1256.00,
        totalOrders: 156
      }
    })
  },

  // 切换订单标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
    this.loadOrders()
  },

  // 查看订单详情
  viewOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 联系客户
  contactCustomer(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showToast({
      title: '联系客户功能开发中',
      icon: 'none'
    })
  },

  // 联系画师
  contactArtist(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showToast({
      title: '联系画师功能开发中',
      icon: 'none'
    })
  },

  // 查看所有订单
  viewAllOrders() {
    wx.navigateTo({
      url: '/pages/order-list/index'
    })
  },

  // 查看咨询记录
  viewMessages() {
    wx.showToast({
      title: '咨询记录功能开发中',
      icon: 'none'
    })
  },

  // 我的资料
  viewProfile() {
    wx.navigateTo({
      url: '/pages/user-center/index'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})

