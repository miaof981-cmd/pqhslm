// 引入统一工具函数
const orderHelper = require('../../utils/order-helper.js')
const staffFinance = require('../../utils/staff-finance.js')  // 🎯 新增
const orderStatusUtil = require('../../utils/order-status.js')
const { computeVisualStatus } = require('../../utils/order-visual-status')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')
const { runOrderFlowDiagnostics } = require('../../utils/system-check.js')

function resolveOrderAmount(order) {
  return parseFloat(order.price || order.totalAmount || order.totalPrice || 0) || 0
}

function normalizeString(value) {
  if (value == null) return ''
  return String(value).trim()
}

function isPlaceholderServiceName(name) {
  const normalized = normalizeString(name)
  if (!normalized) return true
  const lower = normalized.toLowerCase()
  const placeholders = ['客服', '客服人员', '待分配', '未分配', 'customer service', 'service']
  return placeholders.some(keyword => lower === keyword || lower.includes(keyword))
}

Page({
  data: {
    loading: true,
    refunding: false,  // 🎯 退款处理中标志
    currentTab: 'dashboard',
    timeFilter: 'today',
    chartType: '7days',
    
    // 子标签
    artistTab: 'list',
    productFilter: 'all',
    orderFilter: 'all',
    alerts: [],
    alertBanner: null,
    blockingIssues: 0,
    orderFlowSummary: null,
    
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
    
    // 🎯 新增：管理员个人收入数据
    myIncome: {
      totalShare: '0.00',      // 总分成
      withdrawn: '0.00',       // 已提现
      available: '0.00',       // 可提现
      staffName: '',           // 管理员姓名
      staffRole: '',           // 管理员角色
      isStaff: false           // 是否为管理员
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
    // ✅ 修复：使用 userRoles 数组而不是 userRole
    const roles = wx.getStorageSync('userRoles') || ['customer']
    const hasAdminRole = Array.isArray(roles) && roles.indexOf('admin') !== -1
    
    console.log('🔐 检查管理员权限')
    console.log('  - 当前角色:', roles)
    console.log('  - 是否有管理员权限:', hasAdminRole)
    
    if (!hasAdminRole) {
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
    const allOrders = orderHelper.getAllOrders()
    const allApplications = wx.getStorageSync('artist_applications') || []
    
    // 🎯 加载管理员个人收入
    await this.loadMyIncome()
    
    // 🎯 根据时间筛选过滤订单
    const filteredOrders = this.filterOrdersByTime(allOrders)
    
    // 计算订单统计
    const orderCount = filteredOrders.length
    const processingStatuses = new Set(['processing', 'paid', 'inProgress', 'waitingConfirm', 'nearDeadline'])
    const processingOrders = filteredOrders.filter(o => processingStatuses.has(o.status))
    const completedOrders = filteredOrders.filter(o => o.status === 'completed')
    const refundingOrders = filteredOrders.filter(o => o.status === 'refunding' || o.status === 'refunded')
    
    // 计算总收入（已完成订单）
    const totalRevenue = completedOrders.reduce((sum, order) => {
      return sum + resolveOrderAmount(order)
    }, 0)
    
    // 计算退款金额
    const refundAmount = refundingOrders.reduce((sum, order) => {
      return sum + resolveOrderAmount(order)
    }, 0)
    
    // 计算画师数量
    const approvedArtists = allApplications.filter(app => app.status === 'approved')
    const artistCount = approvedArtists.length
    
    // 计算用户数量（从筛选后的订单中去重买家）
    const uniqueBuyers = new Set(filteredOrders.map(o => o.buyerId || o.buyer))
    const buyerCount = uniqueBuyers.size
    
    // 计算待处理数量（使用全部订单，不受时间筛选影响）
    const pendingStatuses = new Set(['unpaid', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline'])
    const pendingOrders = allOrders.filter(o => pendingStatuses.has(o.status)).length
    const pendingApplicationsCount = allApplications.filter(app => app.status === 'pending').length
    
    // 计算逾期订单（使用全部订单）
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
      时间筛选: this.data.timeFilter,
      订单总数: orderCount,
      总收入: totalRevenue,
      画师数: artistCount,
      买家数: buyerCount,
      待处理订单: pendingOrders,
      逾期订单: overdueOrders,
      待审核申请: pendingApplicationsCount
    })
  },

  // 🎯 新增：根据时间筛选过滤订单
  filterOrdersByTime(orders) {
    const timeFilter = this.data.timeFilter
    if (!timeFilter || timeFilter === 'all') return orders

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    
    return orders.filter(order => {
      const orderTime = new Date(order.createdAt || order.createTime || order.orderTime)
      if (isNaN(orderTime.getTime())) return false

      switch (timeFilter) {
        case 'today':
          // 今日：00:00 - 23:59
          return orderTime >= todayStart && orderTime <= todayEnd

        case 'yesterday':
          // 昨日
          const yesterdayStart = new Date(todayStart)
          yesterdayStart.setDate(yesterdayStart.getDate() - 1)
          const yesterdayEnd = new Date(todayEnd)
          yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)
          return orderTime >= yesterdayStart && orderTime <= yesterdayEnd

        case 'week':
          // 本周：本周一00:00 至今
          const weekStart = new Date(todayStart)
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // 本周一
          return orderTime >= weekStart && orderTime <= now

        case 'month':
          // 本月：本月1号00:00 至今
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
          return orderTime >= monthStart && orderTime <= now

        default:
          return true
      }
    })
  },

  // 加载商品列表
  async loadProducts() {
    // 从本地存储读取真实商品数据
    const allProducts = wx.getStorageSync('mock_products') || []
    
    // 获取所有用户信息（用于匹配画师名称）
    const allUsers = wx.getStorageSync('mock_users') || []
    const userMap = new Map()
    allUsers.forEach(user => {
      if (user && user.userId) {
        userMap.set(String(user.userId), user)
      }
    })

    const artistApplications = wx.getStorageSync('artist_applications') || []
    const artistMap = new Map()
    artistApplications.forEach(app => {
      if (app && app.userId) {
        artistMap.set(String(app.userId), app)
      }
    })
    
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
      
      // 🎯 优化：获取画师名称（优先级：申请信息 > 用户信息 > 商品自带名称）
      const artistId = product.artistId ? String(product.artistId) : ''
      let artistName = ''
      
      // 1. 优先从画师申请中获取
      if (artistId && artistMap.has(artistId)) {
        const application = artistMap.get(artistId)
        artistName = application.name || application.realName || ''
        if (artistName) {
          console.log(`✅ 从申请记录获取画师名称: ${artistName}`)
        }
      }
      
      // 2. 其次从用户信息中获取
      if (!artistName && artistId && userMap.has(artistId)) {
        const user = userMap.get(artistId)
        artistName = user.nickname || user.nickName || user.name || ''
        if (artistName) {
          console.log(`✅ 从用户信息获取画师名称: ${artistName}`)
        }
      }
      
      // 3. 最后使用商品自带的artistName（但过滤掉英文默认值）
      if (!artistName && product.artistName) {
        const productArtistName = String(product.artistName).trim()
        // 🎯 过滤掉英文默认值
        const isEnglishDefault = /^(unknown|artist\d+|user\d+|default)$/i.test(productArtistName)
        if (!isEnglishDefault && productArtistName.length > 0) {
          artistName = productArtistName
        }
      }
      
      // 4. 如果还是没有，显示"画师ID"
      if (!artistName) {
        artistName = artistId ? `画师${artistId}` : '未知画师'
      }
      
      // 生成规格信息摘要
      let specInfo = '无规格'
      if (product.spec && product.spec.length > 0) {
        const specNames = []
        product.spec.forEach(spec1 => {
          if (spec1.name) {
            specNames.push(spec1.name)
          }
          if (spec1.subSpecs && spec1.subSpecs.length > 0) {
            spec1.subSpecs.forEach(spec2 => {
              if (spec2.name) {
                specNames.push(spec2.name)
              }
            })
          }
        })
        if (specNames.length > 0) {
          specInfo = specNames.join('、')
          if (specInfo.length > 20) {
            specInfo = specInfo.substring(0, 20) + '...'
          }
        }
      }
      
      const coverImage = ensureRenderableImage(
        product.images && product.images.length > 0 ? product.images[0] : product.image,
        { namespace: 'product-cover', fallback: DEFAULT_PLACEHOLDER }
      )
      
      return {
        _id: product.id,
        name: product.name || '未命名商品',
        coverImage,
        image: coverImage,
        images: Array.isArray(product.images) ? product.images : [],
        category: product.category || '未分类',
        price: displayPrice,
        status: product.isOnSale !== false ? 'online' : 'offline',
        isHot: product.tags && product.tags.includes('hot'),
        isRecommend: product.tags && product.tags.includes('recommend'),
        isSpecial: product.tags && product.tags.includes('special'),
        deliveryDays: product.deliveryDays || 7,
        artistId: product.artistId,
        artistName: artistName,
        specInfo: specInfo,
        sales: product.sales || 0,
        stock: product.stock || 0,
        views: product.views || 0
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
    console.log('========================================')
    console.log('📦 [管理后台] 使用统一工具加载订单')
    console.log('========================================')
    
    // 🎯 使用统一工具函数获取并标准化订单（管理员看所有订单）
    let allOrders = orderHelper.prepareOrdersForPage({
      role: 'admin'
    })
    
    console.log('✅ 订单加载完成:', allOrders.length, '个')
    if (allOrders.length > 0) {
      console.log('订单示例:', {
        id: allOrders[0].id,
        status: allOrders[0].status,
        statusText: allOrders[0].statusText,
        serviceName: allOrders[0].serviceName,
        serviceAvatar: allOrders[0].serviceAvatar ? '有' : '无'
      })
    }
    
    // 🎯 智能排序（优先级 + 时间）
    allOrders = this.sortOrdersByPriority(allOrders)
    
    // 转换为管理后台需要的格式
    const formattedOrders = allOrders.map(order => {
      // ✅ 状态已由工具函数处理，直接使用
      
      // 格式化时间：只显示日期和时分
      const formatTime = (timestamp) => {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hour = date.getHours().toString().padStart(2, '0')
        const minute = date.getMinutes().toString().padStart(2, '0')
        return `${month}-${day} ${hour}:${minute}`
      }
      
      // 计算进度百分比和视觉状态
      const { statusKey, statusColor, progressPercent } = computeVisualStatus(order)
      console.log('VISUAL_STATUS_SAMPLE', order.id, { statusKey, statusColor, progressPercent })
      
      // 完整订单号
      const fullOrderNo = order.orderNumber || order.orderNo || order.id || ''
      
      return {
        _id: order.id,
        fullOrderNo: fullOrderNo,
        productName: order.productName,
        productImage: ensureRenderableImage(order.productImage, { namespace: 'order-product', fallback: DEFAULT_PLACEHOLDER }),
        userName: order.buyerName || order.buyer || '未知用户',
        userAvatar: order.buyerAvatar,
        userPhone: order.buyerPhone || '',
        artistName: order.artistName || '未分配',
        artistAvatar: order.artistAvatar,
        serviceName: order.serviceName || '未分配',
        serviceAvatar: order.serviceAvatar,
        amount: resolveOrderAmount(order).toFixed(2),
        status: order.status,
        statusText: order.statusText,
        createTime: formatTime(order.createdAt || order.createTime),
        deadline: order.deadline ? formatTime(order.deadline) : '',
        statusKey,
        statusColor,
        progressPercent: progressPercent,
        isOverdue: statusKey === 'overdue',
        isNearDeadline: statusKey === 'nearDeadline',
        wasOverdue: order.wasOverdue || false,
        buyerId: order.buyerId,
        productId: order.productId,
        specs: order.specs || []
      }
    })
    
    // 计算订单统计
    const processingSet = new Set(['processing', 'paid', 'inProgress', 'waitingConfirm', 'nearDeadline'])
    const refundingSet = new Set(['refunding', 'refunded'])

    const orderStats = {
      all: formattedOrders.length,
      unpaid: formattedOrders.filter(o => o.status === 'unpaid').length,
      processing: formattedOrders.filter(o => processingSet.has(o.status)).length,
      completed: formattedOrders.filter(o => o.status === 'completed').length,
      refunding: formattedOrders.filter(o => refundingSet.has(o.status)).length
    }
    
    console.log('加载订单列表:', formattedOrders.length, '个订单', orderStats)
    
    this.setData({
      allOrders: formattedOrders,
      orderStats: orderStats
    })

    // 🎯 应用当前筛选条件（确保刷新后保持筛选状态）
    this.applyCurrentOrderFilter()

    this.collectAlerts()
  },

  // 🎯 新增：应用当前订单筛选
  applyCurrentOrderFilter() {
    const filter = this.data.orderFilter
    const allOrders = this.data.allOrders

    if (filter === 'all') {
      this.setData({ orders: allOrders })
    } else if (filter === 'processing') {
      const processingSet = new Set(['processing', 'paid', 'inProgress', 'waitingConfirm', 'nearDeadline'])
      const filtered = allOrders.filter(o => processingSet.has(o.status))
      this.setData({ orders: filtered })
    } else if (filter === 'refunding') {
      const filtered = allOrders.filter(o => o.status === 'refunding' || o.status === 'refunded')
      this.setData({ orders: filtered })
    } else {
      const filtered = allOrders.filter(o => o.status === filter)
      this.setData({ orders: filtered })
    }
  },

  // 加载画师列表
  async loadArtists() {
    // 从本地存储读取已通过的画师申请
    const allApplications = wx.getStorageSync('artist_applications') || []
    const approvedApplications = allApplications.filter(app => app.status === 'approved')
    
    // 读取所有商品和订单，用于统计画师数据
    const allProducts = wx.getStorageSync('mock_products') || []
    const allOrders = orderHelper.getAllOrders()
    
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
      
      // 获取用户头像和昵称
      const currentUserId = wx.getStorageSync('userId')
      let avatar = ''
      let nickname = app.name
      
      // 如果是当前用户，优先使用微信头像
      if (String(app.userId) === String(currentUserId)) {
        const wxUserInfo = wx.getStorageSync('wxUserInfo') || {}
        if (wxUserInfo.avatarUrl || wxUserInfo.avatar) {
          avatar = wxUserInfo.avatarUrl || wxUserInfo.avatar
          nickname = wxUserInfo.nickName || wxUserInfo.nickname || app.name
        }
        // 如果 wxUserInfo 为空，尝试从申请记录读取
        if (!avatar && (app.avatar || app.avatarUrl)) {
          avatar = app.avatar || app.avatarUrl
        }
      } else {
  // 其他画师，尝试从申请记录读取头像
  // 兼容两种字段名：avatar 和 avatarUrl
  if (app.avatar || app.avatarUrl) {
    avatar = app.avatar || app.avatarUrl
  }
  // 使用申请时填写的姓名
  nickname = app.name
}
      
      // 如果还是没有头像，使用默认SVG头像（绿色背景 + "画"字）
      if (!avatar) {
        avatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlLs8L3RleHQ+PC9zdmc+'
      }
      
      // 检查是否已有画师编号
      let artistNumber = app.artistNumber
      if (!artistNumber) {
        // 自动分配画师编号（基于申请通过的顺序）
        const approvedApps = approvedApplications.filter(a => a.artistNumber)
        const maxNumber = approvedApps.length > 0 ? Math.max(...approvedApps.map(a => parseInt(a.artistNumber) || 0)) : 0
        artistNumber = null // 未开通权限前不分配编号
      }
      
      // 读取画师档案（联系方式）
      const artistProfiles = wx.getStorageSync('artist_profiles') || {}
      const profile = artistProfiles[app.userId] || {}
      
      // 检查是否已开通工作台权限
      const userRoles = wx.getStorageSync('userRoles') || []
      const hasPermission = (app.userId === wx.getStorageSync('userId')) && userRoles.includes('artist')
      
      return {
        _id: app.userId,
        name: nickname,
        avatar: avatar,
        realName: app.realName || app.name,
        artistNumber: artistNumber,
        joinTime: app.approveTime || app.submitTime,
        productCount: productCount,
        orderCount: orderCount,
        totalRevenue: totalRevenue.toFixed(2),
        status: 'active',
        statusText: '正常',
        // 联系方式
        contactPhone: profile.contactPhone,
        wechat: profile.contactWechat || app.wechat,
        emergencyName: profile.emergencyName,
        emergencyRelation: profile.emergencyRelation,
        emergencyPhone: profile.emergencyPhone,
        // 其他信息
        age: app.age,
        idealPrice: app.idealPrice,
        minPrice: app.minPrice,
        userId: app.userId,
        openid: app.openid,
        hasPermission: hasPermission
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
      const processingSet = new Set(['processing', 'paid', 'inProgress', 'waitingConfirm', 'nearDeadline'])
      const filtered = this.data.allOrders.filter(o => processingSet.has(o.status))
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
    
    const filtered = this.data.allOrders.filter(o => {
      const orderNo = (o.orderNo || '').toLowerCase()
      const userName = (o.userName || '').toLowerCase()
      const productName = (o.productName || '').toLowerCase()
      return orderNo.includes(keyword) || userName.includes(keyword) || productName.includes(keyword)
    })
    this.setData({ orders: filtered })
  },

  // 🎯 加载管理员个人收入
  async loadMyIncome() {
    const userId = wx.getStorageSync('userId')
    if (!userId) {
      this.setData({
        'myIncome.isStaff': false
      })
      return
    }

    const staffList = staffFinance.getStaffList()
    const staff = staffList.find(s => String(s.userId) === String(userId))
    
    console.log('🔍 检查管理员身份:', {
      userId,
      找到管理员: !!staff,
      管理员信息: staff
    })
    
    if (staff && staff.isActive !== false) {
      // 计算收入
      const totalShare = staffFinance.computeIncomeByUserId(userId)
      const withdrawRecords = wx.getStorageSync('withdraw_records') || []
      const withdrawn = withdrawRecords
        .filter(r => String(r.userId) === String(userId) && r.status === 'success')
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
      
      const available = Math.max(0, totalShare - withdrawn)
      
      this.setData({
        myIncome: {
          totalShare: totalShare.toFixed(2),
          withdrawn: withdrawn.toFixed(2),
          available: available.toFixed(2),
          staffName: staff.name || '管理员',
          staffRole: staff.roleType || '',
          isStaff: true
        }
      })
      
      console.log('💰 管理员收入统计:', {
        姓名: staff.name,
        总分成: totalShare,
        已提现: withdrawn,
        可提现: available
      })
    } else {
      this.setData({
        'myIncome.isStaff': false
      })
      console.log('❌ 当前用户不是管理员或已停用')
    }
  },

  // 🎯 跳转到提现页面
  goToWithdraw() {
    wx.navigateTo({
      url: '/pages/withdraw/index'
    })
  },

  // 导航方法
  goToOrders() {
    this.setData({ currentTab: 'order' })
  },

  goToRefunds() {
    this.setData({ currentTab: 'order', orderFilter: 'refunded' })
    this.filterOrders({ currentTarget: { dataset: { filter: 'refunded' } } })
  },

  collectAlerts() {
    const alerts = []
    const { issues, summary } = runOrderFlowDiagnostics()
    if (Array.isArray(issues) && issues.length > 0) {
      issues.forEach(issue => {
        alerts.push({
          id: issue.id,
          level: issue.level || 'warning',
          title: issue.title || '系统提示',
          message: issue.message || ''
        })
      })
    }

    const orders = this.data.allOrders || []
    const meaningfulStatuses = new Set(['created', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline', 'refunding'])
    const pendingAllocationOrders = orders.filter(order => {
      if (!order) return false
      if (!meaningfulStatuses.has(order.status)) return false

      const statusText = String(order.serviceStatus || '').toLowerCase()
      const needsService = order.needsService === true

      const serviceId = normalizeString(order.serviceId)
      const serviceName = normalizeString(order.serviceName)
      const serviceMissing = !serviceId && ( !serviceName || isPlaceholderServiceName(serviceName) )

      return statusText === 'pending' || needsService || serviceMissing
    })

    if (pendingAllocationOrders.length > 0) {
      alerts.push({
        id: 'orders-needing-service',
        level: 'warning',
        title: '存在待分配客服的订单',
        message: `共有 ${pendingAllocationOrders.length} 笔订单等待分配客服，请尽快在「客服工作台」或订单详情中处理。`
      })
    }

    const blockingCount = alerts.filter(alert => alert && alert.level === 'error').length
    let alertBanner = null
    if (alerts.length > 0) {
      if (blockingCount > 0) {
        alertBanner = {
          variant: 'critical',
          icon: '🆘',
          title: '下单流程存在阻断项',
          description: `共有 ${blockingCount} 个关键阻断项需要立即处理，建议优先检查客服、画师和商品配置。`
        }
      } else {
        alertBanner = {
          variant: 'warning',
          icon: '🔔',
          title: '下单流程存在待处理事项',
          description: '当前存在需要关注的配置问题，请尽快处理以避免影响买家体验。'
        }
      }
    }

    this.setData({ 
      alerts,
      alertBanner,
      blockingIssues: blockingCount,
      orderFlowSummary: summary || null
    })
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

  // 跳转到审核管理页面
  goToReviewManage() {
    wx.navigateTo({
      url: '/pages/review-manage/index'
    })
  },

  // 商品操作
  addProduct() {
    // 获取所有画师列表
    const allUsers = wx.getStorageSync('mock_users') || []
    const artists = allUsers.filter(u => u.roles && u.roles.includes('artist'))
    
    if (artists.length === 0) {
      wx.showModal({
        title: '提示',
        content: '当前没有画师，请先审核画师申请',
        showCancel: false
      })
      return
    }
    
    // 准备画师列表
    const itemList = artists.map(a => 
      `${a.nickname || `用户${a.userId}`} (ID: ${a.userId})`
    )
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedArtist = artists[res.tapIndex]
        // 跳转到商品编辑页，传入画师ID
        wx.navigateTo({
          url: `/pages/product-edit/index?artistId=${selectedArtist.userId}`
        })
      }
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
    const newStatus = status === 'online' ? false : true
    
    wx.showModal({
      title: `${action}商品`,
      content: `确认${action}此商品？`,
      success: (res) => {
        if (res.confirm) {
          // 更新本地存储
          const allProducts = wx.getStorageSync('mock_products') || []
          const productIndex = allProducts.findIndex(p => (p.id || p._id) === id)
          
          if (productIndex !== -1) {
            allProducts[productIndex].isOnSale = newStatus
            wx.setStorageSync('mock_products', allProducts)
            
            wx.showToast({ 
              title: `已${action}`, 
              icon: 'success' 
            })
            
            // 重新加载商品列表
            this.loadProducts()
          } else {
            wx.showToast({
              title: '商品不存在',
              icon: 'none'
            })
          }
        }
      }
    })
  },
  
  // 删除商品
  deleteProduct(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确认删除该商品？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 从本地存储删除
          let allProducts = wx.getStorageSync('mock_products') || []
          allProducts = allProducts.filter(p => (p.id || p._id) !== id)
          wx.setStorageSync('mock_products', allProducts)
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
          
          // 重新加载
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

  // 复制订单号
  copyOrderNo(e) {
    const orderNo = e.currentTarget.dataset.orderno
    
    wx.setClipboardData({
      data: orderNo,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success',
          duration: 1500
        })
        console.log('✅ 订单号已复制:', orderNo)
      },
      fail: (err) => {
        console.error('❌ 复制失败:', err)
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 复制群名
  copyGroupName(e) {
    const order = e.currentTarget.dataset.order
    if (!order) return

    // 获取订单号后四位
    const orderId = order.fullOrderNo || order.orderNumber || order._id || ''
    const last4Digits = orderId.toString().slice(-4)

    // 获取截稿日期（格式：x月x日）
    let deadlineText = ''
    if (order.deadline) {
      const deadlineDate = new Date(order.deadline)
      const month = deadlineDate.getMonth() + 1
      const day = deadlineDate.getDate()
      deadlineText = `${month}月${day}日`
    }

    // 获取商品名
    const productName = order.productName || '商品'

    // 生成群名：【联盟xxxx】x月x日出商品名
    const groupName = `【联盟${last4Digits}】${deadlineText}出${productName}`

    wx.setClipboardData({
      data: groupName,
      success: () => {
        wx.showToast({
          title: '群名已复制',
          icon: 'success'
        })
      }
    })
  },

  // 更换客服
  changeService(e) {
    const orderId = e.currentTarget.dataset.id
    const serviceList = wx.getStorageSync('service_list') || []
    const activeServices = serviceList.filter(s => s.isActive)

    if (activeServices.length === 0) {
      wx.showToast({
        title: '暂无可用客服',
        icon: 'none'
      })
      return
    }

    // 准备客服列表
    const itemList = activeServices.map(s => 
      `${s.serviceNumber}号 - ${s.name}`
    )

    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedService = activeServices[res.tapIndex]
        this.doChangeService(orderId, selectedService)
      }
    })
  },

  // 执行更换客服
  doChangeService(orderId, service) {
    // 同时从两个存储源读取
    let ordersFromOrders = wx.getStorageSync('orders') || []
    let ordersFromPending = wx.getStorageSync('pending_orders') || []
    
    // 先在 pending_orders 中查找
    const pendingIndex = ordersFromPending.findIndex(o => o.id === orderId)
    if (pendingIndex !== -1) {
      ordersFromPending[pendingIndex].serviceId = service.userId
      ordersFromPending[pendingIndex].serviceName = service.name
      ordersFromPending[pendingIndex].serviceAvatar = service.avatar
      ordersFromPending[pendingIndex].serviceQrcodeUrl = service.qrcodeUrl
      ordersFromPending[pendingIndex].serviceQrcodeNumber = service.qrcodeNumber
      wx.setStorageSync('pending_orders', ordersFromPending)
    }
    
    // 再在 orders 中查找（如果存在）
    const orderIndex = ordersFromOrders.findIndex(o => o.id === orderId)
    if (orderIndex !== -1) {
      ordersFromOrders[orderIndex].serviceId = service.userId
      ordersFromOrders[orderIndex].serviceName = service.name
      ordersFromOrders[orderIndex].serviceAvatar = service.avatar
      ordersFromOrders[orderIndex].serviceQrcodeUrl = service.qrcodeUrl
      ordersFromOrders[orderIndex].serviceQrcodeNumber = service.qrcodeNumber
      wx.setStorageSync('orders', ordersFromOrders)
    }

    if (pendingIndex === -1 && orderIndex === -1) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }

    console.log('✅ 订单客服已更换:')
    console.log('  - 订单ID:', orderId)
    console.log('  - 新客服:', service.name)
    console.log('  - 客服编号:', service.serviceNumber)

    wx.showToast({
      title: `已分配给${service.name}`,
      icon: 'success'
    })

    // 刷新订单列表
    this.loadOrders()
  },

  // 发起退款（管理员/客服）
  initiateRefund(e) {
    const orderId = e.currentTarget.dataset.id
    
    // 🎯 防止重复点击
    if (this.data.refunding) {
      wx.showToast({
        title: '正在处理中...',
        icon: 'none'
      })
      return
    }
    
    // 查找订单获取金额
    const allOrders = orderHelper.getAllOrders()
    const order = allOrders.find(o => o.id === orderId)
    
    if (!order) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }
    
    if (order.status === 'refunded') {
      wx.showToast({
        title: '订单已退款',
        icon: 'none'
      })
      return
    }
    
    const amount = parseFloat(order.price || order.totalAmount || order.totalPrice || 0)
    const amountText = amount > 0 ? `¥${amount.toFixed(2)}` : '该订单金额'
    
    wx.showModal({
      title: '⚠️ 管理员退款确认',
      content: `请仔细核对退款信息：\n\n订单编号：${orderId}\n退款金额：${amountText}\n\n确认后将立即退款，操作不可撤销！`,
      confirmText: '确认退款',
      confirmColor: '#FF5722',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doRefund(orderId, amount, order)
        }
      }
    })
  },

  // 执行退款
  doRefund(orderId, refundAmount, orderInfo) {
    // 🎯 设置退款中标志
    this.setData({ refunding: true })
    
    wx.showLoading({ title: '退款处理中...', mask: true })
    
    // 同时从两个存储源读取
    let ordersFromOrders = wx.getStorageSync('orders') || []
    let ordersFromPending = wx.getStorageSync('pending_orders') || []
    const timestamp = new Date().toISOString()
    
    const refundData = {
      status: 'refunded',
      statusText: '已退款',
      refundStatus: 'refunded',
      refundAmount: refundAmount || orderInfo?.price || 0,
      refundTime: timestamp,
      refundCompletedAt: timestamp,
      refundHistory: [
        ...(orderInfo?.refundHistory || []),
        {
          status: 'refunded',
          operator: 'admin',
          operatorId: wx.getStorageSync('userId'),
          time: timestamp,
          amount: refundAmount || orderInfo?.price || 0,
          note: '管理员执行退款'
        }
      ]
    }
    
    // 先在 pending_orders 中查找
    const pendingIndex = ordersFromPending.findIndex(o => o.id === orderId)
    if (pendingIndex !== -1) {
      ordersFromPending[pendingIndex] = orderHelper.mergeOrderRecords(
        ordersFromPending[pendingIndex],
        refundData
      )
      wx.setStorageSync('pending_orders', ordersFromPending)
    }
    
    // 再在 orders 中查找（如果存在）
    const orderIndex = ordersFromOrders.findIndex(o => o.id === orderId)
    if (orderIndex !== -1) {
      ordersFromOrders[orderIndex] = orderHelper.mergeOrderRecords(
        ordersFromOrders[orderIndex],
        refundData
      )
      wx.setStorageSync('orders', ordersFromOrders)
    }

    if (pendingIndex === -1 && orderIndex === -1) {
      wx.hideLoading()
      this.setData({ refunding: false })
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }

    console.log('✅ 订单已退款:')
    console.log('  - 订单ID:', orderId)
    console.log('  - 退款金额:', refundAmount)
    console.log('  - 退款时间:', new Date().toLocaleString())

    // 🎯 延迟500ms后刷新
    setTimeout(() => {
      wx.hideLoading()
      this.setData({ refunding: false })
      
      wx.showToast({
        title: '退款成功',
        icon: 'success'
      })
      
      // 刷新订单列表
      this.loadOrders()
    }, 500)
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

  // 🎯 按优先级和时间排序订单
  sortOrdersByPriority(orders) {
    return orders.sort((a, b) => {
      // 定义优先级权重（数字越大，优先级越高）
      const priorityMap = {
        'overdue': 4,        // 最高：已拖稿
        'waitingConfirm': 3, // 第二：待确认
        'nearDeadline': 2,   // 第三：临近截稿
        'inProgress': 1,     // 第四：进行中
        'completed': 0       // 最低：已完成
      }
      
      const priorityA = priorityMap[a.status] || 0
      const priorityB = priorityMap[b.status] || 0
      
      // 1. 先按优先级排序
      if (priorityA !== priorityB) {
        return priorityB - priorityA // 降序：优先级高的在前
      }
      
      // 2. 同优先级，按时间排序
      // 已完成的按完成时间倒序（新完成的在前）
      if (a.status === 'completed' && b.status === 'completed') {
        const timeA = new Date(a.completedAt || a.createTime).getTime()
        const timeB = new Date(b.completedAt || b.createTime).getTime()
        return timeB - timeA
      }
      
      // 其他状态按创建时间倒序（新订单在前）
      const timeA = new Date(a.createTime).getTime()
      const timeB = new Date(b.createTime).getTime()
      return timeB - timeA
    })
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
  
  // 开通画师权限
  grantArtistPermission() {
    const artist = this.data.editingArtist
    
    wx.showModal({
      title: '确认开通权限',
      content: `确认为画师"${artist.name}"开通工作台权限？\n\n开通后将自动分配画师编号`,
      success: (res) => {
        if (res.confirm) {
          // 查找已分配的最大编号
          const allApplications = wx.getStorageSync('artist_applications') || []
          const approvedApps = allApplications.filter(app => app.status === 'approved' && app.artistNumber)
          const maxNumber = approvedApps.length > 0 ? 
            Math.max(...approvedApps.map(a => parseInt(a.artistNumber) || 0)) : 0
          const newArtistNumber = (maxNumber + 1).toString()
          
          // 保存画师编号到申请记录
          const appIndex = allApplications.findIndex(app => app.userId === artist.userId)
          if (appIndex !== -1) {
            allApplications[appIndex].artistNumber = newArtistNumber
            wx.setStorageSync('artist_applications', allApplications)
          }
          
          // 标记权限已开通（保存到申请记录）
          if (appIndex !== -1) {
            allApplications[appIndex].permissionGranted = true
            allApplications[appIndex].permissionGrantedTime = new Date().toISOString()
            wx.setStorageSync('artist_applications', allApplications)
          }
          
          // 如果是当前用户，立即更新本地权限
          if (artist.userId === wx.getStorageSync('userId')) {
            const app = getApp()
            let userRoles = wx.getStorageSync('userRoles') || ['customer']
            if (!userRoles.includes('artist')) {
              userRoles.push('artist')
              wx.setStorageSync('userRoles', userRoles)
              app.globalData.roles = userRoles
              
              console.log('✅ 当前用户权限已更新:', userRoles)
            }
          } else {
            console.log('⚠️ 这是其他用户，权限已标记，待其登录时生效')
          }
          
          // 更新当前编辑的画师信息，直接刷新显示
          this.setData({
            'editingArtist.artistNumber': newArtistNumber,
            'editingArtist.hasPermission': (artist.userId === wx.getStorageSync('userId'))
          })
          
          // 显示简短提示
          const wechatId = `联盟id${newArtistNumber}${artist.realName || artist.name}`
          wx.showToast({
            title: `权限已开通\n画师编号：${newArtistNumber}`,
            icon: 'none',
            duration: 2000
          })
          
          // 刷新画师列表（不关闭弹窗）
          this.loadArtists()
        }
      }
    })
  },
  
  // 复制企业微信ID格式
  copyWechatId(e) {
    const wechatId = e.currentTarget.dataset.id
    
    wx.setClipboardData({
      data: wechatId,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success',
          duration: 1500
        })
      }
    })
  },
  
  // 撤销画师权限
  revokeArtistPermission() {
    const artist = this.data.editingArtist
    
    wx.showModal({
      title: '确认撤销权限',
      content: `确认撤销画师"${artist.name}"的工作台权限？\n\n撤销后：\n• 该画师变为普通用户\n• 无法访问工作台\n• 可以重新提交画师申请\n• 画师编号会保留`,
      confirmText: '确认撤销',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 如果是当前用户，撤销权限
          if (artist.userId === wx.getStorageSync('userId')) {
            const app = getApp()
            let userRoles = wx.getStorageSync('userRoles') || []
            // 移除 artist 角色，保留其他角色（如 admin）
            userRoles = userRoles.filter(role => role !== 'artist')
            // 如果没有其他角色，设置为普通用户
            if (userRoles.length === 0 || !userRoles.includes('customer')) {
              userRoles.push('customer')
            }
            wx.setStorageSync('userRoles', userRoles)
            app.globalData.roles = userRoles
          }
          
          wx.showToast({
            title: '已撤销权限，已变为普通用户',
            icon: 'none',
            duration: 2000
          })
          
          // 关闭弹窗并刷新
          this.closeEditArtistModal()
          this.loadArtists()
        }
      }
    })
  },
  
  closeEditArtistModal() {
    this.setData({
      showEditArtistModal: false,
      editingArtist: null
    })
  },
  
  // 阻止事件冒泡（防止弹窗内部点击导致关闭）
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },
  
  // 管理画师的商品
  manageArtistProducts() {
    const artist = this.data.editingArtist
    // 跳转到画师商品管理页面
    wx.navigateTo({
      url: `/pages/artist-products-manage/index?artistId=${artist.userId}`
    })
  },
  
  // 切换商品销售状态
  toggleProductsStatus(e) {
    const checked = e.detail.value // true=正常销售, false=全部下架
    const artist = this.data.editingArtist
    const isOffline = !checked
    
    if (isOffline) {
      // 关闭开关 -> 下架全部商品
      wx.showModal({
        title: '确认下架全部商品',
        content: `确认下架画师"${artist.name}"的全部商品？\n\n下架后：\n• 商品不会显示在商城\n• 无法被购买（包括购物车中的）\n• 画师仍可处理现有订单\n\n此操作通常用于惩罚违规画师`,
        confirmText: '确认下架',
        confirmColor: '#FF6B6B',
        success: (res) => {
          if (res.confirm) {
            this.setData({ 'editingArtist.allProductsOffline': true })
            // TODO: 调用后端API批量下架商品
            wx.showToast({ title: '已下架全部商品', icon: 'success' })
            this.loadArtists()
          } else {
            // 取消操作，恢复开关状态
            this.setData({ 'editingArtist.allProductsOffline': false })
          }
        }
      })
    } else {
      // 打开开关 -> 恢复销售
      wx.showModal({
        title: '确认恢复销售',
        content: `确认恢复画师"${artist.name}"的商品销售？\n\n恢复后，画师可以重新上架商品`,
        success: (res) => {
          if (res.confirm) {
            this.setData({ 'editingArtist.allProductsOffline': false })
            // TODO: 调用后端API恢复商品销售
            wx.showToast({ title: '已恢复销售', icon: 'success' })
            this.loadArtists()
          } else {
            // 取消操作，恢复开关状态
            this.setData({ 'editingArtist.allProductsOffline': true })
          }
        }
      })
    }
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

  // ✅ 新增：跳转到工作人员二维码管理
  goToStaffQRCode() {
    wx.navigateTo({
      url: '/pages/staff-qrcode-manage/index'
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

  // ❌ 已废弃：使用 computeVisualStatus 替代
  // calculateProgressPercent(order) {
  //   // 此函数已被 utils/order-visual-status.js 中的 computeVisualStatus 替代
  //   // 请勿再调用此函数
  // }
})
