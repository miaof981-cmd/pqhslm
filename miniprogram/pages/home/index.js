Page({
  data: {
    banners: [],
    categories: [],
    products: [],
    allProducts: [],
    recommendProducts: [],
    notices: [],
    loading: true,
    currentCategory: 'all',
    currentCategoryName: '全部商品',
    showFilter: false,
    tempCategory: 'all'
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载所有数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadBanners(),
        this.loadCategories(),
        this.loadProducts(),
        this.loadNotices()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载轮播图
  async loadBanners() {
    this.setData({
      banners: [
        'https://via.placeholder.com/750x300.png?text=精美轮播图1',
        'https://via.placeholder.com/750x300.png?text=精美轮播图2',
        'https://via.placeholder.com/750x300.png?text=精美轮播图3'
      ]
    })
  },

  // 加载商品分类
  async loadCategories() {
    this.setData({
      categories: [
        { id: 'all', name: '全部', active: true },
        { id: 'portrait', name: '头像', active: false },
        { id: 'illustration', name: '插画', active: false },
        { id: 'logo', name: 'LOGO', active: false },
        { id: 'poster', name: '海报', active: false },
        { id: 'emoticon', name: '表情包', active: false },
        { id: 'ui', name: 'UI设计', active: false },
        { id: 'animation', name: '动画', active: false }
      ]
    })
  },

  // 加载商品列表
  async loadProducts() {
    // 从本地存储加载商品
    let allProducts = wx.getStorageSync('mock_products') || []
    
    console.log('从本地存储加载商品', allProducts.length, '个')
    
    if (allProducts.length > 0) {
      // 转换本地存储的商品格式为首页显示格式
      allProducts = allProducts
        .filter(p => p.isOnSale !== false) // 只显示上架的商品
        .map(p => {
          // 优先使用编辑页已经计算好的 price 字段
          // 如果 price 不存在（旧数据），则使用 basePrice
          let displayPrice = parseFloat(p.price) || parseFloat(p.basePrice) || 0
          
          console.log(`商品 ${p.name} 价格读取:`, {
            savedPrice: p.price,
            basePrice: p.basePrice,
            finalDisplayPrice: displayPrice,
            hasSpecs: !!(p.specs && p.specs.length > 0)
          })
          
          return {
            _id: p.id || p._id,
            id: p.id,
            name: p.name || '未命名商品',
            price: displayPrice,
            basePrice: p.basePrice,
            originalPrice: displayPrice * 1.3, // 模拟原价
            deliveryDays: p.deliveryDays || 7,
            images: p.images && p.images.length > 0 ? p.images : ['https://via.placeholder.com/300x300.png?text=商品图'],
            category: p.category || 'other',
            artist: p.artist || { name: '画师', avatar: '' },
            sales: p.sales || 0,
            rating: p.rating || 5.0,
            tags: p.tags || [],
            isOnSale: p.isOnSale !== false
          }
        })
      
      console.log('转换后的商品数据', allProducts.length, '个')
    } else {
      console.log('本地存储为空，无商品数据')
    }
    
    // 前3个作为推荐商品
    const recommendProducts = allProducts.slice(0, 3)
    
    this.setData({
      allProducts: allProducts,
      products: allProducts,
      recommendProducts: recommendProducts
    })
  },

  // 加载公告
  async loadNotices() {
    this.setData({
      notices: [
        {
          _id: '1',
          title: '🎉 新用户专享优惠，首单立减50元！',
          content: '新用户注册即可享受首单立减50元优惠，快来体验吧！',
          createTime: '2024-01-01'
        },
        {
          _id: '2',
          title: '📢 画师认证通道开放，快来申请吧！',
          content: '画师认证通道现已开放，通过认证即可开始接单赚钱！',
          createTime: '2024-01-02'
        }
      ]
    })
  },

  // 切换分类（在筛选面板中）
  switchCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    
    // 更新临时分类状态
    const categories = this.data.categories.map(cat => ({
      ...cat,
      active: cat.id === categoryId
    }))
    
    this.setData({
      categories: categories,
      tempCategory: categoryId
    })
  },

  // 切换筛选面板
  toggleFilter() {
    this.setData({
      showFilter: !this.data.showFilter
    })
  },

  // 重置筛选
  resetFilter() {
    const categories = this.data.categories.map(cat => ({
      ...cat,
      active: cat.id === 'all'
    }))
    
    this.setData({
      categories: categories,
      tempCategory: 'all'
    })
  },

  // 确认筛选
  confirmFilter() {
    const categoryId = this.data.tempCategory
    const category = this.data.categories.find(cat => cat.id === categoryId)
    const categoryName = categoryId === 'all' ? '全部商品' : (category ? category.name : '全部商品')
    
    this.setData({
      currentCategory: categoryId,
      currentCategoryName: categoryName,
      showFilter: false
    })
    
    // 根据分类筛选商品
    this.filterProductsByCategory(categoryId)
  },

  // 根据分类筛选商品
  filterProductsByCategory(categoryId) {
    let filteredProducts = this.data.allProducts
    
    if (categoryId !== 'all') {
      filteredProducts = this.data.allProducts.filter(product => product.category === categoryId)
    }
    
    this.setData({
      products: filteredProducts
    })
  },

  // 取消筛选
  clearFilter() {
    const categories = this.data.categories.map(cat => ({
      ...cat,
      active: cat.id === 'all'
    }))
    
    this.setData({
      categories: categories,
      currentCategory: 'all',
      currentCategoryName: '全部商品',
      tempCategory: 'all',
      products: this.data.allProducts
    })
  },

  // 点击商品
  onProductTap(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${productId}`
    })
  },

  // 点击公告
  onNoticeTap(e) {
    const noticeId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/notice-detail/index?id=${noticeId}`
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 搜索商品
  onSearch() {
    wx.navigateTo({
      url: '/pages/search/index'
    })
  }
})