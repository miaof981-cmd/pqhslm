Page({
  data: {
    orderId: '',
    order: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id })
      this.loadOrder()
    }
  },

  // 加载订单详情
  async loadOrder() {
    // 模拟加载订单数据
    this.setData({
      order: {
        _id: this.data.orderId,
        status: 'created',
        productName: '精美头像设计',
        productImage: 'https://via.placeholder.com/300x300.png?text=商品图',
        price: 88,
        deliveryDays: 3,
        createTime: '2024-01-01 10:00:00',
        deadline: '2024-01-04 10:00:00',
        artistName: '设计师小王',
        artistAvatar: 'https://via.placeholder.com/50x50.png?text=王',
        buyerName: '妙妙',
        serviceQR: 'https://via.placeholder.com/200x200.png?text=客服二维码',
        remark: '希望设计风格可爱一些'
      },
      loading: false
    })
  },

  // 查看客服二维码
  viewServiceQR() {
    wx.previewImage({
      urls: [this.data.order.serviceQR],
      current: this.data.order.serviceQR
    })
  },

  // 联系画师
  contactArtist() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 取消订单
  cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已取消订单',
            icon: 'success'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  }
})
