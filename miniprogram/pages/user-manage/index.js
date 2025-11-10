const orderHelper = require('../../utils/order-helper.js')

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

Page({
  data: {
    loading: true,
    pageType: 'all', // 'all' 所有用户 | 'buyers' 下单用户
    dateFilter: 'today', // 'today' | 'yesterday' | 'week' | 'month'
    searchKeyword: '',
    
    userList: [],
    displayUsers: [],
    sortBy: 'totalSpent', // 'totalSpent' | 'orderCount' | 'lastOrderTime'
    sortOrder: 'desc', // 'asc' | 'desc'
    
    stats: {
      totalUsers: 0,
      totalSpent: 0,
      totalOrders: 0,
      avgSpent: 0
    }
  },

  onLoad(options) {
    const pageType = options.type || 'all'
    const dateFilter = options.date || 'today'
    
    this.setData({
      pageType: pageType,
      dateFilter: dateFilter
    })
    
    this.loadUserList()
  },

  // 加载用户列表
  loadUserList() {
    this.setData({ loading: true })
    
    try {
      // 1. 获取所有订单
      const allOrders = orderHelper.getAllOrders()
      console.log('📊 加载订单数据:', allOrders.length, '个订单')
      
      // 2. 根据页面类型筛选订单
      let filteredOrders = allOrders
      if (this.data.pageType === 'buyers') {
        filteredOrders = this.filterOrdersByDate(allOrders)
        console.log(`📊 筛选${this.data.dateFilter}订单:`, filteredOrders.length, '个')
      }
      
      // 3. 统计用户数据
      const userMap = new Map()
      
      filteredOrders.forEach(order => {
        const buyerId = order.buyerId || order.customerId || order.userId
        if (!buyerId) return
        
        if (!userMap.has(buyerId)) {
          userMap.set(buyerId, {
            userId: buyerId,
            nickName: order.buyerName || order.customerName || order.userName || '未知用户',
            avatar: order.buyerAvatar || order.customerAvatar || order.userAvatar || '',
            totalSpent: 0,
            orderCount: 0,
            orders: [],
            lastOrderTime: null,
            firstOrderTime: null
          })
        }
        
        const user = userMap.get(buyerId)
        user.totalSpent += parseFloat(order.price || order.totalAmount || 0)
        user.orderCount += 1
        user.orders.push(order)
        
        // 🔧 iOS兼容：使用parseDate函数
        const orderTime = parseDate(order.createdAt || order.createTime || order.orderTime)
        if (!user.lastOrderTime || orderTime > parseDate(user.lastOrderTime)) {
          user.lastOrderTime = order.createdAt || order.createTime || order.orderTime
        }
        if (!user.firstOrderTime || orderTime < parseDate(user.firstOrderTime)) {
          user.firstOrderTime = order.createdAt || order.createTime || order.orderTime
        }
      })
      
      // 4. 转换为数组
      const userList = Array.from(userMap.values()).map(user => ({
        ...user,
        totalSpent: Number(user.totalSpent.toFixed(2)),
        avgOrderAmount: Number((user.totalSpent / user.orderCount).toFixed(2)), // 🎯 预计算人均订单金额
        lastOrderTime: this.formatTime(user.lastOrderTime),
        firstOrderTime: this.formatTime(user.firstOrderTime)
      }))
      
      // 5. 计算统计数据
      const stats = {
        totalUsers: userList.length,
        totalSpent: userList.reduce((sum, u) => sum + u.totalSpent, 0).toFixed(2),
        totalOrders: userList.reduce((sum, u) => sum + u.orderCount, 0),
        avgSpent: userList.length > 0 
          ? (userList.reduce((sum, u) => sum + u.totalSpent, 0) / userList.length).toFixed(2)
          : 0
      }
      
      console.log('📊 用户统计:', stats)
      
      this.setData({
        userList: userList,
        displayUsers: userList,
        stats: stats,
        loading: false
      })
      
      // 默认按消费金额排序
      this.sortUsers('totalSpent', 'desc')
      
    } catch (error) {
      console.error('❌ 加载用户列表失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 根据日期筛选订单
  filterOrdersByDate(orders) {
    const { dateFilter } = this.data
    if (dateFilter === 'all') return orders
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    let startTime, endTime
    
    switch (dateFilter) {
      case 'today':
        startTime = today
        endTime = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'yesterday':
        startTime = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        endTime = today
        break
      case 'week':
        startTime = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        endTime = now
        break
      case 'month':
        startTime = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        endTime = now
        break
      default:
        return orders
    }
    
    return orders.filter(order => {
      const orderTime = new Date(order.createdAt || order.createTime || order.orderTime)
      return orderTime >= startTime && orderTime < endTime
    })
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return '未知'
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 搜索用户
  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase().trim()
    this.setData({ searchKeyword: keyword })
    
    if (!keyword) {
      this.setData({ displayUsers: this.data.userList })
      return
    }
    
    const filtered = this.data.userList.filter(user => {
      return user.userId.toLowerCase().includes(keyword) ||
             user.nickName.toLowerCase().includes(keyword)
    })
    
    this.setData({ displayUsers: filtered })
  },

  // 排序用户
  sortUsers(sortBy, sortOrder) {
    const users = [...this.data.displayUsers]
    
    users.sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'totalSpent':
          aVal = a.totalSpent
          bVal = b.totalSpent
          break
        case 'orderCount':
          aVal = a.orderCount
          bVal = b.orderCount
          break
        case 'lastOrderTime':
          aVal = new Date(a.lastOrderTime || 0).getTime()
          bVal = new Date(b.lastOrderTime || 0).getTime()
          break
        default:
          return 0
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })
    
    this.setData({
      displayUsers: users,
      sortBy: sortBy,
      sortOrder: sortOrder
    })
  },

  // 切换排序
  toggleSort(e) {
    const { sort } = e.currentTarget.dataset
    const currentSort = this.data.sortBy
    const currentOrder = this.data.sortOrder
    
    let newOrder = 'desc'
    if (sort === currentSort) {
      newOrder = currentOrder === 'desc' ? 'asc' : 'desc'
    }
    
    this.sortUsers(sort, newOrder)
  },

  // 查看用户详情
  viewUserDetail(e) {
    const { userId } = e.currentTarget.dataset
    const user = this.data.userList.find(u => u.userId === userId)
    
    if (!user) return
    
    const orderIds = user.orders.map(o => o.id).join(',')
    
    wx.showModal({
      title: user.nickName,
      content: `用户ID: ${user.userId}\n订单数: ${user.orderCount}笔\n总消费: ¥${user.totalSpent}\n首次下单: ${user.firstOrderTime}\n最近下单: ${user.lastOrderTime}`,
      confirmText: '查看订单',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到订单页面并筛选该用户的订单
          wx.showToast({
            title: '订单详情功能待开发',
            icon: 'none'
          })
        }
      }
    })
  },

  // 复制用户ID
  copyUserId(e) {
    const { userId } = e.currentTarget.dataset
    wx.setClipboardData({
      data: userId,
      success: () => {
        wx.showToast({
          title: '已复制用户ID',
          icon: 'success'
        })
      }
    })
  }
})
