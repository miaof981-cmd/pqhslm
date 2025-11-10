const orderStatusUtil = require('../../utils/order-status')
const { computeVisualStatus } = require('../../utils/order-visual-status')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')
const { buildGroupName } = require('../../utils/group-helper.js')
const { resolveServiceQRCode, resolveComplaintQRCode } = require('../../utils/qrcode-helper.js')
const staffFinance = require('../../utils/staff-finance.js')
const serviceIncome = require('../../utils/service-income.js')  // 🎯 新增：客服收入管理
const productSales = require('../../utils/product-sales.js')  // 🎯 新增：商品销量更新

/**
 * 🔧 iOS兼容的日期解析函数
 */
const parseDate = orderStatusUtil.parseDate

function normalizeString(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

Page({
  data: {
    loading: true,
    orderId: '',
    order: null,
    userRole: 'customer', // customer 或 artist
    buyerShowId: '',
    canPublishBuyerShow: false,

    // 二维码弹窗
    showServiceQR: false,
    showComplaintQR: false,
    serviceQRCode: '',
    complaintQRCode: ''
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ orderId: id })
      this.loadOrderDetail(id)
    }
    
    // 获取用户角色 - 默认为顾客视角
    // 注意：订单详情页应该根据订单归属来判断，而不是用户角色
    // 如果是从"我的订单"进入，显示顾客视角
    // 如果是从"工作台"进入，显示画师视角
    const source = options.source || 'customer' // customer 或 artist
    this.setData({ userRole: source })
  },

  // 加载订单详情
  loadOrderDetail(orderId) {
    // 模拟从本地存储加载
    const allOrders = wx.getStorageSync('pending_orders') || []
    const completedOrders = wx.getStorageSync('completed_orders') || []
    const orders = [...allOrders, ...completedOrders]
    
    // 如果本地没有，使用工作台的模拟数据
    if (orders.length === 0) {
      this.loadMockOrder(orderId)
      return
    }
    
    let order = orders.find(o => o.id === orderId)
    
    // 🎯 修复画师头像：从多个来源获取有效头像
    if (order) {
      order = this.fixOrderAvatars(order)
    }
    
    if (order) {
      // 自动计算订单状态
      order = orderStatusUtil.calculateOrderStatus(order)

      // 使用统一的视觉状态计算
      const { statusKey, statusColor, progressPercent } = computeVisualStatus(order)

      // 添加状态 CSS 类名
      order.statusClass = orderStatusUtil.classOf(order.status)

      const buyerShowPosts = wx.getStorageSync('buyer_show_posts') || []
      const buyerShowPost = buyerShowPosts.find(post => String(post.orderId) === String(order.id))
      order.hasBuyerShow = Boolean(buyerShowPost)

      const refundStatus = order.refundStatus || order.status
      const canPublishBuyerShow = order.status === 'completed' && refundStatus !== 'refunded'

      // 🎯 统一预处理客服/投诉二维码（优先使用订单字段，其次客服列表与系统设置）
      const serviceQrResult = resolveServiceQRCode(order)
      const complaintQrResult = resolveComplaintQRCode(order)
      if (serviceQrResult.value) {
        order.serviceQRCode = serviceQrResult.value
        order.serviceQrSource = serviceQrResult.source
      } else {
        order.serviceQRCode = ''
      }
      if (complaintQrResult.value) {
        order.complaintQRCode = complaintQrResult.value
        order.complaintQrSource = complaintQrResult.source
      } else {
        order.complaintQRCode = ''
      }

      this.setData({
        order: {
          ...order,
          statusKey,
          statusColor,
          progressPercent,
          isOverdue: statusKey === 'overdue',
          overdueDays: order.overdueDays || 0
        },
        loading: false,
        buyerShowId: buyerShowPost ? buyerShowPost.id : '',
        canPublishBuyerShow
      })
      
      console.log('📦 订单详情加载:', {
        id: order.id,
        deadline: order.deadline,
        status: order.status,
        statusText: order.statusText,
        statusKey,
        statusColor,
        progressPercent,
        wasOverdue: order.wasOverdue,
        serviceName: order.serviceName,
        serviceId: order.serviceId,
        serviceQrSource: serviceQrResult.source,
        complaintQrSource: complaintQrResult.source
      })
    } else {
      this.loadMockOrder(orderId)
    }
  },
  
  
  // 加载模拟订单数据
  loadMockOrder(orderId) {
    const mockOrder = {
      id: orderId,
      productName: 'Q版头像定制',
      productImage: '/assets/default-product.png',
      spec: '大头/手机壁纸',
      price: '88.00',
      status: 'inProgress',
      statusText: '进行中',
      createTime: '2025-10-25 14:32',
      deadline: '2025-10-30 23:59',
      urgent: false,
      step: 2,
      buyerName: '用户_' + orderId.slice(-4),
      artistName: '画师小明'
    }
    const mockServiceQr = resolveServiceQRCode(mockOrder)
    const mockComplaintQr = resolveComplaintQRCode(mockOrder)
    mockOrder.serviceQRCode = mockServiceQr.value || ''
    mockOrder.complaintQRCode = mockComplaintQr.value || ''

    this.setData({
      order: mockOrder,
      loading: false,
      buyerShowId: '',
      canPublishBuyerShow: mockOrder.status === 'completed'
    })
  },

  // 画师标记已完成
  markComplete() {
    const { order } = this.data
    
    // 🎯 检查订单状态：已退款或已完成的订单不能再操作
    if (order.status === 'refunded' || order.refundStatus === 'refunded') {
      wx.showToast({
        title: '订单已退款，无法操作',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    if (order.status === 'completed') {
      wx.showToast({
        title: '订单已完成',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '标记已完成',
      content: '确认作品已在群里交付完成？\n\n标记后将自动通知客户去群里查看作品并确认订单。',
      confirmText: '确认完成',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          // 标记订单为已完成
          order.workCompleted = true
          order.workCompleteTime = this.formatDateTime(new Date())
          
          // 更新本地存储
          this.updateOrderInStorage(order)
          
          this.setData({ order })
          
          setTimeout(() => {
            wx.hideLoading()
            
            // 发送模板消息通知客户
            this.sendOrderCompleteNotice(order)
          }, 500)
        }
      }
    })
  },
  
  // 格式化日期时间
  formatDateTime(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    // 统一格式：YYYY-MM-DD HH:mm（不显示秒）
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 发送订单完成通知（模板消息）
  sendOrderCompleteNotice(order) {
    console.log('📨 准备发送模板消息通知')
    console.log('订单信息:', {
      orderId: order.id,
      productName: order.productName,
      buyerOpenId: order.buyerOpenId || '待获取',
      artistName: order.artistName
    })
    
    // TODO: 调用云函数发送模板消息
    // 接口设计如下：
    /*
    wx.cloud.callFunction({
      name: 'sendTemplateMessage',
      data: {
        type: 'orderComplete',
        toUser: order.buyerOpenId,  // 买家的 openid
        data: {
          orderId: order.id,
          productName: order.productName,
          artistName: order.artistName,
          completeTime: order.workCompleteTime,
          page: `pages/order-detail/index?id=${order.id}&source=customer`
        }
      },
      success: res => {
        console.log('✅ 模板消息发送成功:', res)
        wx.showToast({
          title: '已通知客户',
          icon: 'success'
        })
      },
      fail: err => {
        console.error('❌ 模板消息发送失败:', err)
        wx.showToast({
          title: '通知发送失败',
          icon: 'none'
        })
      }
    })
    */
    
    // 模拟发送成功
    wx.showLoading({ title: '发送通知中...' })
    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '通知已发送',
        content: '已通过微信服务通知提醒客户去群里查看作品并确认订单。',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          // 返回上一页
          wx.navigateBack()
        }
      })
      
      console.log('✅ 模板消息已发送（模拟）')
      console.log('📱 客户将收到：')
      console.log('   标题: 您的作品已完成')
      console.log('   内容: 订单号：' + order.id)
      console.log('   内容: 商品名称：' + order.productName)
      console.log('   内容: 画师：' + order.artistName)
      console.log('   内容: 完成时间：' + order.workCompleteTime)
      console.log('   提示: 请前往群聊查看作品，并点击确认完成订单')
    }, 1000)
  },

  // 更新订单到本地存储
  updateOrderInStorage(order) {
    const pendingOrders = wx.getStorageSync('pending_orders') || []
    const index = pendingOrders.findIndex(o => o.id === order.id)
    
    if (index !== -1) {
      pendingOrders[index] = order
      wx.setStorageSync('pending_orders', pendingOrders)
      console.log('✅ 订单已更新到本地存储')
    }
  },

  // 复制订单号
  copyOrderNo() {
    const orderId = this.data.order.id || this.data.order.orderNumber
    wx.setClipboardData({
      data: orderId.toString(),
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        })
      }
    })
  },

  // 复制群名
  copyGroupName() {
    const order = this.data.order
    if (!order) return

    const { groupName, usedFallback } = buildGroupName(order, {
      fallbackDeadlineText: '日期待定'
    })

    if (usedFallback) {
      wx.showToast({
        title: '截稿日期异常，请手动确认',
        icon: 'none'
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

  // 联系客服
  contactService() {
    const { order } = this.data

    // 优先使用订单中已经加载的二维码
    const fallbackQr = '/assets/default-service-qr.png'
    const result = resolveServiceQRCode(order || {})
    const serviceQRCode = result.value || fallbackQr

    this.setData({
      serviceQRCode,
      showServiceQR: true
    })
  },

  // 投诉
  showComplaint() {
    const { order } = this.data

    const fallbackQr = '/assets/default-complaint-qr.png'
    const result = resolveComplaintQRCode(order || {})
    const complaintQRCode = result.value || fallbackQr

    this.setData({
      complaintQRCode,
      showComplaintQR: true
    })
  },

  // 🎯 新增：申请退款
  requestRefund() {
    const order = this.data.order
    
    wx.showModal({
      title: '申请退款',
      content: `您确定要申请退款吗？\n\n订单号：${order.id}\n商品：${order.productName}\n金额：¥${order.price}\n\n退款申请提交后，客服将在24小时内处理`,
      confirmText: '确认申请',
      cancelText: '我再想想',
      success: (res) => {
        if (res.confirm) {
          this.doRequestRefund(order)
        }
      }
    })
  },

  // 执行退款申请
  doRequestRefund(order) {
    wx.showLoading({ title: '提交中...', mask: true })
    
    // 更新订单退款状态为"申请中"
    order.refundStatus = 'requesting'
    order.refundRequestTime = new Date().toISOString()
    order.refundRequestor = 'buyer' // 买家申请
    
    // 保存到本地存储
    const orderHelper = require('../../utils/order-helper.js')
    const allOrders = orderHelper.getAllOrders()
    const orderIndex = allOrders.findIndex(o => o.id === order.id)
    
    if (orderIndex !== -1) {
      allOrders[orderIndex] = { ...allOrders[orderIndex], ...order }
      
      // 根据订单状态保存到对应的存储
      if (order.status === 'completed') {
        const completedOrders = wx.getStorageSync('completed_orders') || []
        const cIndex = completedOrders.findIndex(o => o.id === order.id)
        if (cIndex !== -1) {
          completedOrders[cIndex] = order
          wx.setStorageSync('completed_orders', completedOrders)
        }
      } else {
        const pendingOrders = wx.getStorageSync('pending_orders') || []
        const pIndex = pendingOrders.findIndex(o => o.id === order.id)
        if (pIndex !== -1) {
          pendingOrders[pIndex] = order
          wx.setStorageSync('pending_orders', pendingOrders)
        }
      }
      
      console.log('✅ 退款申请已提交:', order.id)
      
      setTimeout(() => {
        wx.hideLoading()
        wx.showToast({
          title: '退款申请已提交',
          icon: 'success',
          duration: 2000
        })
        
        // 刷新页面
        this.loadOrderDetail(order.id)
      }, 500)
    } else {
      wx.hideLoading()
      wx.showToast({
        title: '订单不存在',
        icon: 'error'
      })
    }
  },

  // 隐藏二维码弹窗
  hideQRModal() {
    this.setData({
      showServiceQR: false,
      showComplaintQR: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击弹窗内容时关闭
  },

  // 打开晒稿页面
  openBuyerShowPublish() {
    const { order, canPublishBuyerShow } = this.data
    if (!order) return

    if (!canPublishBuyerShow) {
      wx.showToast({
        title: '仅已完成订单可晒稿',
        icon: 'none'
      })
      return
    }

    const query = [`orderId=${order.id}`, `status=${order.status}`]
    if (order.productId) {
      query.push(`productId=${order.productId}`)
    }
    if (order.productName) {
      query.push(`productName=${encodeURIComponent(order.productName)}`)
    }
    wx.navigateTo({
      url: `/pages/buyer-show/publish/index?${query.join('&')}`
    })
  },

  // 查看晒稿
  viewBuyerShow() {
    const { buyerShowId } = this.data
    if (!buyerShowId) {
      wx.showToast({
        title: '暂未发布晒稿',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/buyer-show/detail/index?id=${buyerShowId}`
    })
  },

  // 确认完成
  confirmComplete() {
    const orderId = this.data.order.id
    
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成？完成后将无法撤销',
      confirmColor: '#A8E6CF',
      success: (res) => {
        if (res.confirm) {
          // 从本地存储读取订单
          const orders = wx.getStorageSync('orders') || []
          const pendingOrders = wx.getStorageSync('pending_orders') || []
          
          // 在两个存储中都查找并更新
          let updated = false
          let recordedOrder = null
          
          const updateOrderStatus = (orderList) => {
            return orderList.map(order => {
              if (order.id === orderId) {
                updated = true
                // 检查是否脱稿
                const now = new Date()
                // 🔧 iOS兼容：使用parseDate函数
                const deadline = parseDate(order.deadline)
                const wasOverdue = now > deadline
                const overdueDays = wasOverdue ? Math.ceil((now - deadline) / (24 * 60 * 60 * 1000)) : 0
                
                const nextOrder = {
                  ...order,
                  status: 'completed',
                  completedAt: new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  }).replace(/\//g, '-'),
                  wasOverdue,
                  overdueDays
                }

                if (order.status !== 'completed' && !recordedOrder) {
                  recordedOrder = nextOrder
                }

                return nextOrder
              }
              return order
            })
          }
          
          const updatedOrders = updateOrderStatus(orders)
          const updatedPendingOrders = updateOrderStatus(pendingOrders)
          
          if (updated) {
            // 保存更新后的订单
            wx.setStorageSync('orders', updatedOrders)
            wx.setStorageSync('pending_orders', updatedPendingOrders)

            if (recordedOrder) {
              try {
                // 🎯 新的收入分配逻辑：固定¥5分配给客服和管理员
                serviceIncome.recordOrderIncome(recordedOrder)
                console.log('✅ 订单收入分配完成')
                
                // 🎯 更新商品销量
                productSales.updateProductSales(recordedOrder)
              } catch (err) {
                console.error('⚠️ 记录订单收入失败:', err)
              }
            }
            
            wx.showToast({
              title: '订单已完成',
              icon: 'success'
            })
            
            // 延迟刷新页面
            setTimeout(() => {
              this.loadOrderDetail(orderId)
            }, 500)
          } else {
            wx.showToast({
              title: '订单未找到',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // ❌ 已废弃：使用 computeVisualStatus 替代
  // calculateProgress(order) {
  //   // 此函数已被 utils/order-visual-status.js 中的 computeVisualStatus 替代
  //   // 请勿再调用此函数
  // }

  // 🎯 修复订单中的头像（画师、客服、买家）
  fixOrderAvatars(order) {
    const DEFAULT_AVATAR_DATA = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKg8L3RleHQ+PC9zdmc+'
    
    // 准备数据源
    const products = wx.getStorageSync('mock_products') || []
    const productMap = new Map()
    products.forEach(p => {
      if (p.id) productMap.set(String(p.id), p)
    })

    const serviceList = wx.getStorageSync('service_list') || []
    const userInfoMap = new Map()
    serviceList.forEach(s => {
      if (s.userId) userInfoMap.set(String(s.userId), s)
    })

    const artistApps = wx.getStorageSync('artist_applications') || []
    const artistMap = new Map()
    artistApps.forEach(app => {
      if (app.userId) artistMap.set(String(app.userId), app)
    })

    // 修复画师头像
    let artistAvatar = order.artistAvatar || ''
    if (!artistAvatar || 
        artistAvatar.startsWith('http://tmp/') || 
        artistAvatar.startsWith('https://thirdwx.qlogo.cn/') ||
        artistAvatar.startsWith('wxfile://')) {
      
      // 1. 从商品获取
      if (order.productId) {
        const product = productMap.get(String(order.productId))
        if (product && product.artistAvatar && product.artistAvatar.startsWith('data:image')) {
          artistAvatar = product.artistAvatar
          console.log('✅ [订单详情] 从商品获取画师头像')
        }
      }
      
      // 2. 从画师申请获取
      if ((!artistAvatar || !artistAvatar.startsWith('data:image')) && order.artistId) {
        const artist = artistMap.get(String(order.artistId))
        if (artist && artist.avatarUrl && artist.avatarUrl.startsWith('data:image')) {
          artistAvatar = artist.avatarUrl
          console.log('✅ [订单详情] 从画师申请获取头像')
        }
        
        // 3. 从用户信息获取
        if (!artistAvatar || !artistAvatar.startsWith('data:image')) {
          const userInfo = userInfoMap.get(String(order.artistId))
          if (userInfo && userInfo.avatar && userInfo.avatar.startsWith('data:image')) {
            artistAvatar = userInfo.avatar
            console.log('✅ [订单详情] 从用户信息获取画师头像')
          }
        }
      }
    }
    
    if (!artistAvatar || !artistAvatar.startsWith('data:image')) {
      artistAvatar = DEFAULT_AVATAR_DATA
      console.log('⚠️ [订单详情] 使用默认画师头像')
    }

    // 修复客服头像（类似逻辑）
    let serviceAvatar = order.serviceAvatar || ''
    if (!serviceAvatar || 
        serviceAvatar.startsWith('http://tmp/') || 
        serviceAvatar.startsWith('https://thirdwx.qlogo.cn/') ||
        serviceAvatar.startsWith('wxfile://')) {
      
      if (order.serviceId) {
        const serviceInfo = userInfoMap.get(String(order.serviceId))
        if (serviceInfo && serviceInfo.avatar && serviceInfo.avatar.startsWith('data:image')) {
          serviceAvatar = serviceInfo.avatar
          console.log('✅ [订单详情] 从用户信息获取客服头像')
        }
      }
    }
    
    if (!serviceAvatar || !serviceAvatar.startsWith('data:image')) {
      serviceAvatar = DEFAULT_AVATAR_DATA
    }

    const artistAvatarPath = ensureRenderableImage(artistAvatar, {
      namespace: 'artist-avatar',
      fallback: DEFAULT_AVATAR_DATA
    })

    const serviceAvatarPath = ensureRenderableImage(serviceAvatar, {
      namespace: 'service-avatar',
      fallback: DEFAULT_AVATAR_DATA
    })

    const buyerAvatarPath = ensureRenderableImage(order.buyerAvatar, {
      namespace: 'buyer-avatar',
      fallback: DEFAULT_AVATAR_DATA
    })

    let productImageSource = order.productImage
    if (
      !productImageSource ||
      productImageSource.startsWith('http://tmp/') ||
      productImageSource.startsWith('wxfile://')
    ) {
      if (order.productId) {
        const product = productMap.get(String(order.productId))
        if (product && Array.isArray(product.images) && product.images.length > 0) {
          productImageSource = product.images[0]
        }
      }
    }

    const productImagePath = ensureRenderableImage(productImageSource, {
      namespace: 'order-product',
      fallback: DEFAULT_PLACEHOLDER
    })

    return {
      ...order,
      artistAvatar: artistAvatarPath,
      serviceAvatar: serviceAvatarPath,
      buyerAvatar: buyerAvatarPath,
      productImage: productImagePath
    }
  }
})
