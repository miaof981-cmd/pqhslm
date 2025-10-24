Page({
  data: {
    banners: [],
    categories: [],
    products: [],
    allProducts: [],
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
    const allProducts = [
        {
          _id: '1',
          name: '精美头像设计',
          price: 88,
          originalPrice: 128,
          deliveryDays: 3,
          images: ['https://via.placeholder.com/300x300.png?text=精美头像'],
          category: 'portrait',
          artist: { name: '设计师小王', avatar: 'https://via.placeholder.com/50x50.png?text=王' },
          sales: 156,
          rating: 4.9,
          tags: ['热门', '精品']
        },
        {
          _id: '2',
          name: '创意插画作品',
          price: 168,
          originalPrice: 200,
          deliveryDays: 5,
          images: ['https://via.placeholder.com/300x300.png?text=创意插画'],
          category: 'illustration',
          artist: { name: '插画师小李', avatar: 'https://via.placeholder.com/50x50.png?text=李' },
          sales: 89,
          rating: 4.8,
          tags: ['原创', '限量']
        },
        {
          _id: '3',
          name: '企业LOGO设计',
          price: 299,
          originalPrice: 399,
          deliveryDays: 7,
          images: ['https://via.placeholder.com/300x300.png?text=LOGO设计'],
          category: 'logo',
          artist: { name: '品牌设计师', avatar: 'https://via.placeholder.com/50x50.png?text=品牌' },
          sales: 234,
          rating: 5.0,
          tags: ['专业', '包修改']
        },
        {
          _id: '4',
          name: '可爱表情包',
          price: 29,
          originalPrice: 39,
          deliveryDays: 2,
          images: ['https://via.placeholder.com/300x300.png?text=表情包'],
          category: 'emoticon',
          artist: { name: '表情包达人', avatar: 'https://via.placeholder.com/50x50.png?text=表情' },
          sales: 567,
          rating: 4.7,
          tags: ['可爱', '实用']
        },
        {
          _id: '5',
          name: '海报设计',
          price: 199,
          originalPrice: 259,
          deliveryDays: 4,
          images: ['https://via.placeholder.com/300x300.png?text=海报设计'],
          category: 'poster',
          artist: { name: '平面设计师', avatar: 'https://via.placeholder.com/50x50.png?text=平面' },
          sales: 78,
          rating: 4.9,
          tags: ['创意', '高质量']
        },
        {
          _id: '6',
          name: 'UI界面设计',
          price: 399,
          originalPrice: 499,
          deliveryDays: 6,
          images: ['https://via.placeholder.com/300x300.png?text=UI设计'],
          category: 'ui',
          artist: { name: 'UI设计师', avatar: 'https://via.placeholder.com/50x50.png?text=UI' },
          sales: 45,
          rating: 5.0,
          tags: ['专业', '现代']
        }
      ]
    
    this.setData({
      allProducts: allProducts,
      products: allProducts
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