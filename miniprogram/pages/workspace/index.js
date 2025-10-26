Page({
  data: {
    loading: true,
    userRole: '', // 'artist' 或 'service'
    
    // 今日待办（所有角色通用）
    todoStats: {
      pendingOrders: 0,
      urgentOrders: 0,
      todayOrders: 0
    },
    
    // 订单列表
    orders: [],
    currentTab: 'all', // all, pending, processing, completed
    
    // 快捷功能（根据角色不同）
    quickActions: []
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    this.loadData()
  },

  // 检查权限并确定角色
  checkPermission() {
    const app = getApp()
    const roles = app.getUserRoles()
    
    // 确定主要工作角色（优先级：admin > service > artist）
    let userRole = 'customer'
    if (roles.includes('admin')) {
      userRole = 'service' // 管理员默认显示客服视图（可以看所有订单）
    } else if (roles.includes('service')) {
      userRole = 'service'
    } else if (roles.includes('artist')) {
      userRole = 'artist'
    }
    
    if (userRole === 'customer') {
      wx.showModal({
        title: '权限不足',
        content: '您还不是画师或客服，无法访问工作台',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }
    
    this.setData({ userRole })
    this.loadData()
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadTodoStats(),
        this.loadOrders(),
        this.loadQuickActions()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载待办统计
  async loadTodoStats() {
    const { userRole } = this.data
    
    // 模拟数据
    if (userRole === 'artist') {
      // 画师：只看自己的订单
      this.setData({
        todoStats: {
          pendingOrders: 3,
          urgentOrders: 1,
          todayOrders: 2
        }
      })
    } else if (userRole === 'service') {
      // 客服：看所有订单
      this.setData({
        todoStats: {
          pendingOrders: 15,
          urgentOrders: 5,
          todayOrders: 8
        }
      })
    }
  },

  // 加载订单列表
  async loadOrders() {
    const { userRole, currentTab } = this.data
    
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
        spec: '半身 / 平板',
        isUrgent: false
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
        deadline: '2024-10-27 14:20', // 快到期
        amount: 168.00,
        spec: '全身 / 手机',
        isUrgent: true
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
        spec: '标准版',
        isUrgent: false
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

  // 加载快捷功能
  async loadQuickActions() {
    const { userRole } = this.data
    
    if (userRole === 'artist') {
      // 画师快捷功能
      this.setData({
        quickActions: [
          { id: 'products', icon: '📦', label: '商品管理', url: '/pages/product-manage/index' },
          { id: 'rewards', icon: '💰', label: '打赏记录', url: '' },
          { id: 'profile', icon: '👤', label: '我的资料', url: '/pages/user-center/index' }
        ]
      })
    } else if (userRole === 'service') {
      // 客服快捷功能
      this.setData({
        quickActions: [
          { id: 'allOrders', icon: '📋', label: '所有订单', url: '/pages/order-list/index' },
          { id: 'messages', icon: '💬', label: '咨询记录', url: '' },
          { id: 'profile', icon: '👤', label: '我的资料', url: '/pages/user-center/index' }
        ]
      })
    }
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

  // 快捷操作
  handleQuickAction(e) {
    const action = e.currentTarget.dataset.action
    const url = e.currentTarget.dataset.url
    
    if (url) {
      wx.navigateTo({
        url: url
      })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})

