// 引入统一工具函数
const orderHelper = require('../../utils/order-helper.js')
const orderStatusUtil = require('../../utils/order-status.js')

Page({
  data: {
    currentTab: 'all',
    tabs: [
      { label: '全部', value: 'all', count: 0 },
      { label: '待支付', value: 'unpaid', count: 0 },
      { label: '制作中', value: 'processing', count: 0 },
      { label: '已完成', value: 'completed', count: 0 }
    ],
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
      // 模拟加载订单数据
      await new Promise(resolve => setTimeout(resolve, 500))
      
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
        console.log('订单示例:', {
          id: allOrders[0].id,
          status: allOrders[0].status,
          statusText: allOrders[0].statusText,
          serviceName: allOrders[0].serviceName,
          serviceAvatar: allOrders[0].serviceAvatar ? '有' : '无'
        })
      }
      
      // 转换为订单列表需要的格式（保留原有的格式化逻辑）
      const mockOrders = allOrders.map(order => {
        // 画师信息兜底逻辑
        let artistName = order.artistName
        if (!artistName || artistName === '待分配') {
          const userInfo = wx.getStorageSync('userInfo')
          artistName = userInfo?.nickName || '画师'
        }
        
        // 截稿时间格式化显示
        let deadlineDisplay = order.deadline
        if (deadlineDisplay) {
          deadlineDisplay = deadlineDisplay.split(' ')[0]
        }
        
        // 下单时间格式化显示
        let createTimeDisplay = order.createTime
        if (createTimeDisplay) {
          const parts = createTimeDisplay.split(' ')
          if (parts.length === 2) {
            const timePart = parts[1].split(':')
            createTimeDisplay = `${parts[0]} ${timePart[0]}:${timePart[1]}`
          }
        }
        
        // 计算进度百分比和是否脱稿
        const progressData = this.calculateProgress(order)
        
        // 如果脱稿，更新截稿时间显示
        let deadlineText = deadlineDisplay
        if (progressData.isOverdue && progressData.overdueDays > 0) {
          deadlineText = `${deadlineDisplay} (已脱稿${progressData.overdueDays}天)`
        }
        
        // 获取买家信息（当前用户）
        const userInfo = wx.getStorageSync('userInfo')
        const buyerName = userInfo?.nickName || '买家'
        const buyerAvatar = userInfo?.avatarUrl || orderStatusUtil.DEFAULT_AVATAR
        
        // 获取画师头像
        const artistAvatar = order.artistAvatar || orderStatusUtil.DEFAULT_AVATAR
        
        return {
          _id: order.id,
          orderNo: order.id,
          productId: order.productId || '',
          productName: order.productName,
          productImage: order.productImage,
          artistName: artistName,
          artistAvatar: artistAvatar,
          serviceName: order.serviceName,  // ✅ 已由工具函数处理
          serviceAvatar: order.serviceAvatar,  // ✅ 已由工具函数处理
          buyerName: buyerName,
          buyerAvatar: buyerAvatar,
          deliveryDays: order.deliveryDays || 7,
          amount: order.price,
          status: order.status,  // ✅ 使用工具函数处理后的状态
          statusText: order.statusText,  // ✅ 使用工具函数处理后的状态文本
          progress: order.status === 'completed' ? 100 : 60,
          createTime: createTimeDisplay,
          deadline: deadlineText,
          progressPercent: progressData.percent,
          isOverdue: progressData.isOverdue,
          isNearDeadline: progressData.isNearDeadline,
          overdueDays: progressData.overdueDays,
          reviewed: false
        }
      })
      
      console.log('=== 转换后订单详情 ===')
      console.log('订单数量:', mockOrders.length)
      mockOrders.forEach(o => {
        console.log(`\n订单: ${o.orderNo}`)
        console.log(`- 商品: ${o.productName}`)
        console.log(`- 状态: ${o.statusText}`)
        console.log(`- 图片: ${o.productImage}`)
        console.log(`- 是否临时路径: ${o.productImage ? o.productImage.includes('tmp') : '无'}`)
      })

      // 计算各状态数量
      const statusCounts = {
        unpaid: 0,
        processing: 0,
        completed: 0
      }
      
      mockOrders.forEach(order => {
        if (statusCounts[order.status] !== undefined) {
          statusCounts[order.status]++
        }
      })

      const tabs = this.data.tabs.map(tab => {
        if (tab.value === 'all') {
          return { ...tab, count: mockOrders.length }
        }
        return { ...tab, count: statusCounts[tab.value] || 0 }
      })

      this.setData({
        allOrders: mockOrders,
        tabs
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
      orders = allOrders.filter(order => order.status === currentTab)
      const tabItem = this.data.tabs.find(t => t.value === currentTab)
      emptyText = `暂无${tabItem ? tabItem.label : ''}订单`
    }

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
          
          const updateOrderStatus = (orderList) => {
            return orderList.map(order => {
              if (order.id === orderId) {
                updated = true
                return {
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
                  }).replace(/\//g, '-')
                }
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
            
            wx.showToast({
              title: '订单已完成',
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

  // 申请退款（已废弃，替换为投诉）
  applyRefund(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '申请退款',
      content: '确认申请退款？退款后订单将被取消',
      confirmColor: '#FF9800',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已提交退款申请', icon: 'success' })
          this.loadOrders()
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
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '评价订单',
      content: '请对本次服务进行评价（评价功能待完善）',
      confirmText: '去评价',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到评价页面或显示评价弹窗
          wx.showToast({ title: '感谢您的评价', icon: 'success' })
        }
      }
    })
  },

  // 查看评价
  viewReview(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    })
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
  }
})
