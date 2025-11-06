const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')

Page({
  data: {
    artistId: '',
    artistName: '',
    statusFilter: 'all',
    searchKeyword: '', // 搜索关键词
    products: [],
    allProducts: [],
    stats: {
      all: 0,
      online: 0,
      offline: 0
    }
  },

  onLoad(options) {
    // 从options或当前用户ID获取画师ID
    const artistId = options.artistId || wx.getStorageSync('userId')
    const artistName = options.artistName || '我'
    
    this.setData({
      artistId: artistId,
      artistName: artistName
    })
    this.loadProducts()
  },

  onShow() {
    // 每次显示页面时刷新商品列表
    this.loadProducts()
  },

  loadProducts() {
    console.log('=== 商品管理页加载数据 ===')
    console.log('当前画师ID:', this.data.artistId)
    
    // 从本地存储加载商品
    let allProducts = wx.getStorageSync('mock_products') || []
    console.log('从本地存储加载全部商品数量:', allProducts.length)
    
    // 筛选当前画师的商品
    let products = allProducts.filter(p => p.artistId == this.data.artistId)
    console.log('筛选后该画师的商品数量:', products.length)
    
    if (products.length > 0) {
      // 转换本地存储的商品格式为页面显示格式
      products = products.map(p => {
        console.log(`商品: ${p.name}, artistId: ${p.artistId}, isOnSale: ${p.isOnSale}`)
        const coverImage = ensureRenderableImage(
          Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : p.productImage,
          { namespace: 'product-cover', fallback: DEFAULT_PLACEHOLDER }
        )

        return {
          _id: p.id || p._id,
          id: p.id || p._id,
          name: p.name || '未命名商品',
          coverImage,
          image: coverImage,
          images: p.images || [],
          price: p.price || p.basePrice || '0.00',
          basePrice: p.basePrice || '0.00',
          status: p.isOnSale !== false ? 'online' : 'offline',
          isOnSale: p.isOnSale !== false,
          categoryName: p.categoryName || '未分类',
          views: p.views || 0,
          orders: p.orders || 0,
          sales: p.sales || 0,
          stock: p.stock || 0
        }
      })
      console.log('转换后的商品数据:', products.length, '个')
      products.forEach(p => console.log(`  - ${p.name}: status=${p.status}, isOnSale=${p.isOnSale}`))
    } else {
      console.log('该画师暂无商品')
    }

    const stats = {
      all: products.length,
      online: products.filter(p => p.status === 'online').length,
      offline: products.filter(p => p.status === 'offline').length
    }

    console.log('统计数据:', stats)

    this.setData({
      allProducts: products,
      products: products,
      stats: stats
    })
  },

  filterByStatus(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ statusFilter: filter })
    this.applyFilters()
  },

  // 应用筛选（状态 + 搜索）
  applyFilters() {
    let filtered = this.data.allProducts

    // 应用状态筛选
    if (this.data.statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.data.statusFilter)
    }

    // 应用搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(keyword)
      )
    }

    this.setData({ products: filtered })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.applyFilters()
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.applyFilters()
  },

  editProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-edit/index?id=${id}`
    })
  },

  toggleProductStatus(e) {
    const id = e.currentTarget.dataset.id
    const currentStatus = e.currentTarget.dataset.status
    const newStatus = currentStatus === 'online' ? 'offline' : 'online'
    const newIsOnSale = newStatus === 'online'
    const actionText = newStatus === 'online' ? '上架' : '下架'

    wx.showModal({
      title: `确认${actionText}`,
      content: `确认${actionText}此商品？`,
      success: (res) => {
        if (res.confirm) {
          // 更新本地存储
          const allProducts = wx.getStorageSync('mock_products') || []
          const productIndex = allProducts.findIndex(p => (p.id || p._id) === id)
          
          if (productIndex !== -1) {
            allProducts[productIndex].isOnSale = newIsOnSale
            wx.setStorageSync('mock_products', allProducts)
            
            wx.showToast({
              title: `已${actionText}`,
              icon: 'success'
            })
            
            // 重新加载数据
            this.loadProducts()
          }
        }
      }
    })
  },

  // 删除商品
  deleteProduct(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确认删除该商品？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 从本地存储删除
          let allProducts = wx.getStorageSync('mock_products') || []
          allProducts = allProducts.filter(p => (p.id || p._id) !== id)
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
  },

  // 添加商品（跳转到编辑页面）
  addProduct() {
    wx.navigateTo({
      url: '/pages/product-edit/index'
    })
  }
})
