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
    if (options.artistId) {
      this.setData({ artistId: options.artistId })
      this.loadArtistInfo()
      this.loadProducts()
    } else {
      wx.showToast({ title: '画师ID不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // 加载画师信息
  loadArtistInfo() {
    const artistId = this.data.artistId
    const currentUserId = wx.getStorageSync('userId')
    
    console.log('=== 画师商品管理页 - 加载画师信息 ===')
    console.log('artistId:', artistId, typeof artistId)
    console.log('currentUserId:', currentUserId, typeof currentUserId)
    
    // 从本地存储读取画师信息
    const allApplications = wx.getStorageSync('artist_applications') || []
    console.log('所有画师申请:', allApplications)
    
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
    
    // 检查是否是当前用户
    const isCurrentUser = String(artistId) === String(currentUserId)
    console.log('是否为当前用户:', isCurrentUser)
    
    if (isCurrentUser) {
      // 是当前用户，读取微信头像
      const wxUserInfo = wx.getStorageSync('wxUserInfo')
      console.log('微信用户信息:', wxUserInfo)
      
      if (wxUserInfo && wxUserInfo.avatarUrl) {
        avatar = wxUserInfo.avatarUrl
        name = wxUserInfo.nickName || artistApp.name
        console.log('使用微信头像:', avatar)
      } else {
        console.warn('当前用户未设置微信头像')
      }
    } else {
      // 不是当前用户，尝试从申请记录读取
      if (artistApp.avatar) {
        avatar = artistApp.avatar
        console.log('使用申请记录中的头像:', avatar)
      }
    }
    
    // 如果还是没有头像，使用SVG默认头像（绿色背景 + "画"字）
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
  },

  // 加载商品列表
  loadProducts() {
    const artistId = this.data.artistId
    
    // 从本地存储读取所有商品
    const allProducts = wx.getStorageSync('mock_products') || []
    
    // 筛选该画师的商品
    const artistProducts = allProducts.filter(product => product.artistId == artistId)
    
    // 统计上下架数量
    const onlineCount = artistProducts.filter(p => p.status === 'online').length
    const offlineCount = artistProducts.filter(p => p.status === 'offline').length
    
    this.setData({
      products: artistProducts,
      onlineCount: onlineCount,
      offlineCount: offlineCount
    })
    
    this.filterProducts()
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
      filtered = products.filter(p => p.status === 'online')
    } else if (currentTab === 'offline') {
      filtered = products.filter(p => p.status === 'offline')
    }
    
    this.setData({ filteredProducts: filtered })
  },

  // 编辑商品
  editProduct(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-edit/index?id=${productId}`
    })
  },

  // 切换商品状态
  toggleProductStatus(e) {
    const productId = e.currentTarget.dataset.id
    const currentStatus = e.currentTarget.dataset.status
    const newStatus = currentStatus === 'online' ? 'offline' : 'online'
    const actionText = newStatus === 'online' ? '上架' : '下架'
    
    wx.showModal({
      title: `确认${actionText}`,
      content: `确认${actionText}该商品？`,
      success: (res) => {
        if (res.confirm) {
          // 更新本地存储
          const allProducts = wx.getStorageSync('mock_products') || []
          const productIndex = allProducts.findIndex(p => p.id === productId)
          
          if (productIndex !== -1) {
            allProducts[productIndex].status = newStatus
            wx.setStorageSync('mock_products', allProducts)
            
            wx.showToast({
              title: `已${actionText}`,
              icon: 'success'
            })
            
            // 重新加载
            this.loadProducts()
          }
        }
      }
    })
  },

  // 删除商品
  deleteProduct(e) {
    const productId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确认删除该商品？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 从本地存储删除
          let allProducts = wx.getStorageSync('mock_products') || []
          allProducts = allProducts.filter(p => p.id !== productId)
          wx.setStorageSync('mock_products', allProducts)
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
          
          // 重新加载
          this.loadProducts()
        }
      }
    })
  }
})

