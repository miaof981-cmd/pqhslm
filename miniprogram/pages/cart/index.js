Page({
  data: {
    loading: true,
    cartItems: [],
    recommendProducts: [],
    allSelected: false,
    selectedCount: 0,
    totalPrice: '0.00'
  },

  onLoad() {
    this.loadCart()
    this.loadRecommend()
  },

  onShow() {
    this.loadCart()
  },

  // 加载购物车
  async loadCart() {
    this.setData({ loading: true })
    
    try {
      // 模拟加载购物车数据
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockCartItems = [
        {
          _id: 'cart-1',
          productId: '1',
          productName: '精美头像设计',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小A',
          price: '88.00',
          quantity: 1,
          spec: '小尺寸',
          selected: false
        },
        {
          _id: 'cart-2',
          productId: '2',
          productName: '创意插画作品',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小B',
          price: '168.00',
          quantity: 2,
          spec: '',
          selected: false
        },
        {
          _id: 'cart-3',
          productId: '3',
          productName: 'LOGO设计',
          productImage: 'https://via.placeholder.com/150',
          artistName: '画师小C',
          price: '299.00',
          quantity: 1,
          spec: '标准版',
          selected: false
        }
      ]

      this.setData({ cartItems: mockCartItems })
      this.calculateTotal()
    } catch (error) {
      console.error('加载购物车失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载推荐商品
  async loadRecommend() {
    try {
      const mockRecommend = [
        {
          _id: '101',
          name: '可爱头像',
          image: 'https://via.placeholder.com/200',
          price: '58.00'
        },
        {
          _id: '102',
          name: '简约LOGO',
          image: 'https://via.placeholder.com/200',
          price: '188.00'
        },
        {
          _id: '103',
          name: '海报设计',
          image: 'https://via.placeholder.com/200',
          price: '128.00'
        },
        {
          _id: '104',
          name: '表情包',
          image: 'https://via.placeholder.com/200',
          price: '48.00'
        }
      ]

      this.setData({ recommendProducts: mockRecommend })
    } catch (error) {
      console.error('加载推荐失败', error)
    }
  },

  // 切换单个商品选择
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const cartItems = this.data.cartItems.map(item => {
      if (item._id === id) {
        return { ...item, selected: !item.selected }
      }
      return item
    })

    this.setData({ cartItems })
    this.calculateTotal()
  },

  // 切换全选
  toggleSelectAll() {
    const allSelected = !this.data.allSelected
    const cartItems = this.data.cartItems.map(item => ({
      ...item,
      selected: allSelected
    }))

    this.setData({ cartItems, allSelected })
    this.calculateTotal()
  },

  // 计算总价
  calculateTotal() {
    const selectedItems = this.data.cartItems.filter(item => item.selected)
    const selectedCount = selectedItems.length
    const totalPrice = selectedItems.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity
    }, 0).toFixed(2)

    const allSelected = selectedCount > 0 && selectedCount === this.data.cartItems.length

    this.setData({
      selectedCount,
      totalPrice,
      allSelected
    })
  },

  // 减少数量
  decreaseQuantity(e) {
    const id = e.currentTarget.dataset.id
    const cartItems = this.data.cartItems.map(item => {
      if (item._id === id && item.quantity > 1) {
        return { ...item, quantity: item.quantity - 1 }
      }
      return item
    })

    this.setData({ cartItems })
    this.calculateTotal()
  },

  // 增加数量
  increaseQuantity(e) {
    const id = e.currentTarget.dataset.id
    const cartItems = this.data.cartItems.map(item => {
      if (item._id === id) {
        return { ...item, quantity: item.quantity + 1 }
      }
      return item
    })

    this.setData({ cartItems })
    this.calculateTotal()
  },

  // 删除商品
  deleteItem(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件商品吗？',
      success: (res) => {
        if (res.confirm) {
          const cartItems = this.data.cartItems.filter(item => item._id !== id)
          this.setData({ cartItems })
          this.calculateTotal()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 查看商品详情
  viewProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${id}`
    })
  },

  // 去逛逛
  goShopping() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  // 结算
  checkout() {
    if (this.data.selectedCount === 0) {
      wx.showToast({ title: '请选择要结算的商品', icon: 'none' })
      return
    }

    const selectedItems = this.data.cartItems.filter(item => item.selected)
    
    // 模拟结算
    wx.showModal({
      title: '确认结算',
      content: `共${selectedItems.length}件商品，合计¥${this.data.totalPrice}`,
      confirmText: '去支付',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '创建订单中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '订单创建成功', icon: 'success' })
            // 移除已结算商品
            const cartItems = this.data.cartItems.filter(item => !item.selected)
            this.setData({ cartItems })
            this.calculateTotal()
            
            // 跳转到订单列表
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/order-list/index?status=unpaid'
              })
            }, 1500)
          }, 1000)
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCart()
    wx.stopPullDownRefresh()
  }
})
