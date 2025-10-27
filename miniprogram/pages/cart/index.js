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
      // 从本地存储读取购物车数据
      let cartItems = wx.getStorageSync('cart_items') || []
      
      // 确保是数组
      if (!Array.isArray(cartItems)) {
        cartItems = []
      }
      
      // 获取所有商品数据，用于补充商品信息
      const allProducts = wx.getStorageSync('mock_products') || []
      
      // 补充商品信息（图片、名称等）
      cartItems = cartItems.map(cartItem => {
        const product = allProducts.find(p => p.id === cartItem.productId)
        if (product) {
          // 生成规格文本
          let specText = ''
          if (cartItem.spec1) {
            specText = cartItem.spec1
            if (cartItem.spec2) {
              specText += ' / ' + cartItem.spec2
            }
          }
          
          return {
            ...cartItem,
            productName: product.name || cartItem.productName,
            productImage: (product.images && product.images[0]) || cartItem.productImage || 'https://via.placeholder.com/150',
            artistName: product.artistName || '画师',
            // 如果购物车中没有价格，从商品中获取
            price: cartItem.price || this.getProductPrice(product, cartItem.spec1, cartItem.spec2),
            // 规格文本
            specText: specText
          }
        }
        return cartItem
      })
      
      // 保存更新后的购物车
      wx.setStorageSync('cart_items', cartItems)
      
      this.setData({ cartItems })
      this.calculateTotal()
    } catch (error) {
      console.error('加载购物车失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
  
  // 获取商品价格（根据规格）
  getProductPrice(product, spec1Name, spec2Name) {
    if (!product.specs || product.specs.length === 0) {
      return product.basePrice || product.price || '0.00'
    }
    
    // 查找匹配的规格价格
    let price = parseFloat(product.basePrice || product.price || 0)
    
    if (spec1Name && product.specs[0]) {
      const spec1 = product.specs[0].values.find(v => v.name === spec1Name)
      if (spec1) {
        price = parseFloat(spec1.addPrice || 0)
      }
    }
    
    if (spec2Name && product.specs[1]) {
      const spec2 = product.specs[1].values.find(v => v.name === spec2Name)
      if (spec2) {
        price += parseFloat(spec2.addPrice || 0)
      }
    }
    
    return price.toFixed(2)
  },

  // 加载推荐商品
  async loadRecommend() {
    try {
      // 从本地存储读取商品数据
      const allProducts = wx.getStorageSync('mock_products') || []
      
      // 过滤出上架的商品
      let onSaleProducts = allProducts.filter(p => p.isOnSale)
      
      // 随机排序
      onSaleProducts = onSaleProducts.sort(() => Math.random() - 0.5)
      
      // 取前4个作为推荐
      const recommendProducts = onSaleProducts.slice(0, 4).map(product => {
        // 计算显示价格
        let displayPrice = product.basePrice || product.price || '0.00'
        
        if (product.specs && product.specs.length > 0) {
          // 如果有规格，显示最低价格
          const prices = []
          
          if (product.specs[0]) {
            product.specs[0].values.forEach(spec1 => {
              if (product.specs[1]) {
                product.specs[1].values.forEach(spec2 => {
                  const price = parseFloat(spec1.addPrice || 0) + parseFloat(spec2.addPrice || 0)
                  prices.push(price)
                })
              } else {
                prices.push(parseFloat(spec1.addPrice || 0))
              }
            })
          }
          
          if (prices.length > 0) {
            displayPrice = Math.min(...prices).toFixed(2)
          }
        }
        
        return {
          _id: product.id,
          name: product.name,
          image: (product.images && product.images[0]) || 'https://via.placeholder.com/200',
          price: displayPrice
        }
      })
      
      this.setData({ recommendProducts })
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

    // 保存到本地存储
    wx.setStorageSync('cart_items', cartItems)
    
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

    // 保存到本地存储
    wx.setStorageSync('cart_items', cartItems)
    
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
          
          // 保存到本地存储
          wx.setStorageSync('cart_items', cartItems)
          
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
    
    // 如果只有一件商品，直接跳转到订单成功页
    if (selectedItems.length === 1) {
      const item = selectedItems[0]
      
      wx.showLoading({ title: '创建订单中...', mask: true })
      
      setTimeout(() => {
        wx.hideLoading()
        
        // 移除已结算商品
        const remainingItems = this.data.cartItems.filter(i => !i.selected)
        wx.setStorageSync('cart_items', remainingItems)
        
        // 跳转到订单成功页面
        wx.redirectTo({
          url: `/pages/order-success/index?productId=${item.productId || ''}&productName=${encodeURIComponent(item.productName)}&productImage=${encodeURIComponent(item.image || '/assets/default-product.png')}&spec1=${encodeURIComponent(item.spec1 || '')}&spec2=${encodeURIComponent(item.spec2 || '')}&quantity=${item.quantity}&price=${item.price}&totalAmount=${parseFloat(item.price) * item.quantity}&deliveryDays=${item.deliveryDays || 7}`
        })
      }, 1000)
    } else {
      // 多件商品，显示确认对话框
      wx.showModal({
        title: '确认结算',
        content: `共${selectedItems.length}件商品，合计¥${this.data.totalPrice}`,
        confirmText: '去支付',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '创建订单中...' })
            setTimeout(() => {
              wx.hideLoading()
              
              // 移除已结算商品
              const remainingItems = this.data.cartItems.filter(item => !item.selected)
              wx.setStorageSync('cart_items', remainingItems)
              
              // 跳转到订单成功页面（使用第一件商品的信息）
              const firstItem = selectedItems[0]
              wx.redirectTo({
                url: `/pages/order-success/index?productId=${firstItem.productId || ''}&productName=${encodeURIComponent(firstItem.productName + ' 等' + selectedItems.length + '件商品')}&productImage=${encodeURIComponent(firstItem.image || '/assets/default-product.png')}&spec1=&spec2=&quantity=${selectedItems.reduce((sum, item) => sum + item.quantity, 0)}&price=${this.data.totalPrice}&totalAmount=${this.data.totalPrice}&deliveryDays=${firstItem.deliveryDays || 7}`
              })
            }, 1000)
          }
        }
      })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCart()
    wx.stopPullDownRefresh()
  }
})
