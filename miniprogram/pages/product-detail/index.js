Page({
  data: {
    productId: '',
    product: null,
    artist: null,
    showServiceQR: false,
    serviceQR: null,
    orderQR: null,
    hasOrder: false,
    loading: true
  },

  onLoad(options) {
    this.setData({
      productId: options.id
    })
    this.loadProduct()
  },

  // 加载商品详情
  async loadProduct() {
    this.setData({ loading: true })
    
    try {
      // 从本地存储加载商品
      const products = wx.getStorageSync('mock_products') || []
      const product = products.find(p => p.id === this.data.productId)
      
      console.log('=== 商品详情页加载 ===')
      console.log('productId:', this.data.productId)
      console.log('本地商品数量:', products.length)
      console.log('找到的商品:', product)
      
      if (!product) {
        wx.showToast({ 
          title: '商品不存在或已下架', 
          icon: 'none',
          duration: 2000
        })
        console.error('商品ID不存在:', this.data.productId)
        setTimeout(() => wx.navigateBack(), 2000)
        return
      }
      
      // 计算显示价格
      let displayPrice = parseFloat(product.basePrice) || parseFloat(product.price) || 0
      
      // 如果有规格，计算最低价
      if (product.specs && product.specs.length > 0) {
        const spec1 = product.specs[0]
        if (spec1.values && spec1.values.length > 0) {
          const prices = []
          
          if (product.specs.length > 1 && product.specs[1].values) {
            // 两级规格
            spec1.values.forEach(v1 => {
              product.specs[1].values.forEach(v2 => {
                const price1 = parseFloat(v1.addPrice) || 0
                const price2 = parseFloat(v2.addPrice) || 0
                prices.push(price1 + price2)
              })
            })
          } else {
            // 一级规格
            spec1.values.forEach(v1 => {
              prices.push(parseFloat(v1.addPrice) || 0)
            })
          }
          
          if (prices.length > 0) {
            displayPrice = Math.min(...prices)
          }
        }
      }
      
      this.setData({
        product: {
          ...product,
          price: displayPrice
        },
        artist: product.artist || { name: '画师' },
        serviceQR: {
          imageUrl: 'https://via.placeholder.com/200x200.png?text=客服二维码'
        },
        loading: false
      })
      
      console.log('商品数据加载完成，显示价格:', displayPrice)
      
    } catch (error) {
      console.error('加载商品失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },
  

  // 加载画师信息
  async loadArtist(artistId) {
    // 暂时使用模拟数据
    this.setData({ artist: { name: '示例画师' } })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const res = await wx.cloud.database().collection('users')
    //     .doc(artistId)
    //     .get()
    //   
    //   this.setData({ artist: res.data })
    // } catch (error) {
    //   console.error('加载画师信息失败', error)
    // }
  },

  // 检查是否有订单
  async checkOrder() {
    // 暂时设置为无订单
    this.setData({ hasOrder: false })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const app = getApp()
    //   const res = await wx.cloud.database().collection('orders')
    //     .where({
    //       buyerId: app.globalData.openid,
    //       productId: this.data.productId
    //     })
    //     .get()
    //   
    //   if (res.data.length > 0) {
    //     this.setData({ 
    //       hasOrder: true,
    //       orderQR: res.data[0].serviceQR
    //     })
    //   }
    // } catch (error) {
    //   console.error('检查订单失败', error)
    // }
  },

  // 加载客服二维码
  async loadServiceQR() {
    // 暂时使用模拟数据
    this.setData({ 
      serviceQR: {
        imageUrl: 'https://via.placeholder.com/200x200.png?text=客服二维码'
      }
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const res = await wx.cloud.database().collection('serviceQR')
    //     .where({ isActive: true })
    //     .get()
    //   
    //   if (res.data.length > 0) {
    //     // 随机选择一个二维码
    //     const randomIndex = Math.floor(Math.random() * res.data.length)
    //     this.setData({ serviceQR: res.data[randomIndex] })
    //   }
    // } catch (error) {
    //   console.error('加载客服二维码失败', error)
    // }
  },

  // 显示/隐藏客服二维码
  toggleServiceQR() {
    this.setData({
      showServiceQR: !this.data.showServiceQR
    })
  },

  // 购买商品
  async buyProduct() {
    if (!this.data.product) return
    
    wx.showToast({
      title: '模拟下单成功',
      icon: 'success'
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   wx.showLoading({ title: '创建订单中...' })
    //   
    //   const app = getApp()
    //   const now = new Date()
    //   const deadline = new Date(now.getTime() + this.data.product.deliveryDays * 24 * 60 * 60 * 1000)
    //   
    //   // 随机分配客服二维码
    //   let assignedQR = null
    //   if (this.data.serviceQR) {
    //     assignedQR = this.data.serviceQR.imageUrl
    //   }
    //   
    //   const orderData = {
    //     buyerId: app.globalData.openid,
    //     productId: this.data.productId,
    //     artistId: this.data.product.artistId,
    //     createTime: now,
    //     deadline: deadline,
    //     status: 'created',
    //     serviceQR: assignedQR,
    //     price: this.data.product.price
    //   }
    //   
    //   const res = await wx.cloud.database().collection('orders').add({
    //     data: orderData
    //   })
    //   
    //   wx.hideLoading()
    //   wx.showToast({
    //     title: '下单成功',
    //     icon: 'success'
    //   })
    //   
    //   // 跳转到订单详情
    //   setTimeout(() => {
    //     wx.navigateTo({
    //       url: `/pages/user-center/index?tab=orders`
    //     })
    //   }, 1500)
    //   
    // } catch (error) {
    //   wx.hideLoading()
    //   console.error('下单失败', error)
    //   wx.showToast({
    //     title: '下单失败',
    //     icon: 'none'
    //   })
    // }
  },

  // 查看画师主页
  viewArtist() {
    if (this.data.artist) {
      wx.navigateTo({
        url: `/pages/user-center/index?userId=${this.data.artist._id}`
      })
    }
  }
})