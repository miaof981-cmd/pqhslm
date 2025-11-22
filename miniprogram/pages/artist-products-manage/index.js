const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')

Page({
  data: {
    artistId: '',
    artistInfo: {},
    products: [],
    filteredProducts: [],
    currentTab: 'all',
    tabs: [
      { label: '全部', value: 'all' },
      { label: '已上架', value: 'online' },
      { label: '已下架', value: 'offline' }
    ],
    onlineCount: 0,
    offlineCount: 0
  },

  onLoad(options) {
    console.log('=== onLoad 触发 ===')
    console.log('接收到的 options:', options)
    
    if (options.artistId) {
      this.setData({ artistId: options.artistId })
      this.loadArtistInfo()
      this.loadProducts()
    } else {
      wx.showToast({ title: '画师ID不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  onShow() {
    console.log('=== onShow 触发 ===')
    if (this.data.artistId) {
      console.log('页面显示，重新加载商品数据')
      this.loadProducts()
    }
  },

  // 加载画师信息
  async loadArtistInfo() {
    const artistId = this.data.artistId
    const currentUserId = app.globalData.userId
    
    console.log('=== 画师商品管理页 - 加载画师信息（云端版）===')
    console.log('artistId:', artistId, typeof artistId)
    console.log('currentUserId:', currentUserId, typeof currentUserId)
    
    try {
      // ✅ 从云端读取画师申请信息
      const res = await cloudAPI.getArtistApplicationList({})
      // 🛡️ 安全数组解析
      const allApplications = cloudAPI.safeArray(res)
      console.log('所有画师申请:', allApplications.length)
      
      const artistApp = allApplications.find(app => {
        const match = app.userId == artistId && app.status === 'approved'
        console.log(`检查 userId=${app.userId}, status=${app.status}, 匹配=${match}`)
        return match
      })
      
      if (!artistApp) {
        console.error('未找到画师信息！artistId:', artistId)
        wx.showToast({ title: '未找到画师信息', icon: 'none' })
        return
      }
      
      console.log('找到画师申请:', artistApp)
      
      let avatar = ''
      let name = artistApp.name
      
      const isCurrentUser = String(artistId) === String(currentUserId)
      console.log('是否为当前用户:', isCurrentUser)
      
      if (isCurrentUser) {
        // 是当前用户，读取微信头像
        const wxUserInfo = app.globalData.userInfo
        console.log('微信用户信息:', wxUserInfo)
        
        if (wxUserInfo && (wxUserInfo.avatarUrl || wxUserInfo.avatar)) {
          avatar = wxUserInfo.avatarUrl || wxUserInfo.avatar
          name = wxUserInfo.nickName || wxUserInfo.nickname || artistApp.name
          console.log('使用微信头像:', avatar)
        } else {
          console.warn('当前用户未设置微信头像，尝试从申请记录读取')
          if (artistApp.avatar || artistApp.avatarUrl) {
            avatar = artistApp.avatar || artistApp.avatarUrl
            console.log('使用申请记录中的头像:', avatar)
          }
        }
      } else {
        if (artistApp.avatar || artistApp.avatarUrl) {
          avatar = artistApp.avatar || artistApp.avatarUrl
          console.log('使用申请记录中的头像:', avatar)
        }
      }
      
      // 如果还是没有头像，使用SVG默认头像
      if (!avatar) {
        avatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlLs8L3RleHQ+PC9zdmc+'
        console.log('使用默认SVG头像（"画"字）')
      }
      
      console.log('最终设置的头像:', avatar)
      console.log('最终设置的昵称:', name)
      
      this.setData({
        artistInfo: {
          userId: artistApp.userId,
          artistNumber: artistApp.artistNumber || '未分配',
          name: name,
          avatar: avatar
        }
      })
      
      console.log('=== 画师信息加载完成 ===')
    } catch (err) {
      console.error('❌ 加载画师信息失败:', err)
      wx.showToast({ title: '加载画师信息失败', icon: 'none' })
    }
  },

  // 加载商品列表
  async loadProducts() {
    const artistId = this.data.artistId
    
    console.log('=== 加载商品列表（云端版）===')
    console.log('artistId:', artistId)
    
    try {
      // ✅ 从云端读取该画师的商品
      const res = await cloudAPI.getProductList({ artistId })
      // 🛡️ 安全数组解析
      const artistProducts = cloudAPI.safeArray(res).map(product => {
        let displayPrice = parseFloat(product.price) || parseFloat(product.basePrice || product.base_price) || 0
        const images = product.images || []
        const productImage = product.productImage || product.product_image
        const coverImage = ensureRenderableImage(
          Array.isArray(images) && images.length > 0 ? images[0] : productImage,
          { namespace: 'product-cover', fallback: DEFAULT_PLACEHOLDER }
        )
        
        console.log(`商品 ${product.name} 价格处理:`, {
          原始price: product.price,
          basePrice: product.basePrice || product.base_price,
          最终显示: displayPrice
        })
        
        return {
          ...product,
          id: product._id || product.id,
          price: displayPrice,
          coverImage,
          image: coverImage
        }
      })
      
      console.log('该画师商品数量:', artistProducts.length)
      console.log('商品列表:', artistProducts.map(p => `${p.name}(isOnSale:${p.isOnSale})`))
      
      // 统计上下架数量
      const onlineCount = artistProducts.filter(p => p.isOnSale === true).length
      const offlineCount = artistProducts.filter(p => p.isOnSale === false).length
      
      console.log('已上架:', onlineCount, '已下架:', offlineCount)
      
      this.setData({
        products: artistProducts,
        onlineCount: onlineCount,
        offlineCount: offlineCount
      }, () => {
        console.log('setData 完成 - products:', this.data.products.length, '个')
      })
      
      console.log('准备调用 filterProducts()')
      this.filterProducts()
    } catch (err) {
      console.error('❌ 加载商品列表失败:', err)
      wx.showToast({ title: '加载商品失败', icon: 'none' })
    }
  },

  // 切换标签
  switchTab(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ currentTab: value })
    this.filterProducts()
  },

  // 筛选商品
  filterProducts() {
    const { products, currentTab } = this.data
    let filtered = products
    
    if (currentTab === 'online') {
      filtered = products.filter(p => p.isOnSale === true)
    } else if (currentTab === 'offline') {
      filtered = products.filter(p => p.isOnSale === false)
    }
    
    console.log('=== 筛选商品 ===')
    console.log('当前标签:', currentTab)
    console.log('全部商品数量 (products):', products.length)
    console.log('筛选后商品数量 (filtered):', filtered.length)
    console.log('渲染前商品列表:', filtered.map(x => ({ name: x.name, isOnSale: x.isOnSale, price: x.price })))
    
    this.setData({ filteredProducts: filtered }, () => {
      console.log('setData 完成，filteredProducts.length:', this.data.filteredProducts.length)
    })
  },

  // 编辑商品
  editProduct(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-edit/index?id=${productId}`
    })
  },

  // 切换商品状态
  async toggleProductStatus(e) {
    const productId = e.currentTarget.dataset.id
    const currentIsOnSale = e.currentTarget.dataset.isonsale
    const newIsOnSale = !currentIsOnSale
    const actionText = newIsOnSale ? '上架' : '下架'
    
    console.log('切换商品状态:', productId, '当前:', currentIsOnSale, '新:', newIsOnSale)
    
    wx.showModal({
      title: `确认${actionText}`,
      content: `确认${actionText}该商品？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            // ✅ 调用云端API更新商品状态
            const result = await cloudAPI.updateProduct(productId, {
              isOnSale: newIsOnSale
            })
            
            wx.hideLoading()
            
            if (result.success) {
              console.log('状态已更新:', productId, 'isOnSale:', newIsOnSale)
              
              wx.showToast({
                title: `已${actionText}`,
                icon: 'success'
              })
              
              // 重新加载
              this.loadProducts()
            } else {
              wx.showToast({
                title: result.error || '更新失败',
                icon: 'none'
              })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('❌ 切换商品状态失败:', err)
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 删除商品
  async deleteProduct(e) {
    const productId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确认删除该商品？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            
            // ✅ 调用云端API删除商品
            const result = await cloudAPI.deleteProduct(productId)
            
            wx.hideLoading()
            
            if (result.success) {
              wx.showToast({
                title: '已删除',
                icon: 'success'
              })
              
              // 重新加载
              this.loadProducts()
            } else {
              wx.showToast({
                title: result.error || '删除失败',
                icon: 'none'
              })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('❌ 删除商品失败:', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})
