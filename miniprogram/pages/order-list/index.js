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
    emptyText: '暂无订单'
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ currentTab: options.status })
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
      
      const mockOrders = [
        {
          _id: 'ORD202401250001',
          orderNo: 'ORD202401250001',
          productId: '1',
          productName: '精美头像设计',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小A',
          deliveryDays: 3,
          amount: '88.00',
          status: 'processing',
          statusText: '制作中',
          progress: 60,
          createTime: '2024-01-25 10:30',
          deadline: '2024-01-28',
          reviewed: false
        },
        {
          _id: 'ORD202401240001',
          orderNo: 'ORD202401240001',
          productId: '2',
          productName: '创意插画作品',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小B',
          deliveryDays: 5,
          amount: '168.00',
          status: 'completed',
          statusText: '已完成',
          progress: 100,
          createTime: '2024-01-24 15:20',
          deadline: '2024-01-29',
          reviewed: false
        },
        {
          _id: 'ORD202401230001',
          orderNo: 'ORD202401230001',
          productId: '3',
          productName: 'LOGO设计',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小C',
          deliveryDays: 7,
          amount: '299.00',
          status: 'unpaid',
          statusText: '待支付',
          progress: 0,
          createTime: '2024-01-23 09:15',
          deadline: '2024-01-30',
          reviewed: false
        },
        {
          _id: 'ORD202401220001',
          orderNo: 'ORD202401220001',
          productId: '4',
          productName: '海报设计',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小D',
          deliveryDays: 4,
          amount: '199.00',
          status: 'completed',
          statusText: '已完成',
          progress: 100,
          createTime: '2024-01-22 14:30',
          deadline: '2024-01-26',
          reviewed: true
        },
        {
          _id: 'ORD202401210001',
          orderNo: 'ORD202401210001',
          productId: '5',
          productName: '表情包设计',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小E',
          deliveryDays: 2,
          amount: '58.00',
          status: 'cancelled',
          statusText: '已取消',
          progress: 0,
          createTime: '2024-01-21 11:00',
          deadline: '2024-01-23',
          reviewed: false
        }
      ]

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
      url: `/pages/order-detail/index?id=${id}`
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
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    })
    wx.showToast({ title: '请在订单详情页查看客服二维码', icon: 'none', duration: 2000 })
  },

  // 申请退款
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
  }
})
