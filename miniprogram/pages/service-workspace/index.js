const orderStatusUtil = require('../../utils/order-status.js')

Page({
  data: {
    loading: true,
    hasPermission: false,
    serviceInfo: {
      serviceNumber: 0,
      name: '客服',
      avatar: ''
    },
    pendingStats: {
      inProgress: 0,
      nearDeadline: 0,
      overdue: 0
    },
    currentFilter: 'all',
    searchKeyword: '',
    showNotices: false,
    notices: [
      { id: 1, content: '客服应及时回复客户咨询' },
      { id: 2, content: '遇到纠纷请第一时间联系管理员' },
      { id: 3, content: '保护客户隐私，不得泄露订单信息' }
    ],
    allOrders: [],
    filteredOrders: []
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    if (this.data.hasPermission) {
      this.loadOrders()
    }
  },

  // 检查权限
  checkPermission() {
    const roles = wx.getStorageSync('userRoles') || []
    const hasServiceRole = roles.includes('service')
    
    if (hasServiceRole) {
      this.setData({
        loading: false,
        hasPermission: true
      })
      this.loadServiceInfo()
      this.loadOrders()
    } else {
      this.setData({
        loading: false,
        hasPermission: false
      })
      wx.showToast({
        title: '无客服权限',
        icon: 'none'
      })
    }
  },

  // 加载客服信息
  loadServiceInfo() {
    const userId = wx.getStorageSync('userId')
    const serviceList = wx.getStorageSync('service_list') || []
    const myService = serviceList.find(s => s.userId == userId)

    if (myService) {
      this.setData({
        serviceInfo: {
          serviceNumber: myService.serviceNumber,
          name: myService.name,
          avatar: myService.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzRGQzNGNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lrqI8L3RleHQ+PC9zdmc+'
        }
      })
    }
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
    
    // 筛选属于该客服的订单（或未分配的）
    const myOrders = allOrders.filter(order => {
      return order.serviceId === userId || !order.serviceId
    })

    // 自动计算订单的状态和进度
    const processedOrders = orderStatusUtil.calculateOrdersStatus(myOrders)

    // 为每个订单计算进度百分比和格式化时间，并补充头像信息
    const finalOrders = processedOrders.map(order => {
      const progressPercent = this.calculateProgressPercent(order)
      
      // 获取买家头像（从用户信息或使用默认头像）
      let buyerAvatar = order.buyerAvatar || '/assets/default-avatar.png'
      if (!order.buyerAvatar && order.userId) {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.userId === order.userId) {
          buyerAvatar = userInfo.avatarUrl || '/assets/default-avatar.png'
        }
      }
      
      // 获取画师头像
      const artistAvatar = order.artistAvatar || '/assets/default-avatar.png'
      
      return {
        ...order,
        progressPercent,
        statusText: this.getStatusText(order.status),
        businessStatus: this.getBusinessStatus(order),
        createTime: this.formatTime(order.createTime || order.createdAt),
        deadline: this.formatTime(order.deadline),
        buyerAvatar,
        artistAvatar,
        buyerName: order.buyerName || order.userName || '客户',
        artistName: order.artistName || '待分配'
      }
    })

    // 统计订单状态
    const stats = orderStatusUtil.countOrderStatus(finalOrders)

    this.setData({
      allOrders: finalOrders,
      pendingStats: {
        inProgress: stats.inProgress,
        nearDeadline: stats.nearDeadline,
        overdue: stats.overdue
      }
    })

    // 应用当前筛选
    this.applyFilter()
  },

  // 获取业务状态
  getBusinessStatus(order) {
    if (!order.deadline) return ''
    
    const now = Date.now()
    const deadline = new Date(order.deadline).getTime()
    const diffTime = deadline - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (order.status === 'waitingConfirm') {
      return '待客户确认'
    }
    
    if (order.status === 'processing' || order.status === 'paid' || order.status === 'inProgress') {
      if (diffTime < 0) {
        return '已拖稿'
      } else if (diffDays <= 2) {
        return '临近截稿'
      }
    }
    
    return ''
  },

  // 计算进度百分比
  calculateProgressPercent(order) {
    const createTimeStr = order.createTime || order.createdAt
    if (!createTimeStr || !order.deadline) return 0
    
    const createTime = new Date(createTimeStr).getTime()
    const deadline = new Date(order.deadline).getTime()
    const now = Date.now()
    const totalTime = deadline - createTime
    const elapsedTime = now - createTime
    
    if (totalTime <= 0) return 0
    
    let percent = (elapsedTime / totalTime) * 100
    
    // 临近截稿或已拖稿时，进度条显示100%
    if (percent >= 100) percent = 100
    if (percent < 0) percent = 0
    
    return percent
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
  },

  // 筛选订单
  filterOrders(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ currentFilter: filter })
    this.applyFilter()
  },

  // 应用筛选
  applyFilter() {
    const { currentFilter, searchKeyword, allOrders } = this.data
    let filtered = allOrders

    // 1. 按状态筛选
    if (currentFilter === 'urgent') {
      // 紧急订单：临近截稿 + 已拖稿
      filtered = allOrders.filter(o => {
        return o.businessStatus === '临近截稿' || o.businessStatus === '已拖稿'
      })
    } else if (currentFilter === 'inProgress') {
      filtered = allOrders.filter(o => o.status === 'processing' || o.status === 'inProgress')
    } else if (currentFilter === 'waitingConfirm') {
      filtered = allOrders.filter(o => o.status === 'waitingConfirm')
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

    // 3. 🎯 智能排序（优先级 + 时间）
    filtered = this.sortOrdersByPriority(filtered)

    this.setData({ filteredOrders: filtered })
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

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.applyFilter()
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.applyFilter()
  },

  // 切换须知显示
  toggleNotices() {
    this.setData({ showNotices: !this.data.showNotices })
  },

  // 处理功能点击
  handleFunction(e) {
    const func = e.currentTarget.dataset.func
    
    switch(func) {
      case 'dataStats':
        wx.navigateTo({ url: '/pages/data-stats/index' })
        break
      case 'withdraw':
        wx.navigateTo({ url: '/pages/withdraw/index' })
        break
      case 'qrcodeManage':
        // 跳转到客服二维码管理页
        wx.showToast({ title: '二维码管理', icon: 'none' })
        break
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  },

  // 查看订单详情
  viewOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 复制订单号
  copyOrderNo(e) {
    const orderId = e.currentTarget.dataset.id
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
  copyGroupName(e) {
    const order = e.currentTarget.dataset.order
    if (!order) return

    // 获取订单号后四位
    const orderId = order.id || order.orderNumber || ''
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

  // 联系客户
  contactCustomer(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 处理退款
  handleRefund(e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.allOrders.find(o => o.id === orderId)
    
    if (!order) return
    
    wx.showModal({
      title: '确认退款',
      content: `确定要为订单 ${order.id} 处理退款吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doRefund(orderId)
        }
      }
    })
  },

  // 执行退款
  doRefund(orderId) {
    // 更新订单状态
    const orders = wx.getStorageSync('orders') || []
    const pendingOrders = wx.getStorageSync('pending_orders') || []
    
    // 更新两个数据源
    const updateStatus = (list) => {
      return list.map(o => {
        if (o.id === orderId) {
          return { ...o, status: 'refunded' }
        }
        return o
      })
    }
    
    wx.setStorageSync('orders', updateStatus(orders))
    wx.setStorageSync('pending_orders', updateStatus(pendingOrders))
    
    wx.showToast({
      title: '退款成功',
      icon: 'success'
    })
    
    // 刷新订单列表
    this.loadOrders()
  }
})
