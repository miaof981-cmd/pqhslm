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
      processing: 0,
      completed: 0,
      refunding: 0
    },
    
    // 数据列表
    products: [],
    allProducts: [],
    orders: [],
    allOrders: [],
    artists: [],
    applications: [],
    artistPerformance: [],
    
    // 编辑画师弹窗
    showEditArtistModal: false,
    editingArtist: null
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
    // 从本地存储读取真实数据
    const allOrders = wx.getStorageSync('mock_orders') || []
    const allApplications = wx.getStorageSync('artist_applications') || []
    
    // 计算订单统计
    const orderCount = allOrders.length
    const processingOrders = allOrders.filter(o => o.status === 'processing' || o.status === 'paid')
    const completedOrders = allOrders.filter(o => o.status === 'completed')
    const refundingOrders = allOrders.filter(o => o.status === 'refunding' || o.status === 'refunded')
    
    // 计算总收入（已完成订单）
    const totalRevenue = completedOrders.reduce((sum, order) => {
      const price = parseFloat(order.totalPrice) || 0
      return sum + price
    }, 0)
    
    // 计算退款金额
    const refundAmount = refundingOrders.reduce((sum, order) => {
      const price = parseFloat(order.totalPrice) || 0
      return sum + price
    }, 0)
    
    // 计算画师数量
    const approvedArtists = allApplications.filter(app => app.status === 'approved')
    const artistCount = approvedArtists.length
    
    // 计算用户数量（从订单中去重买家）
    const uniqueBuyers = new Set(allOrders.map(o => o.buyerId || o.buyer))
    const buyerCount = uniqueBuyers.size
    
    // 计算待处理数量
    const pendingOrders = allOrders.filter(o => o.status === 'unpaid' || o.status === 'paid').length
    const pendingApplicationsCount = allApplications.filter(app => app.status === 'pending').length
    
    // 计算逾期订单（截止日期已过但未完成）
    const now = new Date()
    const overdueOrders = allOrders.filter(o => {
      if (o.status === 'completed' || o.status === 'refunded') return false
      if (!o.deadline) return false
      const deadline = new Date(o.deadline)
      return deadline < now
    }).length
    
    this.setData({
      dashboard: {
        orderCount: orderCount,
        orderTrend: '+0',
        buyerCount: buyerCount,
        buyerTrend: '+0',
        revenue: totalRevenue.toFixed(2),
        revenueTrend: '+0',
        refundCount: refundingOrders.length,
        refundAmount: refundAmount.toFixed(2),
        artistCount: artistCount,
        activeArtists: artistCount,
        userCount: buyerCount,
        newUsers: 0
      },
      pendingOrders: pendingOrders,
      overdueOrders: overdueOrders,
      pendingApplications: pendingApplicationsCount
    })
    
    console.log('仪表盘数据:', {
      订单总数: orderCount,
      总收入: totalRevenue,
      画师数: artistCount,
      买家数: buyerCount,
      待处理订单: pendingOrders,
      逾期订单: overdueOrders,
      待审核申请: pendingApplicationsCount
    })
  },

  // 加载商品列表
  async loadProducts() {
    // 从本地存储读取真实商品数据
    const allProducts = wx.getStorageSync('mock_products') || []
    
    // 转换为管理后台需要的格式
    const formattedProducts = allProducts.map(product => {
      // 计算显示价格
      let displayPrice = '0.00'
      if (product.basePrice) {
        displayPrice = parseFloat(product.basePrice).toFixed(2)
      } else if (product.spec && product.spec.length > 0) {
        // 找最低价格
        const prices = []
        product.spec.forEach(spec1 => {
          if (spec1.options) {
            spec1.options.forEach(opt1 => {
              const price1 = parseFloat(opt1.price) || 0
              if (spec1.subSpecs && spec1.subSpecs.length > 0) {
                spec1.subSpecs.forEach(spec2 => {
                  if (spec2.options) {
                    spec2.options.forEach(opt2 => {
                      const price2 = parseFloat(opt2.price) || 0
                      prices.push(price1 + price2)
                    })
                  }
                })
              } else {
                prices.push(price1)
              }
            })
          }
        })
        if (prices.length > 0) {
          displayPrice = Math.min(...prices).toFixed(2)
        }
      }
      
      return {
        _id: product.id,
        name: product.name || '未命名商品',
        image: (product.images && product.images[0]) || '',
        category: product.category || '未分类',
        price: displayPrice,
        status: product.onSale ? 'online' : 'offline',
        isHot: product.tags && product.tags.includes('hot'),
        isRecommend: product.tags && product.tags.includes('recommend'),
        isSpecial: product.tags && product.tags.includes('special'),
        deliveryDays: product.deliveryDays || 7
      }
    })
    
    console.log('加载商品列表:', formattedProducts.length, '个商品')
    
    this.setData({
      allProducts: formattedProducts,
      products: formattedProducts
    })
  },

  // 加载订单列表
  async loadOrders() {
    // 从本地存储读取真实订单数据
    const allOrders = wx.getStorageSync('mock_orders') || []
    
    // 状态文本映射
    const statusTextMap = {
      'unpaid': '待支付',
      'paid': '已支付',
      'processing': '制作中',
      'completed': '已完成',
      'refunding': '退款中',
      'refunded': '已退款'
    }
    
    // 转换为管理后台需要的格式
    const now = new Date()
    const formattedOrders = allOrders.map(order => {
      // 判断是否逾期
      let isOverdue = false
      if (order.deadline && (order.status === 'processing' || order.status === 'paid')) {
        const deadline = new Date(order.deadline)
        isOverdue = deadline < now
      }
      
      return {
        _id: order.id,
        orderNo: order.orderNo,
        productName: order.productName,
        productImage: order.productImage || '',
        userName: order.buyer || order.buyerName || '未知用户',
        userPhone: order.buyerPhone || '',
        artistName: order.artistName || '未知画师',
        amount: parseFloat(order.totalPrice || 0).toFixed(2),
        status: order.status,
        statusText: statusTextMap[order.status] || order.status,
        createTime: order.createTime,
        deadline: order.deadline,
        isOverdue: isOverdue,
        buyerId: order.buyerId,
        productId: order.productId,
        specs: order.specs || []
      }
    })
    
    // 计算订单统计
    const orderStats = {
      all: formattedOrders.length,
      unpaid: formattedOrders.filter(o => o.status === 'unpaid').length,
      processing: formattedOrders.filter(o => o.status === 'processing' || o.status === 'paid').length,
      completed: formattedOrders.filter(o => o.status === 'completed').length,
      refunding: formattedOrders.filter(o => o.status === 'refunding' || o.status === 'refunded').length
    }
    
    console.log('加载订单列表:', formattedOrders.length, '个订单', orderStats)
    
    this.setData({
      allOrders: formattedOrders,
      orders: formattedOrders,
      orderStats: orderStats
    })
  },

  // 加载画师列表
  async loadArtists() {
    // 从本地存储读取已通过的画师申请
    const allApplications = wx.getStorageSync('artist_applications') || []
    const approvedApplications = allApplications.filter(app => app.status === 'approved')
    
    // 读取所有商品和订单，用于统计画师数据
    const allProducts = wx.getStorageSync('mock_products') || []
    const allOrders = wx.getStorageSync('mock_orders') || []
    
    // 转换为画师列表
    const artists = approvedApplications.map(app => {
      // 统计该画师的商品数量（通过userId匹配）
      const artistProducts = allProducts.filter(p => p.artistId === app.userId)
      const productCount = artistProducts.length
      
      // 统计该画师的订单数量和总收入
      const artistOrders = allOrders.filter(o => o.artistId === app.userId || o.artistName === app.name)
      const orderCount = artistOrders.length
      const completedOrders = artistOrders.filter(o => o.status === 'completed')
      const totalRevenue = completedOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.totalPrice) || 0)
      }, 0)
      
      // 根据订单数量和收入评定等级
      let level = 'C'
      if (orderCount >= 50 && totalRevenue >= 5000) {
        level = 'S'
      } else if (orderCount >= 30 && totalRevenue >= 3000) {
        level = 'A'
      } else if (orderCount >= 10 && totalRevenue >= 1000) {
        level = 'B'
      }
      
      return {
        _id: app.userId,
        name: app.name,
        avatar: '', // 暂无头像
        level: level,
        joinTime: app.approveTime || app.submitTime,
        productCount: productCount,
        orderCount: orderCount,
        totalRevenue: totalRevenue.toFixed(2),
        status: 'active',
        statusText: '正常',
        wechat: app.wechat,
        age: app.age,
        idealPrice: app.idealPrice,
        minPrice: app.minPrice,
        userId: app.userId,
        openid: app.openid
      }
    })
    
    // 业绩排行（按收入排序）
    const performance = [...artists].sort((a, b) => {
      return parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue)
    })
    
    console.log('加载画师列表:', artists.length, '位画师')
    
    this.setData({
      artists: artists,
      artistPerformance: performance
    })
  },

  // 加载画师申请
  async loadApplications() {
    // 从本地存储读取真实的申请数据
    const allApplications = wx.getStorageSync('artist_applications') || []
    
    // 只显示待审核的申请
    const pendingApplications = allApplications.filter(app => app.status === 'pending')
    
    // 转换为管理后台需要的格式
    const formattedApplications = pendingApplications.map(app => ({
      _id: app.id,
      // 微信信息
      avatarUrl: app.avatarUrl || '',
      nickName: app.nickName || '未知用户',
      // 申请信息
      name: app.name,
      phone: app.wechat, // 使用微信号
      specialty: `年龄：${app.age}岁，理想稿酬：¥${app.idealPrice}，最低价格：¥${app.minPrice}`,
      portfolio: app.finishedWorks.slice(0, 4), // 最多显示4张作品
      createTime: app.submitTime,
      userId: app.userId,
      openid: app.openid,
      processImages: app.processImages
    }))
    
    console.log('加载申请列表:', formattedApplications)
    
    this.setData({
      applications: formattedApplications,
      pendingApplications: formattedApplications.length
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
    } else if (filter === 'processing') {
      // 制作中包含已支付和制作中状态
      const filtered = this.data.allOrders.filter(o => o.status === 'processing' || o.status === 'paid')
      this.setData({ orders: filtered })
    } else if (filter === 'refunding') {
      // 退款包含退款中和已退款
      const filtered = this.data.allOrders.filter(o => o.status === 'refunding' || o.status === 'refunded')
      this.setData({ orders: filtered })
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
    const artist = this.data.artists.find(a => a._id === id)
    if (artist) {
      this.setData({
        showEditArtistModal: true,
        editingArtist: { ...artist }
      })
    }
  },
  
  closeEditArtistModal() {
    this.setData({
      showEditArtistModal: false,
      editingArtist: null
    })
  },
  
  toggleArtistStatus() {
    const newStatus = this.data.editingArtist.status === 'normal' ? 'disabled' : 'normal'
    const newStatusText = newStatus === 'normal' ? '正常' : '已禁用'
    this.setData({
      'editingArtist.status': newStatus,
      'editingArtist.statusText': newStatusText
    })
  },
  
  // 管理画师的商品
  manageArtistProducts() {
    const artistId = this.data.editingArtist._id
    const artistName = this.data.editingArtist.name
    this.closeEditArtistModal()
    // 跳转到商品管理页，并筛选该画师的商品
    wx.navigateTo({
      url: `/pages/product-manage/index?artistId=${artistId}&artistName=${artistName}`
    })
  },
  
  // 全部上架/下架
  toggleAllProducts(e) {
    const action = e.currentTarget.dataset.action
    const actionText = action === 'online' ? '上架' : '下架'
    const artistName = this.data.editingArtist.name
    
    wx.showModal({
      title: `确认${actionText}`,
      content: `确认将 ${artistName} 的所有商品${actionText}？`,
      success: (res) => {
        if (res.confirm) {
          // 实际应调用后端API批量更新商品状态
          wx.showToast({
            title: `已全部${actionText}`,
            icon: 'success'
          })
          
          // 更新画师的商品数量统计
          if (action === 'offline') {
            this.setData({
              'editingArtist.productCount': 0
            })
          }
        }
      }
    })
  },
  
  saveArtistEdit() {
    const { editingArtist } = this.data
    // 实际应调用后端API保存
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
    
    // 更新列表中的画师数据
    const artists = this.data.artists.map(a => 
      a._id === editingArtist._id ? editingArtist : a
    )
    this.setData({
      artists: artists,
      showEditArtistModal: false,
      editingArtist: null
    })
  },

  // 查看申请详情
  viewApplicationDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/artist-application-detail/index?id=${id}`
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  approveArtist(e) {
    const id = e.currentTarget.dataset.id
    const application = this.data.applications.find(app => app._id === id)
    
    if (!application) {
      wx.showToast({ title: '申请不存在', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '通过申请',
      content: `确认通过 ${application.name} 的画师申请？`,
      success: (res) => {
        if (res.confirm) {
          // 更新申请状态
          let allApplications = wx.getStorageSync('artist_applications') || []
          const index = allApplications.findIndex(app => app.id === id)
          
          if (index !== -1) {
            allApplications[index].status = 'approved'
            allApplications[index].approveTime = new Date().toLocaleString('zh-CN')
            wx.setStorageSync('artist_applications', allApplications)
            
            // 给用户添加画师权限
            const userId = allApplications[index].userId
            
            // 如果是当前用户，立即更新权限
            const currentUserId = wx.getStorageSync('userId')
            if (userId === currentUserId) {
              let userRoles = wx.getStorageSync('userRoles') || ['customer']
              if (!userRoles.includes('artist')) {
                userRoles.push('artist')
                wx.setStorageSync('userRoles', userRoles)
                
                const app = getApp()
                app.globalData.userRoles = userRoles
              }
            }
            
            wx.showToast({ title: '已通过', icon: 'success' })
            
            // 重新加载申请列表
            setTimeout(() => {
              this.loadApplications()
            }, 500)
          }
        }
      }
    })
  },

  rejectArtist(e) {
    const id = e.currentTarget.dataset.id
    const application = this.data.applications.find(app => app._id === id)
    
    if (!application) {
      wx.showToast({ title: '申请不存在', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '驳回申请',
      content: `确认驳回 ${application.name} 的画师申请？`,
      success: (res) => {
        if (res.confirm) {
          // 更新申请状态
          let allApplications = wx.getStorageSync('artist_applications') || []
          const index = allApplications.findIndex(app => app.id === id)
          
          if (index !== -1) {
            allApplications[index].status = 'rejected'
            allApplications[index].rejectTime = new Date().toLocaleString('zh-CN')
            wx.setStorageSync('artist_applications', allApplications)
            
            wx.showToast({ title: '已驳回', icon: 'success' })
            
            // 重新加载申请列表
            setTimeout(() => {
              this.loadApplications()
            }, 500)
          }
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
