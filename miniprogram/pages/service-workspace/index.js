Page({
  data: {
    serviceInfo: {
      serviceNumber: 0,
      name: '客服',
      avatar: ''
    },
    stats: {
      pending: 0,
      processing: 0,
      urgent: 0
    },
    currentFilter: 'all',
    searchKeyword: '',
    allOrders: [],
    filteredOrders: []
  },

  onLoad() {
    this.loadServiceInfo()
    this.loadOrders()
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadOrders()
  },

  // 加载客服信息
  loadServiceInfo() {
    const userId = wx.getStorageSync('userId')
    const serviceList = wx.getStorageSync('service_list') || []
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 [客服工作台] 加载客服信息')
    console.log('  - 当前用户ID:', userId)
    console.log('  - 客服列表数量:', serviceList.length)
    
    if (serviceList.length > 0) {
      console.log('  - 客服列表详情:')
      serviceList.forEach((s, index) => {
        console.log(`    ${index + 1}. ID:${s.userId} 编号:${s.serviceNumber} 姓名:${s.name}`)
        console.log(`       头像: ${s.avatar ? s.avatar.substring(0, 50) + '...' : '无'}`)
      })
    }
    
    const myService = serviceList.find(s => s.userId == userId)

    if (myService) {
      console.log('✅ 找到匹配的客服记录:')
      console.log('  - 客服编号:', myService.serviceNumber)
      console.log('  - 客服姓名:', myService.name)
      console.log('  - 客服昵称:', myService.nickName)
      console.log('  - 头像URL:', myService.avatar ? myService.avatar.substring(0, 80) + '...' : '无')
      
      this.setData({
        serviceInfo: {
          serviceNumber: myService.serviceNumber,
          name: myService.name,
          avatar: myService.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzRGQzNGNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lrqI8L3RleHQ+PC9zdmc+'
        }
      })
      console.log('✅ 客服信息已设置到页面')
    } else {
      console.warn('❌ 未找到当前用户的客服信息')
      console.warn('  - 查找条件: userId =', userId)
      console.warn('  - 可能原因: 该用户未被添加为客服')
      wx.showToast({
        title: '未找到客服信息',
        icon: 'none'
      })
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  },

  // 加载订单
  loadOrders() {
    const userId = wx.getStorageSync('userId')
    
    // 从本地存储加载真实订单（同时读取 orders 和 pending_orders）
    const orders = wx.getStorageSync('orders') || []
    const pendingOrders = wx.getStorageSync('pending_orders') || []
    
    // 合并订单（去重，以 id 为准）
    const orderMap = new Map()
    ;[...orders, ...pendingOrders].forEach(order => {
      if (order.id && !orderMap.has(order.id)) {
        orderMap.set(order.id, order)
      }
    })
    const allOrders = Array.from(orderMap.values())
    
    // 筛选属于该客服的订单
    const myOrders = allOrders.filter(order => {
      return order.serviceId === userId || !order.serviceId
    })

    console.log('📦 客服订单加载:')
    console.log('  - orders 数量:', orders.length)
    console.log('  - pending_orders 数量:', pendingOrders.length)
    console.log('  - 合并后订单数量:', allOrders.length)
    console.log('  - 客服ID:', userId)
    console.log('  - 我的订单数:', myOrders.length)

    // 处理订单状态文本和业务状态
    const now = new Date()
    const processedOrders = myOrders.map(order => {
      let businessStatus = ''
      let isOverdue = false
      
      if (order.deadline && (order.status === 'processing' || order.status === 'paid' || order.status === 'waitingConfirm')) {
        const deadline = new Date(order.deadline)
        const diffTime = deadline - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffTime < 0) {
          isOverdue = true
          businessStatus = '已拖稿'
        } else if (diffDays <= 2) {
          businessStatus = '临近截稿'
        } else if (order.status === 'waitingConfirm') {
          businessStatus = '待客户确认'
        }
      }
      
      // 计算进度百分比
      let progressPercent = 0
      if (order.createdAt && order.deadline) {
        const createTime = new Date(order.createdAt).getTime()
        const deadline = new Date(order.deadline).getTime()
        const now = Date.now()
        const totalTime = deadline - createTime
        const elapsedTime = now - createTime
        
        if (totalTime > 0) {
          progressPercent = Math.min(Math.max((elapsedTime / totalTime) * 100, 0), 100)
        }
      }
      
      return {
        ...order,
        statusText: this.getStatusText(order.status),
        businessStatus: businessStatus,
        isOverdue: isOverdue,
        progressPercent: progressPercent,
        createTime: this.formatTime(order.createdAt),
        deadline: this.formatTime(order.deadline)
      }
    })

    // 计算统计数据
    const stats = {
      pending: processedOrders.filter(o => o.status === 'created').length,
      processing: processedOrders.filter(o => o.status === 'processing').length,
      urgent: processedOrders.filter(o => {
        // 紧急订单：临近截稿或已拖稿
        if (!o.deadline) return false
        const now = new Date()
        const deadline = new Date(o.deadline)
        const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24)
        return daysLeft <= 1 || daysLeft < 0
      }).length
    }

    this.setData({
      allOrders: processedOrders,
      stats: stats
    })

    // 应用当前筛选
    this.applyFilter()
  },

  // 切换筛选
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      currentFilter: filter
    })
    this.applyFilter()
  },

  // 应用筛选
  applyFilter() {
    const { currentFilter, searchKeyword, allOrders } = this.data
    let filtered = allOrders

    // 1. 按状态筛选
    if (currentFilter === 'processing') {
      filtered = allOrders.filter(o => o.status === 'created' || o.status === 'processing')
    } else if (currentFilter === 'completed') {
      filtered = allOrders.filter(o => o.status === 'completed')
    }

    // 2. 按搜索关键词筛选
    if (searchKeyword && searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase()
      filtered = filtered.filter(order => {
        const orderNo = (order.orderNumber || order.id || '').toLowerCase()
        const productName = (order.productName || '').toLowerCase()
        return orderNo.includes(keyword) || productName.includes(keyword)
      })
    }

    this.setData({
      filteredOrders: filtered
    })

    console.log('🔍 筛选结果:', currentFilter, '搜索:', searchKeyword, '共', filtered.length, '条')
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    // 实时搜索
    this.applyFilter()
  },

  // 搜索确认
  onSearchConfirm() {
    this.applyFilter()
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    })
    this.applyFilter()
  },

  // 快速筛选（点击统计卡片）
  filterOrders(e) {
    const filter = e.currentTarget.dataset.filter
    
    if (filter === 'pending') {
      this.setData({ currentFilter: 'processing' })
    } else if (filter === 'urgent') {
      // 紧急订单筛选
      const urgentOrders = this.data.allOrders.filter(o => {
        if (!o.deadline) return false
        const now = new Date()
        const deadline = new Date(o.deadline)
        const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24)
        return daysLeft <= 1 || daysLeft < 0
      })
      this.setData({
        currentFilter: 'urgent',
        filteredOrders: urgentOrders
      })
      return
    } else {
      this.setData({ currentFilter: filter })
    }
    
    this.applyFilter()
  },

  // 查看订单详情
  viewOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 联系买家
  contactBuyer(e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.allOrders.find(o => o.id === orderId)
    
    if (order && order.buyerName) {
      wx.showModal({
        title: '联系买家',
        content: `买家：${order.buyerName}\n\n请通过微信联系买家沟通订单详情`,
        showCancel: false
      })
    }
  },

  // 查看详情
  viewDetail(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 查看数据统计
  viewStats() {
    wx.showModal({
      title: '数据统计',
      content: '数据统计功能开发中',
      showCancel: false
    })
  },

  // 查看提现记录
  viewWithdraw() {
    wx.navigateTo({
      url: '/pages/withdraw/index'
    })
  },

  // 发起退款（客服）
  initiateRefund(e) {
    const orderId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认退款',
      content: '确认对此订单进行退款操作？\n\n退款后订单状态将变为"已退款"，此操作不可撤销。',
      confirmText: '确认退款',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.doRefund(orderId)
        }
      }
    })
  },

  // 执行退款
  doRefund(orderId) {
    // 同时从两个存储源读取
    let ordersFromOrders = wx.getStorageSync('orders') || []
    let ordersFromPending = wx.getStorageSync('pending_orders') || []
    
    // 先在 pending_orders 中查找
    const pendingIndex = ordersFromPending.findIndex(o => o.id === orderId)
    if (pendingIndex !== -1) {
      ordersFromPending[pendingIndex].status = 'refunded'
      ordersFromPending[pendingIndex].refundTime = new Date().toISOString()
      wx.setStorageSync('pending_orders', ordersFromPending)
    }
    
    // 再在 orders 中查找（如果存在）
    const orderIndex = ordersFromOrders.findIndex(o => o.id === orderId)
    if (orderIndex !== -1) {
      ordersFromOrders[orderIndex].status = 'refunded'
      ordersFromOrders[orderIndex].refundTime = new Date().toISOString()
      wx.setStorageSync('orders', ordersFromOrders)
    }

    if (pendingIndex === -1 && orderIndex === -1) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }

    console.log('✅ [客服] 订单已退款:')
    console.log('  - 订单ID:', orderId)
    console.log('  - 退款时间:', new Date().toLocaleString())

    wx.showToast({
      title: '退款成功',
      icon: 'success'
    })

    // 刷新订单列表
    this.loadOrders()
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'created': '待处理',
      'paid': '已支付',
      'processing': '进行中',
      'inProgress': '进行中',
      'waitingConfirm': '待确认',
      'nearDeadline': '临近截稿',
      'overdue': '已拖稿',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunded': '已退款',
      'refunding': '退款中'
    }
    return statusMap[status] || '待处理'
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  }
})

