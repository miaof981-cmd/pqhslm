Page({
  data: {
    productId: '',
    product: null,
    summaryContent: [], // 解析后的商品简介内容（文本+图片混排）
    artist: null,
    showServiceQR: false,
    serviceQR: null,
    orderQR: null,
    hasOrder: false,
    loading: true,
    
    // 购买弹窗相关
    showBuyModal: false,
    selectedSpec1: null, // 选中的一级规格
    selectedSpec2: null, // 选中的二级规格
    quantity: 1, // 购买数量
    currentPrice: 0, // 当前价格
    canSubmit: false // 是否可以提交订单
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
      
      // 解析商品简介中的图片占位符
      const summaryContent = this.parseSummaryContent(product.summary || '', product.summaryImages || [])
      
      console.log('解析后的商品简介:', summaryContent)
      
      this.setData({
        product: {
          ...product,
          price: displayPrice
        },
        summaryContent: summaryContent,
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
    console.log('toggleServiceQR 被调用，当前状态:', this.data.showServiceQR)
    this.setData({
      showServiceQR: !this.data.showServiceQR
    })
  },

  // 阻止事件冒泡（空方法）
  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
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
      canSubmit: canSubmit
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
    
    if (product.specs && product.specs.length > 0) {
      // 有规格的情况
      if (selectedSpec1 === null) {
        canSubmit = false
      } else {
        const spec1 = product.specs[0]
        if (spec1.values && spec1.values[selectedSpec1]) {
          price = parseFloat(spec1.values[selectedSpec1].addPrice) || 0
          
          // 如果有二级规格
          if (product.specs.length > 1) {
            if (selectedSpec2 === null) {
              canSubmit = false
            } else {
              const spec2 = product.specs[1]
              if (spec2.values && spec2.values[selectedSpec2]) {
                price += parseFloat(spec2.values[selectedSpec2].addPrice) || 0
              }
            }
          }
        }
      }
    }
    
    this.setData({
      currentPrice: price,
      canSubmit: canSubmit
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
    
    const { product, selectedSpec1, selectedSpec2, quantity, currentPrice } = this.data
    
    console.log('订单信息:')
    console.log('商品:', product.name)
    console.log('一级规格:', selectedSpec1 !== null ? product.specs[0].values[selectedSpec1].name : '无')
    console.log('二级规格:', selectedSpec2 !== null ? product.specs[1].values[selectedSpec2].name : '无')
    console.log('数量:', quantity)
    console.log('单价:', currentPrice)
    console.log('总价:', currentPrice * quantity)
    
    wx.showToast({
      title: '模拟下单成功',
      icon: 'success'
    })
    
    setTimeout(() => {
      this.closeBuyModal()
    }, 1500)
    
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