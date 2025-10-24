Page({
  data: {
    currentTab: 'all',
    orders: [],
    loading: true
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
    
    // 模拟加载订单数据
    const allOrders = [
      {
        _id: 'order-1',
        status: 'created',
        productName: '精美头像设计',
        productImage: 'https://via.placeholder.com/150x150.png?text=商品1',
        price: 88,
        createTime: '2024-01-01',
        deadline: '2024-01-04'
      },
      {
        _id: 'order-2',
        status: 'completed',
        productName: '创意插画作品',
        productImage: 'https://via.placeholder.com/150x150.png?text=商品2',
        price: 168,
        createTime: '2024-01-02',
        deadline: '2024-01-05'
      },
      {
        _id: 'order-3',
        status: 'created',
        productName: 'LOGO设计',
        productImage: 'https://via.placeholder.com/150x150.png?text=商品3',
        price: 299,
        createTime: '2024-01-03',
        deadline: '2024-01-10'
      }
    ]

    // 根据当前标签筛选
    let filteredOrders = allOrders
    if (this.data.currentTab !== 'all') {
      filteredOrders = allOrders.filter(order => order.status === this.data.currentTab)
    }

    this.setData({
      orders: filteredOrders,
      loading: false
    })
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.loadOrders()
  },

  // 查看订单详情
  viewOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  }
})
