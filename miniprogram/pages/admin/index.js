Page({
  data: {
    loading: true,
    currentTab: 'dashboard',
    timeFilter: 'today',
    chartType: '7days',
    
    // 子标签
    artistTab: 'list',
    productFilter: 'all',
    orderFilter: 'all',
    
    // 仪表盘数据
    dashboard: {
      orderCount: 0,
      orderTrend: '+0',
      buyerCount: 0,
      buyerTrend: '+0',
      revenue: '0',
      revenueTrend: '+0',
      refundCount: 0,
      refundAmount: '0',
      artistCount: 0,
      activeArtists: 0,
      userCount: 0,
      newUsers: 0
    },
    
    // 待处理数量
    pendingOrders: 0,
    overdueOrders: 0,
    pendingApplications: 0,
    
    // 订单统计
    orderStats: {
      all: 0,
      unpaid: 0,
      paid: 0,
      processing: 0,
      completed: 0,
      refunding: 0,
      refunded: 0
    },
    
    // 数据列表
    products: [],
    allProducts: [],
    orders: [],
    allOrders: [],
    artists: [],
    applications: [],
    artistPerformance: []
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
        this.loadDashboard(),
        this.loadProducts(),
        this.loadOrders(),
        this.loadArtists(),
        this.loadApplications()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载仪表盘数据
  async loadDashboard() {
    // 模拟数据 - 根据timeFilter显示不同数据
    const { timeFilter } = this.data
    
    // 根据不同时间范围返回不同数据
    const dashboardData = {
      today: {
        orderCount: 28,
        orderTrend: '+3',
        buyerCount: 15,
        buyerTrend: '+2',
        revenue: '3,680',
        revenueTrend: '+480',
        refundCount: 5,
        refundAmount: '580',
        artistCount: 23,
        activeArtists: 18,
        userCount: 89,
        newUsers: 12
      },
      yesterday: {
        orderCount: 25,
        orderTrend: '+5',
        buyerCount: 13,
        buyerTrend: '+1',
        revenue: '3,200',
        revenueTrend: '+320',
        refundCount: 3,
        refundAmount: '420',
        artistCount: 23,
        activeArtists: 17,
        userCount: 77,
        newUsers: 8
      },
      week: {
        orderCount: 156,
        orderTrend: '+18',
        buyerCount: 89,
        buyerTrend: '+12',
        revenue: '15,680',
        revenueTrend: '+2,340',
        refundCount: 12,
        refundAmount: '1,580',
        artistCount: 23,
        activeArtists: 20,
        userCount: 89,
        newUsers: 23
      },
      month: {
        orderCount: 567,
        orderTrend: '+89',
        buyerCount: 234,
        buyerTrend: '+45',
        revenue: '58,900',
        revenueTrend: '+8,900',
        refundCount: 28,
        refundAmount: '3,680',
        artistCount: 23,
        activeArtists: 21,
        userCount: 89,
        newUsers: 56
      }
    }
    
    this.setData({
      dashboard: dashboardData[timeFilter] || dashboardData.today,
      pendingOrders: 8,
      overdueOrders: 3,
      pendingApplications: 2
    })
    
    // 显示切换提示
    const filterText = {
      today: '今日',
      yesterday: '昨日',
      week: '本周',
      month: '本月'
    }
    wx.showToast({
      title: `已切换到${filterText[timeFilter]}`,
      icon: 'success',
      duration: 1000
    })
  },

  // 加载商品列表
  async loadProducts() {
    const mockProducts = [
      {
        _id: '1',
        name: '精美头像设计',
        image: 'https://via.placeholder.com/200',
        category: '头像设计',
        price: '88.00',
        status: 'online',
        isHot: true,
        isRecommend: true,
        isSpecial: false
      },
      {
        _id: '2',
        name: '创意插画作品',
        image: 'https://via.placeholder.com/200',
        category: '插画',
        price: '168.00',
        status: 'online',
        isHot: false,
        isRecommend: true,
        isSpecial: true
      },
      {
        _id: '3',
        name: '企业LOGO设计',
        image: 'https://via.placeholder.com/200',
        category: 'LOGO',
        price: '299.00',
        status: 'offline',
        isHot: false,
        isRecommend: false,
        isSpecial: false
      }
    ]
    
    this.setData({
      allProducts: mockProducts,
      products: mockProducts
    })
  },

  // 加载订单列表
  async loadOrders() {
    const mockOrders = [
      {
        _id: '1',
        orderNo: 'ORD202401250001',
        productName: '精美头像设计',
        productImage: 'https://via.placeholder.com/100',
        userName: '张三',
        userPhone: '138****1234',
        artistName: '画师A',
        amount: '88.00',
        status: 'paid',
        statusText: '已支付',
        createTime: '2024-01-25 10:30',
        deadline: '2024-02-01 10:30',
        isOverdue: false
      },
      {
        _id: '2',
        orderNo: 'ORD202401250002',
        productName: '创意插画作品',
        productImage: 'https://via.placeholder.com/100',
        userName: '李四',
        userPhone: '139****5678',
        artistName: '画师B',
        amount: '168.00',
        status: 'processing',
        statusText: '制作中',
        createTime: '2024-01-24 15:20',
        deadline: '2024-02-05 15:20',
        isOverdue: false
      },
      {
        _id: '3',
        orderNo: 'ORD202401240003',
        productName: '企业LOGO设计',
        productImage: 'https://via.placeholder.com/100',
        userName: '王五',
        userPhone: '137****9012',
        artistName: '画师C',
        amount: '299.00',
        status: 'processing',
        statusText: '制作中',
        createTime: '2024-01-20 09:15',
        deadline: '2024-01-24 09:15',
        isOverdue: true
      },
      {
        _id: '4',
        orderNo: 'ORD202401230004',
        productName: '卡通形象设计',
        productImage: 'https://via.placeholder.com/100',
        userName: '赵六',
        userPhone: '136****3456',
        artistName: '画师D',
        amount: '128.00',
        status: 'completed',
        statusText: '已完成',
        createTime: '2024-01-23 14:00',
        deadline: '2024-01-30 14:00',
        isOverdue: false
      }
    ]
    
    // 计算订单统计
    const orderStats = {
      all: mockOrders.length,
      unpaid: mockOrders.filter(o => o.status === 'unpaid').length,
      paid: mockOrders.filter(o => o.status === 'paid').length,
      processing: mockOrders.filter(o => o.status === 'processing').length,
      completed: mockOrders.filter(o => o.status === 'completed').length,
      refunding: mockOrders.filter(o => o.status === 'refunding').length,
      refunded: mockOrders.filter(o => o.status === 'refunded').length
    }
    
    this.setData({
      allOrders: mockOrders,
      orders: mockOrders,
      orderStats: orderStats
    })
  },

  // 加载画师列表
  async loadArtists() {
    const mockArtists = [
      {
        _id: '1',
        name: '画师小A',
        avatar: 'https://via.placeholder.com/100',
        level: 'S',
        joinTime: '2023-06-15',
        productCount: 15,
        orderCount: 89,
        totalRevenue: '8,960',
        status: 'active',
        statusText: '正常'
      },
      {
        _id: '2',
        name: '画师小B',
        avatar: 'https://via.placeholder.com/100',
        level: 'A',
        joinTime: '2023-08-20',
        productCount: 12,
        orderCount: 67,
        totalRevenue: '6,720',
        status: 'active',
        statusText: '正常'
      },
      {
        _id: '3',
        name: '画师小C',
        avatar: 'https://via.placeholder.com/100',
        level: 'B',
        joinTime: '2023-10-10',
        productCount: 8,
        orderCount: 45,
        totalRevenue: '4,500',
        status: 'active',
        statusText: '正常'
      }
    ]
    
    // 业绩排行（按收入排序）
    const performance = [...mockArtists].sort((a, b) => {
      return parseFloat(b.totalRevenue.replace(',', '')) - parseFloat(a.totalRevenue.replace(',', ''))
    })
    
    this.setData({
      artists: mockArtists,
      artistPerformance: performance
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
          createTime: '2024-01-25 14:30'
        },
        {
          _id: '2',
          name: '李四',
          phone: '139****5678',
          specialty: 'LOGO设计、品牌设计',
          portfolio: [
            'https://via.placeholder.com/200',
            'https://via.placeholder.com/200'
          ],
          createTime: '2024-01-24 10:15'
        }
      ]
    })
  },

  // 切换主标签
  switchMainTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 切换时间筛选
  switchTimeFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ timeFilter: filter })
    this.loadDashboard()
  },

  // 自定义日期范围
  customDateRange() {
    wx.showModal({
      title: '自定义日期',
      content: '请选择日期范围（日期选择器功能待完善）',
      showCancel: false
    })
  },

  // 切换图表类型
  switchChartType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ chartType: type })
  },

  // 切换画师标签
  switchArtistTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ artistTab: tab })
  },

  // 筛选商品
  filterProducts(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ productFilter: filter })
    
    if (filter === 'all') {
      this.setData({ products: this.data.allProducts })
    } else if (filter === 'online') {
      this.setData({ products: this.data.allProducts.filter(p => p.status === 'online') })
    } else if (filter === 'offline') {
      this.setData({ products: this.data.allProducts.filter(p => p.status === 'offline') })
    } else if (filter === 'hot') {
      this.setData({ products: this.data.allProducts.filter(p => p.isHot) })
    }
  },

  // 搜索商品
  searchProducts(e) {
    const keyword = e.detail.value.toLowerCase()
    if (!keyword) {
      this.setData({ products: this.data.allProducts })
      return
    }
    
    const filtered = this.data.allProducts.filter(p => 
      p.name.toLowerCase().includes(keyword) || 
      p.category.toLowerCase().includes(keyword)
    )
    this.setData({ products: filtered })
  },

  // 筛选订单
  filterOrders(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ orderFilter: filter })
    
    if (filter === 'all') {
      this.setData({ orders: this.data.allOrders })
    } else {
      const filtered = this.data.allOrders.filter(o => o.status === filter)
      this.setData({ orders: filtered })
    }
  },

  // 搜索订单
  searchOrders(e) {
    const keyword = e.detail.value.toLowerCase()
    if (!keyword) {
      this.setData({ orders: this.data.allOrders })
      return
    }
    
    const filtered = this.data.allOrders.filter(o => 
      o.orderNo.toLowerCase().includes(keyword) ||
      o.userName.toLowerCase().includes(keyword) ||
      o.productName.toLowerCase().includes(keyword)
    )
    this.setData({ orders: filtered })
  },

  // 导航方法
  goToOrders() {
    this.setData({ currentTab: 'order' })
  },

  goToRefunds() {
    this.setData({ currentTab: 'order', orderFilter: 'refunded' })
    this.filterOrders({ currentTarget: { dataset: { filter: 'refunded' } } })
  },

  goToUsers() {
    wx.navigateTo({
      url: '/pages/user-manage/index'
    })
  },

  goToArtists() {
    this.setData({ currentTab: 'artist' })
  },

  goToPendingOrders() {
    this.setData({ currentTab: 'order', orderFilter: 'paid' })
    this.filterOrders({ currentTarget: { dataset: { filter: 'paid' } } })
  },

  goToOverdueOrders() {
    this.setData({ currentTab: 'order' })
    const overdueOrders = this.data.allOrders.filter(o => o.isOverdue)
    this.setData({ orders: overdueOrders })
  },

  goToArtistApplications() {
    this.setData({ currentTab: 'artist', artistTab: 'applications' })
  },

  // 商品操作
  addProduct() {
    wx.navigateTo({
      url: '/pages/product-edit/index'
    })
  },

  editProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-edit/index?id=${id}`
    })
  },

  toggleProductStatus(e) {
    const { id, status } = e.currentTarget.dataset
    const action = status === 'online' ? '下架' : '上架'
    
    wx.showModal({
      title: `${action}商品`,
      content: `确认${action}此商品？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: `已${action}`, icon: 'success' })
          this.loadProducts()
        }
      }
    })
  },

  // 订单操作
  viewOrderDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    })
  },

  confirmOrder(e) {
    const id = e.currentTarget.dataset.id
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
    const id = e.currentTarget.dataset.id
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

  processRefund(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '处理退款',
      content: '确认退款给用户？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '退款已处理', icon: 'success' })
          this.loadOrders()
        }
      }
    })
  },

  exportOrders() {
    wx.showToast({ title: '导出功能开发中', icon: 'none' })
  },

  // 画师操作
  viewArtistDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/artist-detail/index?id=${id}`
    })
  },

  editArtist(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '编辑画师',
      content: '画师编辑功能（可跳转到画师详情页）',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: `/pages/artist-detail/index?id=${id}`
          })
        }
      }
    })
  },

  approveArtist(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '通过申请',
      content: '确认通过此画师申请？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已通过', icon: 'success' })
          this.loadApplications()
        }
      }
    })
  },

  rejectArtist(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '驳回申请',
      content: '确认驳回此画师申请？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已驳回', icon: 'success' })
          this.loadApplications()
        }
      }
    })
  },

  // 更多功能导航
  goToCategories() {
    wx.navigateTo({
      url: '/pages/category-manage/index'
    })
  },

  goToCustomerService() {
    wx.navigateTo({
      url: '/pages/service-qr-manage/index'
    })
  },

  goToStaff() {
    wx.navigateTo({
      url: '/pages/staff-manage/index'
    })
  },

  goToReports() {
    wx.navigateTo({
      url: '/pages/report/index'
    })
  },

  goToMedia() {
    wx.navigateTo({
      url: '/pages/media-library/index'
    })
  },

  goToBanners() {
    wx.navigateTo({
      url: '/pages/banner-manage/index'
    })
  },

  goToNotices() {
    wx.navigateTo({
      url: '/pages/notice-manage/index'
    })
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/system-settings/index'
    })
  }
})
