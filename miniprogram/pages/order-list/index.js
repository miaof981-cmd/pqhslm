// 引入统一工具函数
const orderHelper = require('../../utils/order-helper.js')
const orderStatusUtil = require('../../utils/order-status.js')
const { computeVisualStatus } = require('../../utils/order-visual-status')
const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')
const staffFinance = require('../../utils/staff-finance.js')
const serviceIncome = require('../../utils/service-income.js')  // 🎯 新增：客服收入管理
const productSales = require('../../utils/product-sales.js')  // 🎯 新增：商品销量更新

Page({
  data: {
    DEFAULT_AVATAR_DATA,
    currentTab: 'processing',  // 🎯 默认显示制作中的订单
    tabs: [],  // 动态生成，只显示有订单的Tab
    orders: [],
    allOrders: [],
    loading: true,
    emptyText: '暂无订单',
    showServiceQR: false,
    showComplaintQR: false,
    serviceQRCode: '',
    complaintQRCode: ''
  },

  onLoad(options) {
    // 如果从用户中心点击进入，设置默认Tab
    if (options.status) {
      this.setData({ currentTab: options.status })
    }
    
    // 初始化默认二维码（如果本地没有的话）
    if (!wx.getStorageSync('service_qrcode')) {
      wx.setStorageSync('service_qrcode', '/assets/default-service-qr.png')
    }
    if (!wx.getStorageSync('complaint_qrcode')) {
      wx.setStorageSync('complaint_qrcode', '/assets/default-complaint-qr.png')
    }
    
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
  },

  // 加载订单列表
  async loadOrders() {
    this.setData({ loading: true })
    
    try {
      const userId = wx.getStorageSync('userId')
      
      console.log('========================================')
      console.log('📦 [用户端] 使用统一工具加载订单')
      console.log('========================================')
      console.log('当前用户ID:', userId)
      
      // 🎯 使用统一工具函数获取并标准化订单
      let allOrders = orderHelper.prepareOrdersForPage({
        role: 'customer',
        userId: userId
      })
      
      console.log('✅ 订单加载完成:', allOrders.length, '个')
      if (allOrders.length > 0) {
        const latest = allOrders[allOrders.length - 1]
        console.log('🔍 最新订单（order-helper处理后）:', {
          id: latest.id,
          productId: latest.productId,
          productName: latest.productName,
          artistName: latest.artistName || '❌ 无',
          artistAvatar: latest.artistAvatar || '❌ 无',
          serviceName: latest.serviceName || '❌ 无',
          serviceAvatar: latest.serviceAvatar || '❌ 无'
        })
      }
      
      // 转换为订单列表需要的格式（保留原有的格式化逻辑）
      // ✅ 画师信息、客服信息已在 order-helper.js 中统一处理
      // ⚠️ 禁止在此二次兜底，直接信任归一化结果
      
      // 🎯 获取商品表（用于动态读取 base64 图片）
      const products = wx.getStorageSync('mock_products') || []
      const productMap = new Map()
      products.forEach(p => {
        if (p.id) productMap.set(String(p.id).trim(), p)
      })
      
      const buyerShowPosts = wx.getStorageSync('buyer_show_posts') || []
      const buyerShowMap = {}
      buyerShowPosts.forEach(post => {
        if (post && post.orderId) {
          buyerShowMap[String(post.orderId)] = post.id
        }
      })

      const mockOrders = allOrders.map(order => {
        // 🎯 动态读取图片（如果订单没有图片但有 productId）
        let productImage = order.productImage || ''
        if (!productImage && order.productId) {
          const product = productMap.get(String(order.productId).trim())
          if (product && product.images && product.images[0]) {
            productImage = product.images[0]
          }
        }
        
        // 截稿时间格式化显示
        let deadlineDisplay = order.deadline
        if (deadlineDisplay) {
          deadlineDisplay = deadlineDisplay.split(' ')[0]
        }
        
        // 下单时间格式化显示（只显示日期部分）
        let createTimeDisplay = order.createTime || ''
        if (createTimeDisplay && createTimeDisplay.includes(' ')) {
          createTimeDisplay = createTimeDisplay.split(' ')[0]
        }
        
        // 使用统一的视觉状态计算
        const { statusKey, statusColor, progressPercent } = computeVisualStatus(order)
        const isOverdue = statusKey === 'overdue'
        const isNearDeadline = statusKey === 'nearDeadline'
        
        // 如果脱稿，更新截稿时间显示
        let deadlineText = deadlineDisplay
        if (isOverdue && order.overdueDays > 0) {
          deadlineText = `${deadlineDisplay} (已脱稿${order.overdueDays}天)`
        }
        
        // 获取买家信息（当前用户）
        const userInfo = wx.getStorageSync('userInfo')
        const buyerName = userInfo?.nickName || '买家'
        const buyerAvatar = userInfo?.avatarUrl || orderStatusUtil.DEFAULT_AVATAR
        
        const buyerShowId = buyerShowMap[String(order.id)] || ''

        const result = {
          _id: order.id,
          orderNo: order.id,
          productId: order.productId,
          productName: order.productName,
          productImage: productImage,  // 使用动态读取的图片
          artistName: order.artistName,      // 直接使用，已由 order-helper 处理
          artistAvatar: order.artistAvatar,  // 直接使用，已由 order-helper 处理
          serviceName: order.serviceName,    // 直接使用，已由 order-helper 处理
          serviceAvatar: order.serviceAvatar, // 直接使用，已由 order-helper 处理
          buyerName: buyerName,
          buyerAvatar: buyerAvatar,
          deliveryDays: order.deliveryDays || 7,
          amount: order.price,
          status: order.status,
          statusText: order.statusText,
          statusKey,
          statusColor,
          progress: order.status === 'completed' ? 100 : 60,
          createTime: createTimeDisplay,
          deadline: deadlineText,
          progressPercent,
          isOverdue,
          isNearDeadline,
          overdueDays: order.overdueDays || 0,
          reviewed: Boolean(order.reviewed),
          hasBuyerShow: Boolean(buyerShowId),
          buyerShowId
        }
        
        // 🔍 调试：输出最新订单的转换结果
        if (order.id === allOrders[allOrders.length - 1].id) {
          console.log('🔍 最新订单（转换后）:', {
            id: result._id,
            artistName: result.artistName || '❌ 无',
            artistAvatar: result.artistAvatar || '❌ 无'
          })
        }
        
        return result
      })
      
      // 🎯 固定Tab顺序，与用户中心保持一致（不显示数量，提升性能）
      const tabs = [
        { label: '全部', value: 'all' },
        { label: '制作中', value: 'processing' },
        { label: '已完成', value: 'completed' },
        { label: '待支付', value: 'unpaid' }
      ]

      this.setData({
        allOrders: mockOrders,
        tabs: tabs
      })

      this.filterOrders()
    } catch (error) {
      console.error('加载订单失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.filterOrders()
  },

  // 筛选订单
  filterOrders() {
    const { currentTab, allOrders } = this.data
    let orders = allOrders
    let emptyText = '暂无订单'

    if (currentTab !== 'all') {
      if (currentTab === 'processing') {
        // "制作中" Tab 包含所有进行中的状态（包括待确认）
        orders = allOrders.filter(order => {
          return order.status === 'processing' || 
                 order.status === 'inProgress' || 
                 order.status === 'overdue' || 
                 order.status === 'nearDeadline' ||
                 order.status === 'waitingConfirm'  // ✅ 关键：包含待确认
        })
      } else {
        orders = allOrders.filter(order => order.status === currentTab)
      }
      const tabItem = this.data.tabs.find(t => t.value === currentTab)
      emptyText = `暂无${tabItem ? tabItem.label : ''}订单`
    }

    // 🎯 所有Tab都按时间倒序排序（新订单在前）
    orders = orders.sort((a, b) => {
      // 1. 如果是"全部"Tab，先按优先级排序
      if (currentTab === 'all') {
        const getPriority = (order) => {
          if (order.status === 'waitingConfirm') return 1  // 最高优先级：待确认
          if (order.status === 'completed') return 999      // 最低优先级：已完成
          return 500  // 中等优先级：其他进行中状态
        }
        
        const priorityA = getPriority(a)
        const priorityB = getPriority(b)
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
      }
      
      // 2. 同优先级或其他Tab，按创建时间倒序（新订单在前）
      const timeA = new Date((a.createTime || '').replace(/-/g, '/')).getTime()
      const timeB = new Date((b.createTime || '').replace(/-/g, '/')).getTime()
      
      // 处理无效时间
      if (isNaN(timeA)) return 1
      if (isNaN(timeB)) return -1
      
      return timeB - timeA  // 新订单在前
    })

    this.setData({ orders, emptyText })
  },

  // 查看订单详情
  viewOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}&source=customer`
    })
  },

  // 支付订单
  payOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '支付订单',
      content: '确认支付此订单？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '支付中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrders()
          }, 1000)
        }
      }
    })
  },

  // 取消订单
  cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消订单',
      content: '确定要取消此订单吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadOrders()
          }, 500)
        }
      }
    })
  },

  // 联系客服
  contactService(e) {
    // 从本地存储读取客服二维码
    const serviceQRCode = wx.getStorageSync('service_qrcode') || '/assets/default-service-qr.png'
    
    this.setData({
      serviceQRCode: serviceQRCode,
      showServiceQR: true
    })
  },

  // 投诉
  showComplaint(e) {
    // 从本地存储读取投诉二维码
    const complaintQRCode = wx.getStorageSync('complaint_qrcode') || '/assets/default-complaint-qr.png'

    this.setData({
      complaintQRCode: complaintQRCode,
      showComplaintQR: true
    })
  },

  // 打开晒稿页面
  openBuyerShowPublish(e) {
    const { orderId, status, productId, productName } = e.currentTarget.dataset

    if (status !== 'completed') {
      wx.showToast({
        title: '订单完成后才可晒稿',
        icon: 'none'
      })
      return
    }

    const query = [`orderId=${orderId}`, `status=${status}`]
    if (productId) {
      query.push(`productId=${productId}`)
    }
    if (productName) {
      query.push(`productName=${encodeURIComponent(productName)}`)
    }

    wx.navigateTo({
      url: `/pages/buyer-show/publish/index?${query.join('&')}`
    })
  },

  // 查看买家秀详情
  viewBuyerShow(e) {
    const { id } = e.currentTarget.dataset
    if (!id) {
      wx.showToast({
        title: '内容不存在',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/buyer-show/detail/index?id=${id}`
    })
  },

  // 确认完成订单
  confirmComplete(e) {
    const orderId = e.currentTarget.dataset.id
    
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
                // 检查是否脱稿（使用 iOS 兼容的日期解析）
                const now = new Date()
                const deadlineStr = order.deadline ? order.deadline.replace(/-/g, '/') : ''
                const deadline = new Date(deadlineStr)
                const wasOverdue = !isNaN(deadline.getTime()) && now > deadline
                const overdueDays = wasOverdue ? Math.ceil((now - deadline) / (24 * 60 * 60 * 1000)) : 0
                
                console.log('🔍 确认完成 - 脱稿检测:', {
                  订单ID: order.id,
                  当前时间: now.toLocaleString(),
                  截稿时间: deadline.toLocaleString(),
                  是否脱稿: wasOverdue,
                  脱稿天数: overdueDays
                })
                
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
            
            // 🎯 立即刷新订单列表（移除延迟，确保数据同步）
            this.loadOrders()
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

  // 申请退款
  applyRefund(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '申请退款',
      content: '确认申请退款？客服将尽快审核并与您联系',
      confirmColor: '#FF9800',
      confirmText: '申请退款',
      success: (res) => {
        if (res.confirm) {
          const timestamp = new Date().toISOString()
          const appendRefundHistory = (history = []) => {
            return [
              ...history,
              {
                status: 'refunding',
                operator: 'customer',
                time: timestamp,
                note: '买家发起退款申请'
              }
            ]
          }

          const updateStatus = (orders = []) => {
            let changed = false
            const updated = orders.map(order => {
              if (order.id === id) {
                changed = true
                return orderHelper.mergeOrderRecords(order, {
                  status: 'refunding',
                  statusText: '退款中',
                  refundStatus: 'refunding',
                  refundRequestedAt: timestamp,
                  refundHistory: appendRefundHistory(order.refundHistory)
                })
              }
              return order
            })
            return { updated, changed }
          }

          const ordersStore = wx.getStorageSync('orders') || []
          const pendingStore = wx.getStorageSync('pending_orders') || []

          const { updated: updatedOrders, changed } = updateStatus(ordersStore)
          const { updated: updatedPending } = updateStatus(pendingStore)

          if (changed) {
            wx.setStorageSync('orders', updatedOrders)
            wx.setStorageSync('pending_orders', updatedPending)
            wx.showToast({ title: '已提交退款申请', icon: 'success' })
            setTimeout(() => this.loadOrders(), 400)
          } else {
            wx.showToast({ title: '订单不存在或已退款', icon: 'none' })
          }
        }
      }
    })
  },

  // 删除订单
  deleteOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除订单',
      content: '确定要删除此订单吗？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            this.loadOrders()
          }, 500)
        }
      }
    })
  },

  // 评价订单
  reviewOrder(e) {
    const orderId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '评价订单',
      content: '请对本次服务进行评价（评价功能开发中，评价后将显示"已评价"）',
      confirmText: '提交评价',
      success: (res) => {
        if (res.confirm) {
          // 🎯 从本地存储读取所有订单并标记为已评价
          const orders = wx.getStorageSync('orders') || []
          const pendingOrders = wx.getStorageSync('pending_orders') || []
          const completedOrders = wx.getStorageSync('completed_orders') || [] // 🎯 新增：已完成订单
          
          let updated = false
          
          const markAsReviewed = (orderList) => {
            return orderList.map(order => {
              if (order.id === orderId || order._id === orderId) {
                updated = true
                return {
                  ...order,
                  reviewed: true,
                  reviewedAt: new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  }).replace(/\//g, '-')
                }
              }
              return order
            })
          }
          
          const updatedOrders = markAsReviewed(orders)
          const updatedPendingOrders = markAsReviewed(pendingOrders)
          const updatedCompletedOrders = markAsReviewed(completedOrders) // 🎯 新增
          
          if (updated) {
            // 保存更新后的订单
            wx.setStorageSync('orders', updatedOrders)
            wx.setStorageSync('pending_orders', updatedPendingOrders)
            wx.setStorageSync('completed_orders', updatedCompletedOrders) // 🎯 新增
            
            wx.showToast({
              title: '感谢您的评价',
              icon: 'success'
            })
            
            // 延迟刷新，让用户看到提示
            setTimeout(() => {
              this.loadOrders()
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

  // 查看评价
  viewReview(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({
      title: '已评价',
      icon: 'success'
    })
    // 🔗 预留接口：将来可以跳转到评价详情页
    // wx.navigateTo({
    //   url: `/pages/review-detail/index?id=${id}`
    // })
  },

  // 再次购买
  buyAgain(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${productId}`
    })
  },

  // 查看退款进度
  viewRefund(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    })
  },

  // 去逛逛
  goShopping() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOrders()
    wx.stopPullDownRefresh()
  },
  
  // 图片加载失败处理
  onImageError(e) {
    const orderId = e.currentTarget.dataset.id
    console.error('❌ 图片加载失败 - 订单ID:', orderId)
    
    // 查找对应订单并清空图片路径（显示占位符）
    const orders = this.data.orders
    const index = orders.findIndex(o => o._id === orderId)
    
    if (index !== -1) {
      const failedImage = orders[index].productImage
      console.error('失败的图片路径:', failedImage)
      console.log('原因分析:', {
        是否临时路径: failedImage ? failedImage.includes('tmp') : false,
        是否为空: !failedImage,
        路径内容: failedImage
      })
      console.log('✅ 已清空图片路径，将显示占位符')
      
      // 清空图片路径，让 wx:if 显示占位符
      orders[index].productImage = ''
      this.setData({ orders })
    }
  },
  
  // 计算订单进度百分比（精确到小时和分钟）
  calculateProgress(order) {
    if (order.status === 'completed') {
      return { 
        percent: 100, 
        isOverdue: false, 
        isNearDeadline: false,
        overdueDays: 0 
      }
    }
    
    try {
      // 将日期字符串转换为 iOS 兼容格式（yyyy/MM/dd HH:mm:ss）
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date()
        return new Date(dateStr.replace(/-/g, '/'))
      }
      
      // 精确到小时和分钟的时间戳
      const createDate = parseDate(order.createTime).getTime()
      const deadlineDate = parseDate(order.deadline).getTime()
      const nowDate = new Date().getTime()
      
      if (isNaN(createDate) || isNaN(deadlineDate)) {
        return { 
          percent: 5, 
          isOverdue: false, 
          isNearDeadline: false,
          overdueDays: 0 
        }
      }
      
      // 计算精确的时间差（毫秒）
      const oneDayMs = 24 * 60 * 60 * 1000
      const totalMs = deadlineDate - createDate
      const elapsedMs = nowDate - createDate
      
      // 按毫秒比例计算进度
      let percent = Math.round((elapsedMs / totalMs) * 100)
      
      // 判断是否脱稿（精确到毫秒）
      const isOverdue = nowDate > deadlineDate
      // 脱稿天数：只有满24小时才算1天
      const overdueDays = isOverdue ? Math.floor((nowDate - deadlineDate) / oneDayMs) : 0
      
      // 判断是否临近截稿（剩余时间 <= 24小时）
      const timeLeft = deadlineDate - nowDate
      const isNearDeadline = !isOverdue && timeLeft <= oneDayMs
      
      // 限制范围
      if (percent < 5) percent = 5    // 最小显示5%
      if (percent > 100) percent = 100
      
      console.log(`订单 ${order.id} 进度:`, {
        下单时间: order.createTime,
        截稿时间: order.deadline,
        当前时间: new Date().toLocaleString('zh-CN', { hour12: false }),
        总时长: `${(totalMs / oneDayMs).toFixed(2)} 天`,
        已过时长: `${(elapsedMs / oneDayMs).toFixed(2)} 天`,
        剩余时长: isOverdue ? `已超时 ${(Math.abs(timeLeft) / oneDayMs).toFixed(2)} 天` : `剩余 ${(timeLeft / oneDayMs).toFixed(2)} 天`,
        进度: `${percent}%`,
        是否脱稿: isOverdue,
        是否临近截稿: isNearDeadline,
        脱稿天数: overdueDays
      })
      
      return { percent, isOverdue, isNearDeadline, overdueDays }
    } catch (error) {
      console.error('计算进度失败:', error)
      return { 
        percent: 5, 
        isOverdue: false, 
        isNearDeadline: false,
        overdueDays: 0 
      }
    }
  },

  // 画师头像加载失败兜底
  onArtistImgErr(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      [`orders[${index}].artistAvatar`]: DEFAULT_AVATAR_DATA
    })
  },

  // 客服头像加载失败兜底
  onServiceImgErr(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      [`orders[${index}].serviceAvatar`]: DEFAULT_AVATAR_DATA
    })
  }
})
