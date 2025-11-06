const categoryService = require('../../utils/category-service.js')

Page({
  data: {
    productId: '',
    product: null,
    summaryContent: [], // 解析后的商品简介内容（文本+图片混排）
    artist: null,
    showServiceQR: false,
    serviceQR: null,
    serviceInfo: null,
    orderQR: null,
    hasOrder: false,
    loading: true,
    
    // 购买弹窗相关
    showBuyModal: false,
    selectedSpec1: null, // 选中的一级规格
    selectedSpec2: null, // 选中的二级规格
    quantity: 1, // 购买数量
    currentPrice: 0, // 当前价格
    canSubmit: false, // 是否可以提交订单
    isAddingToCart: false, // 是否为加入购物车模式
    
    // 购物车相关
    cartCount: 0, // 购物车商品数量
    showCartAnimation: false, // 显示飞入动画
    animationImage: '', // 动画的商品图片
    
    // 已选规格文本
    selectedSpecText: ''
  },

  onLoad(options) {
    this.setData({
      productId: options.id
    })
    this.loadProduct()
    this.loadCartCount() // 加载购物车数量
  },
  
  onShow() {
    // 页面显示时更新购物车数量
    this.loadCartCount()
    this.loadServiceQR()
  },
  
  // 加载购物车数量
  loadCartCount() {
    const cartItems = wx.getStorageSync('cart_items') || []
    const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    this.setData({
      cartCount: totalCount
    })
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
      
      const categoryName = product.categoryName || categoryService.getCategoryNameById(product.category)
      const artistId = product.artistId || (product.artist && (product.artist.id || product.artist.userId)) || ''
      const artistName = product.artistName || (product.artist && (product.artist.name || product.artist.nickname)) || '画师'
      const artistAvatar = product.artistAvatar || (product.artist && (product.artist.avatar || product.artist.avatarUrl)) || ''

      // 解析商品简介中的图片占位符
      const summaryContent = this.parseSummaryContent(product.summary || '', product.summaryImages || [])
      
      console.log('解析后的商品简介:', summaryContent)
      
      this.setData({
        product: {
          ...product,
          price: displayPrice,
          categoryName: categoryName || ''
        },
        summaryContent: summaryContent,
        artist: { 
          name: artistName,
          id: artistId,
          avatar: artistAvatar
        },
        loading: false
      })
      
      console.log('商品数据加载完成，显示价格:', displayPrice)
      await this.loadServiceQR()
      
    } catch (error) {
      console.error('加载商品失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },
  

  // 解析商品简介内容（将 [图X] 替换为图片）
  parseSummaryContent(summary, images) {
    if (!summary) return []
    
    console.log('=== 解析商品简介 ===')
    console.log('原始文本:', summary)
    console.log('图片数组:', images)
    
    const content = []
    let lastIndex = 0
    
    // 正则匹配 [图1] [图2] [图3] 等占位符
    const regex = /\[图(\d+)\]/g
    let match
    
    while ((match = regex.exec(summary)) !== null) {
      const fullMatch = match[0]  // [图1]
      const imageIndex = parseInt(match[1]) - 1  // 0-based index
      const matchIndex = match.index
      
      console.log('找到占位符:', fullMatch, '位置:', matchIndex, '图片索引:', imageIndex)
      
      // 添加占位符前的文本
      if (matchIndex > lastIndex) {
        const text = summary.substring(lastIndex, matchIndex)
        if (text) {
          content.push({
            type: 'text',
            content: text
          })
          console.log('添加文本:', text)
        }
      }
      
      // 添加图片（如果图片存在）
      if (imageIndex >= 0 && imageIndex < images.length) {
        content.push({
          type: 'image',
          content: images[imageIndex]
        })
        console.log('添加图片:', images[imageIndex])
      } else {
        // 图片不存在，保留占位符文本
        content.push({
          type: 'text',
          content: fullMatch
        })
        console.log('图片不存在，保留占位符:', fullMatch)
      }
      
      lastIndex = matchIndex + fullMatch.length
    }
    
    // 添加剩余的文本
    if (lastIndex < summary.length) {
      const text = summary.substring(lastIndex)
      if (text) {
        content.push({
          type: 'text',
          content: text
        })
        console.log('添加剩余文本:', text)
      }
    }
    
    console.log('解析完成，内容块数量:', content.length)
    return content
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
    try {
      let serviceList = wx.getStorageSync('customer_service_list') || []
      if (!Array.isArray(serviceList) || serviceList.length === 0) {
        serviceList = wx.getStorageSync('service_list') || []
      }

      if (!Array.isArray(serviceList) || serviceList.length === 0) {
        this.setData({
          serviceQR: null,
          serviceInfo: null
        })
        return
      }

      const activeServices = serviceList.filter(service => service && service.isActive !== false)
      const target = activeServices[0] || serviceList[0]

      if (!target) {
        this.setData({
          serviceQR: null,
          serviceInfo: null
        })
        return
      }

      const rawImageUrl = target.qrcodeUrl || target.qrCode || target.qrcode || ''
      const imageUrl = typeof rawImageUrl === 'string' && !rawImageUrl.startsWith('http://tmp/') ? rawImageUrl : ''

      this.setData({
        serviceQR: imageUrl ? { imageUrl } : null,
        serviceInfo: {
          serviceId: target.userId || target.id || '',
          serviceName: target.name || target.nickName || '客服',
          serviceAvatar: target.avatar || target.avatarUrl || '',
          imageUrl
        }
      })
    } catch (error) {
      console.error('加载客服二维码失败', error)
      this.setData({
        serviceQR: null,
        serviceInfo: null
      })
    }
  },

  // 显示/隐藏客服二维码
  toggleServiceQR() {
    if (!this.data.orderQR && (!this.data.serviceQR || !this.data.serviceQR.imageUrl)) {
      wx.showToast({
        title: '暂无客服二维码',
        icon: 'none'
      })
      return
    }
    console.log('toggleServiceQR 被调用，当前状态:', this.data.showServiceQR)
    this.setData({
      showServiceQR: !this.data.showServiceQR
    })
  },

  // 阻止事件冒泡（空方法）
  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
  },

  // 加入购物车
  addToCart() {
    if (!this.data.product) return
    
    const { product } = this.data
    
    // 如果有规格，打开购买弹窗让用户选择
    if (product.specs && product.specs.length > 0) {
      this.setData({
        showBuyModal: true,
        selectedSpec1: null,
        selectedSpec2: null,
        quantity: 1,
        currentPrice: parseFloat(product.basePrice) || parseFloat(product.price) || 0,
        canSubmit: false,
        isAddingToCart: true // 标记为加入购物车模式
      })
    } else {
      // 没有规格，直接加入购物车
      this.addToCartDirect(product, '', '', 1, parseFloat(product.basePrice) || parseFloat(product.price) || 0)
    }
  },
  
  // 直接加入购物车
  addToCartDirect(product, spec1Name, spec2Name, quantity, price) {
    // 从本地存储读取购物车
    let cartItems = wx.getStorageSync('cart_items') || []
    
    // 生成购物车项ID
    const cartItemId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 检查是否已存在相同商品和规格
    const existingIndex = cartItems.findIndex(item => 
      item.productId === product.id && 
      item.spec1 === spec1Name && 
      item.spec2 === spec2Name
    )
    
    if (existingIndex !== -1) {
      // 已存在，增加数量
      cartItems[existingIndex].quantity += quantity
    } else {
      // 获取商品图片（确保不是临时路径）
      let productImage = '/assets/default-product.png'
      if (product.images && product.images.length > 0 && product.images[0]) {
        const img = product.images[0]
        // 检查是否是临时路径
        if (!img.includes('tmp') && !img.includes('wxfile://')) {
          productImage = img
        }
      }
      
      // 不存在，添加新项
      const cartItem = {
        _id: cartItemId,
        productId: product.id,
        productName: product.name,
        productImage: productImage,
        artistName: product.artistName || '画师',
        price: price.toFixed(2),
        quantity: quantity,
        spec1: spec1Name,
        spec2: spec2Name,
        deliveryDays: product.deliveryDays || 7,
        selected: false,
        addTime: new Date().toISOString()
      }
      
      cartItems.push(cartItem)
    }
    
    // 保存到本地存储
    wx.setStorageSync('cart_items', cartItems)
    
    // 播放飞入动画
    this.playCartAnimation(product)
    
    // 更新购物车数量
    this.loadCartCount()
    
    // 关闭弹窗
    if (this.data.showBuyModal) {
      this.closeBuyModal()
    }
  },
  
  // 播放购物车飞入动画
  playCartAnimation(product) {
    const productImage = (product.images && product.images[0]) || 'https://via.placeholder.com/150'
    
    this.setData({
      showCartAnimation: true,
      animationImage: productImage
    })
    
    // 500ms后隐藏动画
    setTimeout(() => {
      this.setData({
        showCartAnimation: false
      })
      
      // 显示成功提示
      wx.showToast({
        title: '已加入购物车',
        icon: 'success',
        duration: 1500
      })
    }, 500)
  },
  
  // 打开购买弹窗
  buyProduct() {
    if (!this.data.product) return
    
    const { product } = this.data
    
    // 初始化购买信息
    let initialPrice = parseFloat(product.basePrice) || parseFloat(product.price) || 0
    let canSubmit = true
    
    // 如果有规格，初始化为未选择状态
    if (product.specs && product.specs.length > 0) {
      canSubmit = false // 需要选择规格才能提交
    }
    
    this.setData({
      showBuyModal: true,
      selectedSpec1: null,
      selectedSpec2: null,
      quantity: 1,
      currentPrice: initialPrice,
      canSubmit: canSubmit,
      isAddingToCart: false // 标记为立即购买模式
    })
  },
  
  // 关闭购买弹窗
  closeBuyModal() {
    this.setData({
      showBuyModal: false
    })
  },
  
  // 选择一级规格
  selectSpec1(e) {
    const index = e.currentTarget.dataset.index
    const { product } = this.data
    
    this.setData({
      selectedSpec1: index,
      selectedSpec2: null // 重置二级规格
    })
    
    this.calculatePrice()
  },
  
  // 选择二级规格
  selectSpec2(e) {
    const index = e.currentTarget.dataset.index
    
    this.setData({
      selectedSpec2: index
    })
    
    this.calculatePrice()
  },
  
  // 计算价格
  calculatePrice() {
    const { product, selectedSpec1, selectedSpec2 } = this.data
    let price = parseFloat(product.basePrice) || 0
    let canSubmit = true
    let specText = ''
    
    if (product.specs && product.specs.length > 0) {
      // 有规格的情况
      if (selectedSpec1 === null) {
        canSubmit = false
      } else {
        const spec1 = product.specs[0]
        if (spec1.values && spec1.values[selectedSpec1]) {
          price = parseFloat(spec1.values[selectedSpec1].addPrice) || 0
          specText = spec1.values[selectedSpec1].name
          
          // 如果有二级规格
          if (product.specs.length > 1) {
            if (selectedSpec2 === null) {
              canSubmit = false
            } else {
              const spec2 = product.specs[1]
              if (spec2.values && spec2.values[selectedSpec2]) {
                price += parseFloat(spec2.values[selectedSpec2].addPrice) || 0
                specText += ' / ' + spec2.values[selectedSpec2].name
              }
            }
          }
        }
      }
    }
    
    this.setData({
      currentPrice: price,
      canSubmit: canSubmit,
      selectedSpecText: specText
    })
  },
  
  // 减少数量
  decreaseQuantity() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      })
    }
  },
  
  // 增加数量
  increaseQuantity() {
    const { product, quantity } = this.data
    const maxQuantity = product.stock || 999
    
    if (quantity < maxQuantity) {
      this.setData({
        quantity: quantity + 1
      })
    } else {
      wx.showToast({
        title: `最多购买${maxQuantity}件`,
        icon: 'none'
      })
    }
  },
  
  // 确认下单
  confirmOrder() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请选择完整规格',
        icon: 'none'
      })
      return
    }
    
    const { product, selectedSpec1, selectedSpec2, quantity, currentPrice, isAddingToCart } = this.data
    
    // 获取规格名称
    let spec1Name = ''
    let spec2Name = ''
    
    if (selectedSpec1 !== null && product.specs && product.specs[0]) {
      spec1Name = product.specs[0].values[selectedSpec1].name
    }
    
    if (selectedSpec2 !== null && product.specs && product.specs[1]) {
      spec2Name = product.specs[1].values[selectedSpec2].name
    }
    
    console.log('订单信息:')
    console.log('商品:', product.name)
    console.log('一级规格:', spec1Name || '无')
    console.log('二级规格:', spec2Name || '无')
    console.log('数量:', quantity)
    console.log('单价:', currentPrice)
    console.log('总价:', currentPrice * quantity)
    console.log('模式:', isAddingToCart ? '加入购物车' : '立即购买')
    
    // 判断是加入购物车还是立即购买
    if (isAddingToCart) {
      // 加入购物车
      this.addToCartDirect(product, spec1Name, spec2Name, quantity, currentPrice)
    } else {
      // 立即购买
      // 关闭购买弹窗
      this.closeBuyModal()
      
      // 显示加载中
      wx.showLoading({
        title: '创建订单中...',
        mask: true
      })
      
      // 模拟订单创建延迟
      setTimeout(() => {
        wx.hideLoading()
        
        // 获取商品图片
        let productImage = ''
        if (product.images && product.images.length > 0 && product.images[0]) {
          const img = product.images[0]
          // 只检查 wxfile:// 临时路径，base64 和 http/https 都保留
          if (img.startsWith('wxfile://')) {
            console.warn('⚠️ 商品图片是临时路径，使用默认图片')
            productImage = '/assets/default-product.png'
          } else {
            productImage = img  // 保留 base64 和 http/https 路径
          }
        } else {
          productImage = '/assets/default-product.png'
        }
        
        // 获取画师完整信息
        const artistName = product.artistName || '画师'
        const artistId = product.artistId || ''
        const artistAvatar = product.artistAvatar || ''
        
        console.log('🟢 下单参数检查', {
          artistId: product.artistId,
          artistName: product.artistName,
          artistAvatar: product.artistAvatar,
          serviceId: undefined, // 当前页面没有客服信息
          serviceName: undefined,
          serviceAvatar: undefined
        })
        
        const orderItems = [{
          productId: product.id || product._id || '',
          productName: product.name,
          productImage,
          spec1: spec1Name,
          spec2: spec2Name,
          quantity,
          unitPrice: currentPrice,
          totalPrice: Number((currentPrice * quantity).toFixed(2)),
          deliveryDays: product.deliveryDays || 0,
          categoryId: product.category || '',
          tags: product.tags || []
        }]
        wx.setStorageSync('order_success_items', orderItems)
        
        // 跳转到订单成功页面
        wx.redirectTo({
          url: `/pages/order-success/index?productId=${product.id || ''}&productName=${encodeURIComponent(product.name)}&productImage=${encodeURIComponent(productImage)}&spec1=${encodeURIComponent(spec1Name)}&spec2=${encodeURIComponent(spec2Name)}&quantity=${quantity}&price=${currentPrice}&totalAmount=${currentPrice * quantity}&deliveryDays=${product.deliveryDays || 7}&artistId=${artistId}&artistName=${encodeURIComponent(artistName)}&artistAvatar=${encodeURIComponent(artistAvatar)}`
        })
      }, 1000)
    }
    
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
    const artist = this.data.artist
    if (!artist || !artist.id) {
      wx.showToast({
        title: '暂无画师信息',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/pages/artist-detail/index?id=${artist.id}`
    })
  }
})
