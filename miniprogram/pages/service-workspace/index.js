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
    const allOrders = wx.getStorageSync('orders') || []
    
    // 筛选属于该客服的订单
    const myOrders = allOrders.filter(order => {
      return order.serviceId === userId || !order.serviceId
    })

    console.log('📦 客服订单加载:')
    console.log('  - 客服ID:', userId)
    console.log('  - 我的订单数:', myOrders.length)

    // 处理订单状态文本
    const processedOrders = myOrders.map(order => {
      return {
        ...order,
        statusText: this.getStatusText(order.status),
        createTime: this.formatTime(order.createdAt)
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
    const { currentFilter, allOrders } = this.data
    let filtered = allOrders

    if (currentFilter === 'processing') {
      filtered = allOrders.filter(o => o.status === 'created' || o.status === 'processing')
    } else if (currentFilter === 'completed') {
      filtered = allOrders.filter(o => o.status === 'completed')
    }

    this.setData({
      filteredOrders: filtered
    })

    console.log('🔍 筛选结果:', currentFilter, '共', filtered.length, '条')
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

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'created': '待处理',
      'processing': '进行中',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunded': '已退款'
    }
    return statusMap[status] || '未知'
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

