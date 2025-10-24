Page({
  data: {
    cartItems: []
  },

  onLoad() {
    this.loadCart()
  },

  onShow() {
    this.loadCart()
  },

  loadCart() {
    this.setData({
      cartItems: []
    })
  }
})
