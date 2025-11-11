// 引入统一工具函数
const orderHelper = require('../../utils/order-helper')
const orderStatusUtil = require('../../utils/order-status')
const { computeVisualStatus } = require('../../utils/order-visual-status')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper')
const { buildGroupName } = require('../../utils/group-helper')
const { runOrderFlowDiagnostics } = require('../../utils/system-check')
const staffFinance = require('../../utils/staff-finance')
const productSales = require('../../utils/product-sales')

/**
 * 🔧 iOS兼容的日期解析函数
 * 将 "yyyy-MM-dd HH:mm:ss" 转换为 "yyyy/MM/dd HH:mm:ss" 以兼容iOS
 * @param {string} dateStr - 日期字符串
 * @returns {Date} Date 对象
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date()
  // iOS 不支持 "yyyy-MM-dd HH:mm:ss" 格式（中间有空格）
  // 必须将 - 替换为 / 或使用 T 连接
  const iosCompatibleDate = String(dateStr).replace(/-/g, '/')
  return new Date(iosCompatibleDate)
}

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
    orderLoading: false,  // 🎯 订单列表独立加载状态
    orderInFlight: false,  // 🎯 新增：订单加载互斥锁（防重复调用）
    refunding: false,  // 🎯 退款处理中标志
    fromDashboard: false,  // 🎯 标记是否从仪表盘跳转而来
    currentTab: 'dashboard',
    timeFilter: 'today',
    chartType: '7days',
    
    // 子标签
    artistTab: 'list',
    productFilter: 'all',
    orderFilter: 'all',  // 🎯 关键：订单筛选状态（必须初始化为'all'）
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
      refunded: 0  // 🎯 改名：退款中 → 已退款
    },
    
    // 数据列表（关键：orders 永远是数组，不允许 null/undefined）
    products: [],
    allProducts: [],
    orders: [],  // 🎯 关键：初始化为空数组，确保WXML判断正确
    allOrders: [],
    artists: [],
    applications: [],
    artistPerformance: [],
    artistRanking: [],  // 🎯 新增：画师排行榜数据
    rankingType: 'order',  // 🎯 新增：排行榜类型（order/revenue/rate）
    
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
    const processingStatuses = new Set(['unpaid', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline'])
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
      // 🔧 iOS兼容：使用parseDate函数
      const deadline = parseDate(o.deadline)
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
    
    // 🎯 详细统计待处理订单的状态分布
    const unpaidOrdersCount = allOrders.filter(o => o.status === 'unpaid').length
    const paidOrdersCount = allOrders.filter(o => o.status === 'paid').length
    const processingOrdersCount = allOrders.filter(o => o.status === 'processing' || o.status === 'inProgress').length
    const waitingOrdersCount = allOrders.filter(o => o.status === 'waitingConfirm').length
    const nearDeadlineOrdersCount = allOrders.filter(o => o.status === 'nearDeadline').length
    
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
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 待处理订单详细分布:')
    console.log(`  待支付: ${unpaidOrders}个`)
    console.log(`  已支付: ${paidOrders}个`)
    console.log(`  制作中: ${processingOrders}个`)
    console.log(`  待确认: ${waitingOrders}个`)
    console.log(`  临近截稿: ${nearDeadlineOrders}个`)
    console.log(`  总计: ${pendingOrders}个`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💡 说明: 待处理订单 = 待支付 + 制作中')
    console.log('   用户端"制作中"不包含待支付订单')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  },

  // 🎯 新增：根据时间筛选过滤订单
  filterOrdersByTime(orders) {
    const timeFilter = this.data.timeFilter
    if (!timeFilter || timeFilter === 'all') return orders

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    
    return orders.filter(order => {
      // 🔧 iOS兼容：使用parseDate函数解析订单时间
      const orderTime = parseDate(order.createdAt || order.createTime || order.orderTime)
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
      
      // 🎯 优化：获取画师名称和编号（优先级：申请信息 > 用户信息 > 商品自带名称）
      const artistId = product.artistId ? String(product.artistId) : ''
      let artistName = ''
      let artistNumber = '' // 🎯 画师独立编号
      
      // 1. 优先从画师申请中获取（同时获取编号）
      if (artistId && artistMap.has(artistId)) {
        const application = artistMap.get(artistId)
        artistName = application.name || application.realName || ''
        artistNumber = application.artistNumber || '' // 🎯 获取画师编号
        if (artistName) {
          console.log(`✅ 从申请记录获取: 名称=${artistName}, 编号=${artistNumber}`)
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
      
      // 4. 如果还是没有，显示"画师编号"或"用户ID"
      if (!artistName) {
        if (artistNumber) {
          artistName = `画师${artistNumber}` // 优先显示画师编号
        } else {
          artistName = artistId ? `用户${artistId}` : '未知画师'
        }
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
        artistId: product.artistId, // 用户ID（内部使用）
        artistNumber: artistNumber, // 🎯 画师独立编号
        artistName: artistName, // 画师名字（显示用）
        specInfo: specInfo,
        sales: product.sales || 0,
        stock: product.stock || 0
        // 🎯 移除：浏览数字（views）不再显示
      }
    })
    
    console.log('加载商品列表:', formattedProducts.length, '个商品')
    
    this.setData({
      allProducts: formattedProducts,
      products: formattedProducts
    })
  },

  // 🎯 新增：统一的"安全拉单"函数（处理节流/依赖/异常）
  async safeLoadOrders() {
    try {
      // 防重复调用
      if (this.data.orderInFlight) {
        console.warn('[订单加载] 已有加载任务进行中，跳过本次调用')
        return
      }
      
      console.log('📋 [安全加载] 开始加载订单，设置互斥锁')
      this.setData({ orderInFlight: true })
      
      // 依赖就绪校验（可选，根据实际情况）
      const userId = wx.getStorageSync('userId')
      if (!userId) {
        console.warn('[订单加载] 用户ID未就绪，跳过本轮加载')
        this.setData({ 
          orderLoading: false, 
          orderInFlight: false 
        })
        return
      }
      
      // 调用真正的加载函数
      await this.loadOrders()
      
    } catch (err) {
      console.error('[订单加载] 异常:', err)
      this.setData({ 
        orderLoading: false, 
        orderInFlight: false,
        orders: []  // 异常时确保是空数组
      })
    }
  },
  
  // 加载订单列表
  async loadOrders() {
    console.log('========================================')
    console.log('📦 [管理后台] 使用统一工具加载订单')
    console.log('========================================')
    
    // 🎯 如果从switchMainTab进来，orderLoading已经设置为true
    // 否则手动设置
    if (!this.data.orderLoading) {
      this.setData({ orderLoading: true })
    }
    
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
      
      // 🔧 格式化时间用于显示：只显示月-日 时:分
      const formatTimeForDisplay = (timestamp) => {
        if (!timestamp) return ''
        // 🔧 iOS兼容：使用parseDate而不是直接new Date
        const date = parseDate(timestamp)
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
        // 🔧 关键修复：保留原始时间用于逻辑判断，新增显示字段
        createTime: order.createdAt || order.createTime,  // ✅ 保留完整时间字符串
        createTimeDisplay: formatTimeForDisplay(order.createdAt || order.createTime),  // ✅ 显示用
        deadline: order.deadline,  // ✅ 保留完整时间字符串
        deadlineDisplay: order.deadline ? formatTimeForDisplay(order.deadline) : '',  // ✅ 显示用
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
    const processingSet = new Set(['unpaid', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline'])
    const refundingSet = new Set(['refunding', 'refunded'])

    const orderStats = {
      all: formattedOrders.length,
      unpaid: formattedOrders.filter(o => o.status === 'unpaid').length,
      processing: formattedOrders.filter(o => processingSet.has(o.status)).length,
      completed: formattedOrders.filter(o => o.status === 'completed').length,
      refunded: formattedOrders.filter(o => refundingSet.has(o.status)).length  // 🎯 改名：退款中 → 已退款
    }
    
    console.log('加载订单列表:', formattedOrders.length, '个订单', orderStats)
    console.log('订单状态分布:', {
      全部: orderStats.all,
      待支付: orderStats.unpaid,
      制作中: orderStats.processing,
      已完成: orderStats.completed,
      已退款: orderStats.refunded
    })
    
    // 🎯 关键修复：一次性setData，避免多次渲染抖动
    this.setData({
      allOrders: formattedOrders,
      orderStats: orderStats,
      loading: false  // 🎯 关闭页面整体加载状态
    }, () => {
      // 🎯 数据更新完成后，应用当前筛选条件
      console.log('✅ 订单数据已设置到 state，当前 allOrders 数量:', this.data.allOrders.length)
      console.log('✅ 当前筛选器:', this.data.orderFilter)
      this.applyCurrentOrderFilter()
      this.collectAlerts()
      
      // 🎯 筛选完成后，一次性关闭加载状态并释放互斥锁
      this.setData({ 
        orderLoading: false,
        orderInFlight: false  // ✅ 释放互斥锁
      })
      console.log('✅ 订单加载完成，互斥锁已释放')
    })
  },

  // 🎯 新增：应用当前订单筛选（状态+时间）
  applyCurrentOrderFilter() {
    const filter = this.data.orderFilter
    let allOrders = this.data.allOrders || []
    
    console.log(`🔍 应用筛选器: ${filter}, 总订单数: ${allOrders.length}`)
    
    // 🔧 修复：订单列表不应用时间筛选（timeFilter仅用于仪表盘统计）
    // 订单管理需要看到所有历史订单，不应该被时间筛选限制
    // allOrders = this.filterOrdersByTime(allOrders)  // ✅ 注释掉时间筛选
    console.log(`⏰ 订单列表显示全部时间范围的订单`)

    // 应用状态筛选
    let filtered = []
    if (filter === 'all') {
      filtered = allOrders
    } else if (filter === 'processing') {
      const processingSet = new Set(['unpaid', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline'])
      filtered = allOrders.filter(o => processingSet.has(o.status))
    } else if (filter === 'refunded') {
      // 🎯 已退款：包含 refunding 和 refunded 状态
      filtered = allOrders.filter(o => {
        const isRefunded = o.status === 'refunding' || o.status === 'refunded' || o.refundStatus === 'refunded'
        if (isRefunded) {
          console.log(`✅ 找到已退款订单: ${o._id || o.id}, status=${o.status}, refundStatus=${o.refundStatus}`)
        }
        return isRefunded
      })
    } else {
      filtered = allOrders.filter(o => o.status === filter)
    }
    
    console.log(`📊 筛选结果: ${filtered.length} 个订单`)
    this.setData({ orders: filtered })
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
        // 🎯 其他画师，优先从users列表获取昵称和头像
        const allUsers = wx.getStorageSync('users') || []
        const targetUser = allUsers.find(u => u.id == app.userId || u.userId == app.userId)
        
        if (targetUser) {
          avatar = targetUser.avatarUrl || avatar
          nickname = targetUser.nickName || targetUser.name || app.name
          console.log(`✅ 从users列表获取画师信息: ${nickname}`)
        } else {
          // 兜底：从申请记录读取
          if (app.avatar || app.avatarUrl) {
            avatar = app.avatar || app.avatarUrl
          }
          nickname = app.name
        }
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
    
    // 🎯 生成画师排行榜数据（根据rankingType动态排序）
    this.setData({
      artists: artists,
      artistPerformance: performance
    }, () => {
      // 在 setData 完成后生成排行榜
      this.generateArtistRanking()
    })
    
    console.log('加载画师列表:', artists.length, '位画师')
  },
  
  // 🎯 新增：生成画师排行榜数据
  generateArtistRanking() {
    const rankingType = this.data.rankingType
    let ranking = [...this.data.artists]
    
    // 根据排行类型排序
    switch (rankingType) {
      case 'order':
        // 按订单量排序
        ranking.sort((a, b) => b.orderCount - a.orderCount)
        break
      case 'revenue':
        // 按收入排序
        ranking.sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue))
        break
      case 'rate':
        // 按完成率排序（计算已完成订单 / 总订单）
        ranking = ranking.map(artist => {
          const allOrders = orderHelper.getAllOrders()
          const artistOrders = allOrders.filter(o => o.artistId === artist.userId)
          const completedOrders = artistOrders.filter(o => o.status === 'completed')
          const completeRate = artistOrders.length > 0 
            ? ((completedOrders.length / artistOrders.length) * 100).toFixed(1) 
            : 0
          return {
            ...artist,
            completeRate: completeRate,
            revenue: artist.totalRevenue  // 用于显示
          }
        })
        ranking.sort((a, b) => parseFloat(b.completeRate) - parseFloat(a.completeRate))
        break
    }
    
    // 🎯 关键：确保每个画师数据都包含 artistNumber
    ranking = ranking.map(artist => ({
      ...artist,
      artistNumber: artist.artistNumber || '',  // 画师独立编号
      userId: artist.userId  // 用户ID（仅内部使用）
    }))
    
    console.log(`🏆 画师排行榜已生成 (${rankingType}):`, ranking.slice(0, 3))
    
    this.setData({ artistRanking: ranking.slice(0, 10) })  // 只显示前10名
  },
  
  // 🎯 新增：切换排行榜类型
  switchRankingType(e) {
    const type = e.currentTarget.dataset.type
    console.log('切换排行榜类型:', type)
    this.setData({ rankingType: type }, () => {
      this.generateArtistRanking()
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
    
    // 🎯 修复：切换到订单标签时，一次性设置所有状态，再调用加载
    if (tab === 'order') {
      console.log('📋 ========== 切换到订单标签，立即显示加载状态 ==========')
      console.log('当前状态快照:', {
        currentTab: this.data.currentTab,
        orderFilter: this.data.orderFilter,
        orderInFlight: this.data.orderInFlight,
        ordersLength: this.data.orders.length
      })
      
      // 🎯 关键：一次性setData，立即显示加载中，避免闪现"暂无订单"
      // 🔧 新增：重置互斥锁，确保每次切换都能触发加载（即使上次加载未完成）
      this.setData({ 
        currentTab: tab,
        fromDashboard: false,  // 手动切换标签时清除来源标记
        orderLoading: true,    // ✅ 立即显示加载中
        orders: [],            // ✅ 清空旧数据，避免闪回
        orderFilter: this.data.orderFilter || 'all',  // ✅ 确保筛选状态明确
        orderInFlight: false   // 🔧 新增：重置互斥锁，允许重新加载
      })
      
      // 然后调用安全加载函数
      this.safeLoadOrders()
    } else {
      this.setData({ 
        currentTab: tab,
        fromDashboard: false
      })
    }
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
      const processingSet = new Set(['unpaid', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline'])
      const filtered = this.data.allOrders.filter(o => processingSet.has(o.status))
      this.setData({ orders: filtered })
    } else if (filter === 'refunded') {
      // 🎯 已退款：包含 refunding 和 refunded 状态
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
  // 🎯 从仪表盘跳转到订单页（全部订单）
  goToOrders() {
    this.setData({ 
      currentTab: 'order',
      orderFilter: 'all',
      fromDashboard: true  // 标记来自仪表盘
    })
    // 🎯 修复：如果订单未加载，先加载再筛选
    if (!this.data.allOrders || this.data.allOrders.length === 0) {
      console.log('⚠️ 订单数据未加载，从仪表盘跳转时重新加载')
      this.loadOrders()
    } else {
      this.applyCurrentOrderFilter()
    }
  },

  // 🎯 从仪表盘跳转到已退款订单
  goToRefunds() {
    this.setData({ 
      currentTab: 'order', 
      orderFilter: 'refunded',
      fromDashboard: true  // 标记来自仪表盘
    })
    // 🎯 修复：如果订单未加载，先加载再筛选
    if (!this.data.allOrders || this.data.allOrders.length === 0) {
      console.log('⚠️ 订单数据未加载，从仪表盘跳转退款订单时重新加载')
      this.loadOrders()
    } else {
      this.filterOrders({ currentTarget: { dataset: { filter: 'refunded' } } })
    }
  },
  
  // 🎯 返回仪表盘
  backToDashboard() {
    this.setData({ 
      currentTab: 'dashboard',
      fromDashboard: false
    })
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

  // 🎯 查看所有用户列表
  goToUsers() {
    wx.navigateTo({
      url: '/pages/user-manage/index?type=all'
    })
  },
  
  // 🎯 查看今日下单用户（从仪表盘"下单人数"跳转）
  goToBuyers() {
    wx.navigateTo({
      url: `/pages/user-manage/index?type=buyers&date=${this.data.timeFilter || 'today'}`
    })
  },

  goToArtists() {
    this.setData({ currentTab: 'artist' })
  },

  // 🎯 修复：跳转到待处理订单（包含所有待处理状态）
  goToPendingOrders() {
    this.setData({ 
      currentTab: 'order',
      orderFilter: 'processing',  // 使用"制作中"筛选器，包含多种待处理状态
      fromDashboard: true
    })
    // 应用筛选，显示所有制作中的订单
    this.filterOrders({ currentTarget: { dataset: { filter: 'processing' } } })
  },

  // 🎯 跳转到逾期订单
  goToOverdueOrders() {
    this.setData({ 
      currentTab: 'order',
      orderFilter: 'all',  // 先切换到全部
      fromDashboard: true
    })
    // 筛选逾期订单
    const overdueOrders = this.data.allOrders.filter(o => o.isOverdue)
    this.setData({ orders: overdueOrders })
  },

  // 跳转到审核管理页面
  goToReviewManage() {
    wx.navigateTo({
      url: '/pages/review-manage/index'
    })
  },

  // 🎯 跳转到订单诊断页面
  goToDiagnosis() {
    wx.navigateTo({
      url: '/pages/order-diagnosis/index'
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

    const { groupName, usedFallback } = buildGroupName(order, {
      fallbackDeadlineText: '日期待定'
    })

    if (usedFallback) {
      wx.showToast({
        title: '截稿日期异常，请手动确认',
        icon: 'none',
        duration: 2000
      })
    }

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
    
    // 🎯 读取所有可能的订单存储源
    const orders = wx.getStorageSync('orders') || []
    const pendingOrders = wx.getStorageSync('pending_orders') || []
    const completedOrders = wx.getStorageSync('completed_orders') || []
    const mockOrders = wx.getStorageSync('mock_orders') || []
    const timestamp = new Date().toISOString()
    
    console.log('🔄 [管理后台] 开始退款处理:', {
      orderId,
      订单数源: {
        orders: orders.length,
        pending: pendingOrders.length,
        completed: completedOrders.length,
        mock: mockOrders.length
      }
    })
    
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
    
    // 统一处理：更新所有数据源
    let foundInAnySource = false
    const updateStatus = (list, sourceName) => {
      const updated = list.map(o => {
        if (o.id === orderId) {
          console.log(`✅ 在 ${sourceName} 中找到订单 ${orderId}，更新状态为 refunded`)
          foundInAnySource = true
          return orderHelper.mergeOrderRecords(o, refundData)
        }
        return o
      })
      return updated
    }
    
    // 🎯 更新所有4个数据源
    wx.setStorageSync('orders', updateStatus(orders, 'orders'))
    wx.setStorageSync('pending_orders', updateStatus(pendingOrders, 'pending_orders'))
    wx.setStorageSync('completed_orders', updateStatus(completedOrders, 'completed_orders'))
    wx.setStorageSync('mock_orders', updateStatus(mockOrders, 'mock_orders'))

    if (!foundInAnySource) {
      wx.hideLoading()
      this.setData({ refunding: false })
      console.warn('⚠️ 订单在所有数据源中都未找到:', orderId)
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
    console.log('💾 已保存退款状态到所有数据源')
    
    // 🎯 新增：退款时回退库存
    if (orderInfo && orderInfo.productId) {
      const quantity = orderInfo.quantity || 1
      const restored = productSales.increaseStock(orderInfo.productId, quantity)
      if (restored) {
        console.log('✅ 库存已回退:', { productId: orderInfo.productId, quantity })
      } else {
        console.warn('⚠️ 库存回退失败（可能是无限库存商品）')
      }
    } else {
      console.warn('⚠️ 订单信息不完整，无法回退库存')
    }

    // 🎯 延迟500ms后刷新
    setTimeout(() => {
      wx.hideLoading()
      
      wx.showToast({
        title: '退款成功',
        icon: 'success',
        duration: 1500
      })
      
      // 🎯 修复：立即刷新订单列表，确保退款状态显示正确
      setTimeout(() => {
        this.setData({ refunding: false })
        console.log('🔄 退款完成，强制重新加载订单列表...')
        // 🎯 关键：退款后强制刷新，不依赖延迟
        this.loadOrders()
      }, 100)  // 减少延迟，加快刷新速度
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
        // 🔧 iOS兼容：使用parseDate函数
        const timeA = parseDate(a.completedAt || a.createTime).getTime()
        const timeB = parseDate(b.completedAt || b.createTime).getTime()
        return timeB - timeA
      }
      
      // 其他状态按创建时间倒序（新订单在前）
      // 🔧 iOS兼容：使用parseDate函数
      const timeA = parseDate(a.createTime).getTime()
      const timeB = parseDate(b.createTime).getTime()
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

  goToDebugOrder() {
    wx.navigateTo({
      url: '/pages/debug-order/index'
    })
  },

  // 清空测试数据
  clearTestData() {
    wx.showModal({
      title: '⚠️ 危险操作',
      content: '此操作将清空以下数据：\n• 所有订单\n• 商品数据\n\n保留数据：\n• 用户信息\n• 系统设置\n• 画师申请\n\n确认清空？',
      confirmText: '确认清空',
      confirmColor: '#FF5722',
      success: (res) => {
        if (res.confirm) {
          // 二次确认
          wx.showModal({
            title: '最终确认',
            content: '数据清空后无法恢复！\n\n请再次确认是否清空？',
            confirmText: '确定清空',
            confirmColor: '#FF0000',
            success: (res2) => {
              if (res2.confirm) {
                this.doClearTestData()
              }
            }
          })
        }
      }
    })
  },

  // 执行清空操作
  doClearTestData() {
    wx.showLoading({ title: '清空中...', mask: true })
    
    try {
      // 清空订单数据（4个数据源）
      wx.setStorageSync('orders', [])
      wx.setStorageSync('pending_orders', [])
      wx.setStorageSync('completed_orders', [])
      wx.setStorageSync('mock_orders', [])
      
      // 清空商品数据
      wx.setStorageSync('mock_products', [])
      
      // 清空购物车
      wx.setStorageSync('cart', [])
      
      // 保留但重置数据版本号（用于数据迁移）
      wx.setStorageSync('data_version', 2)
      
      console.log('✅ 测试数据已清空')
      console.log('保留数据：用户信息、系统设置、画师申请')
      
      wx.hideLoading()
      
      wx.showToast({
        title: '数据已清空',
        icon: 'success',
        duration: 2000
      })
      
      // 刷新页面数据
      setTimeout(() => {
        this.loadData()
      }, 500)
      
    } catch (err) {
      console.error('❌ 清空数据失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '清空失败',
        icon: 'none'
      })
    }
  },

  // ❌ 已废弃：使用 computeVisualStatus 替代
  // calculateProgressPercent(order) {
  //   // 此函数已被 utils/order-visual-status.js 中的 computeVisualStatus 替代
  //   // 请勿再调用此函数
  // }
})
