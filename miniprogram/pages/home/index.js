const { createLogger, isVerboseLoggingEnabled } = require('../../utils/logger')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')
const categoryService = require('../../utils/category-service.js')
const orderStatusUtil = require('../../utils/order-status.js')

const logger = createLogger('home')

/**
 * 🔧 iOS兼容的日期解析函数
 */
const parseDate = orderStatusUtil.parseDate

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
    tempCategory: 'all',
    deliverySort: 'default', // 出稿时间排序：default/fastest/slowest
    tempDeliverySort: 'default',
    priceRange: 'all', // 价格区间：all/low/mid/high/custom
    tempPriceRange: 'all',
    customMinPrice: '', // 自定义最低价
    customMaxPrice: '', // 自定义最高价
    bannerHeight: 200, // 轮播图初始高度（px）
    showTestModal: false // 🧪 临时测试弹窗
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
    const storedBanners = wx.getStorageSync('home_banners') || []
    const bannerImages = storedBanners.map(b => b.image).filter(img => img)
    
    this.setData({
      banners: bannerImages.length > 0 ? bannerImages : []
    })
    
    console.log('首页轮播图数量:', bannerImages.length)
  },

  // 加载商品分类
  async loadCategories() {
    this.setSelectableCategories(this.data.currentCategory || 'all')
  },

  setSelectableCategories(selectedId = 'all') {
    const categories = categoryService.getSelectableCategories(selectedId)
    this.setData({
      categories
    })
  },

  // 加载商品列表
  async loadProducts() {
    // 从本地存储加载商品
    let allProducts = wx.getStorageSync('mock_products') || []
    const users = wx.getStorageSync('users') || [] // 🔧 新增：加载用户列表（用于获取最新昵称）

    logger.info('从本地存储加载商品', allProducts.length, '个')

    const verboseLogEnabled = isVerboseLoggingEnabled()
    
    if (allProducts.length > 0) {
      // 转换本地存储的商品格式为首页显示格式
      allProducts = allProducts
        .filter(p => p.isOnSale !== false) // 只显示上架的商品
        .map(p => {
          // 优先使用编辑页已经计算好的 price 字段
          // 如果 price 不存在（旧数据），则使用 basePrice
          let displayPrice = parseFloat(p.price) || parseFloat(p.basePrice) || 0
          
          if (!p.price && !p.basePrice) {
            logger.warn(`商品 ${p.name} 缺少价格字段，已回退为 0 元展示`)
          } else if (verboseLogEnabled) {
            logger.debug(`商品 ${p.name} 价格读取`, {
              savedPrice: p.price,
              basePrice: p.basePrice,
              finalDisplayPrice: displayPrice,
              hasSpecs: !!(p.specs && p.specs.length > 0)
            })
          }
          
          const coverImage = ensureRenderableImage(
            Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : p.productImage,
            { namespace: 'product-cover', fallback: DEFAULT_PLACEHOLDER }
          )
          const categoryName = p.categoryName || categoryService.getCategoryNameById(p.category)
          
          // 🔧 修复：总是优先从 users 列表读取最新昵称（解决画师改名后搜索不到的问题）
          let artistName = p.artistName || p.artist?.name || '画师'
          if (p.artistId) {
            const artist = users.find(u => 
              String(u.id) === String(p.artistId) || String(u.userId) === String(p.artistId)
            )
            if (artist) {
              artistName = artist.nickName || artist.name || artistName
            }
          }
          
          return {
            _id: p.id || p._id,
            id: p.id,
            name: p.name || '未命名商品',
            price: displayPrice,
            artistName: artistName,
            // ⚠️ 性能优化：只传第一张图片，不传整个数组
            coverImage,
            image: coverImage,
            images: Array.isArray(p.images) ? p.images : [],
            category: p.category || 'other',
            categoryName: categoryName || '',
            deliveryDays: p.deliveryDays || 7,
            tags: p.tags || [],
            isOnSale: p.isOnSale !== false,
            sales: p.sales || 0,  // 🎯 新增：销量
            stock: p.stock || 0   // 🎯 新增：库存
          }
        })
      
      logger.info('转换后的商品数据', allProducts.length, '个')

      // 计算数据大小
      const dataSize = JSON.stringify(allProducts).length / 1024
      if (verboseLogEnabled) {
        logger.debug(`商品数据大小: ${dataSize.toFixed(2)} KB`)
      }

      if (dataSize > 100) {
        logger.warn(`首页商品数据较大（${dataSize.toFixed(2)} KB），可能影响性能`)
      }
    } else {
      logger.info('本地存储为空，无商品数据')
    }
    
    // 筛选有"推荐"或"热销"标签的商品作为推荐
    const recommendProducts = allProducts.filter(p => {
      const tags = p.tags || []
      return tags.includes('推荐') || tags.includes('热销')
    }).slice(0, 6) // 最多显示6个
    
    logger.info(`推荐商品数量: ${recommendProducts.length} 个`)
    
    this.setData({
      allProducts: allProducts,
      products: allProducts,
      recommendProducts: recommendProducts
    })
  },

  // 🎯 加载公告（从后台公告管理读取）
  async loadNotices() {
    try {
      // 从本地存储读取公告列表
      const allNotices = wx.getStorageSync('notices') || []
      
      // 只显示启用状态的公告
      const activeNotices = allNotices.filter(notice => notice.status === 'active')
      
      // 按创建时间倒序排序（最新的在前）
      activeNotices.sort((a, b) => {
        // 🔧 iOS兼容：使用parseDate
        const timeA = b.createTime ? parseDate(b.createTime).getTime() : 0
        const timeB = a.createTime ? parseDate(a.createTime).getTime() : 0
        return timeA - timeB
      })
      
      console.log('📢 加载首页公告:', activeNotices.length, '条')
      
    this.setData({
        notices: activeNotices
      })
    } catch (error) {
      console.error('加载公告失败:', error)
      this.setData({ notices: [] })
    }
  },

  // 切换分类（在筛选面板中）
  switchCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({
      tempCategory: categoryId
    })
    this.setSelectableCategories(categoryId)
  },

  // 切换筛选面板
  toggleFilter() {
    this.setData({
      showFilter: !this.data.showFilter
    })
  },

  // 切换出稿时间排序
  changeDeliverySort(e) {
    const sort = e.currentTarget.dataset.sort
    this.setData({
      tempDeliverySort: sort
    })
    console.log('✅ 出稿时间已选择:', sort)
  },
  
  // 🎯 修改价格区间
  changePriceRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({
      tempPriceRange: range
    })
    console.log('✅ 价格区间已选择:', range)
  },

  // 🆕 自定义价格输入
  onMinPriceInput(e) {
    this.setData({
      customMinPrice: e.detail.value
    })
  },

  onMaxPriceInput(e) {
    this.setData({
      customMaxPrice: e.detail.value
    })
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      tempCategory: 'all',
      tempPriceRange: 'all',
      tempDeliverySort: 'default',
      customMinPrice: '',
      customMaxPrice: ''
    })
    this.setSelectableCategories('all')
  },

  // 确认筛选
  confirmFilter() {
    const categoryId = this.data.tempCategory
    const deliverySort = this.data.tempDeliverySort
    const priceRange = this.data.tempPriceRange
    const category = this.data.categories.find(cat => cat.id === categoryId)
    const categoryName = categoryId === 'all' ? '全部商品' : (category ? category.name : '全部商品')
    
    this.setData({
      currentCategory: categoryId,
      currentCategoryName: categoryName,
      deliverySort: deliverySort,
      priceRange: priceRange,
      showFilter: false
    })
    this.setSelectableCategories(categoryId)
    
    // 根据分类、排序和价格筛选商品
    this.filterAndSortProducts(categoryId, deliverySort, priceRange)
  },

  // 根据分类、排序和价格筛选商品
  filterAndSortProducts(categoryId, deliverySort, priceRange) {
    let filteredProducts = this.data.allProducts
    
    // 1. 先按分类筛选
    if (categoryId !== 'all') {
      filteredProducts = filteredProducts.filter(product => product.category === categoryId)
    }
    
    // 2. 按价格区间筛选
    if (priceRange && priceRange !== 'all') {
      filteredProducts = filteredProducts.filter(product => {
        const price = parseFloat(product.price) || 0
        
        if (priceRange === 'custom') {
          // 自定义价格区间
          const minPrice = parseFloat(this.data.customMinPrice) || 0
          const maxPrice = parseFloat(this.data.customMaxPrice) || Infinity
          
          // 验证输入有效性
          if (minPrice > maxPrice && maxPrice > 0) {
            wx.showToast({
              title: '最低价不能大于最高价',
              icon: 'none'
            })
            return true
          }
          
          return price >= minPrice && (maxPrice === Infinity || price <= maxPrice)
        }
        
        // 预设价格区间
        if (priceRange === 'low') return price < 50
        if (priceRange === 'mid') return price >= 50 && price < 100
        if (priceRange === 'high') return price >= 100
        return true
      })
    }
    
    let sortedProducts = filteredProducts

    // 3. 再按出稿时间排序
    if (deliverySort === 'fastest') {
      // 最快优先：出稿天数从小到大
      sortedProducts = filteredProducts.slice().sort((a, b) => {
        const daysA = a.deliveryDays || 999
        const daysB = b.deliveryDays || 999
        return daysA - daysB
      })
    } else if (deliverySort === 'slowest') {
      // 最慢优先：出稿天数从大到小
      sortedProducts = filteredProducts.slice().sort((a, b) => {
        const daysA = a.deliveryDays || 0
        const daysB = b.deliveryDays || 0
        return daysB - daysA
      })
    }
    // default: 保持原顺序（最新上传的在前）
    
    console.log(`✅ 筛选完成: ${filteredProducts.length}/${this.data.allProducts.length} 个商品`)
    
    this.setData({
      products: deliverySort === 'default' ? filteredProducts.slice() : sortedProducts
    })
  },
  
  // 根据分类筛选商品（兼容旧代码）
  filterProductsByCategory(categoryId) {
    this.filterAndSortProducts(categoryId, this.data.deliverySort, this.data.priceRange)
  },

  // 取消筛选
  clearFilter() {
    this.setData({
      currentCategory: 'all',
      currentCategoryName: '全部商品',
      tempCategory: 'all',
      products: this.data.allProducts
    })
    this.setSelectableCategories('all')
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

  // 轮播图加载完成，动态计算高度
  onBannerImageLoad(e) {
    const { width, height } = e.detail
    const windowInfo = wx.getWindowInfo()
    const screenWidth = windowInfo.windowWidth
    // 减去左右边距（10rpx * 2 = 20rpx ≈ 10px * 2）
    const containerWidth = screenWidth - 10
    // 根据图片原始比例计算高度
    const calculatedHeight = (containerWidth / width) * height
    
    this.setData({
      bannerHeight: calculatedHeight
    })
    
    console.log('轮播图高度自适应:', calculatedHeight + 'px')
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 搜索商品
  onSearch() {
    console.log('🔍 点击搜索框，跳转搜索页面')
    wx.navigateTo({
      url: '/pages/search/index',
      fail: (err) => {
        console.error('❌ 跳转搜索页面失败:', err)
        wx.showToast({
          title: '搜索功能暂时不可用',
          icon: 'none'
        })
      }
    })
  },

  // ==================== 🧪 临时测试功能 ====================
  // 显示测试菜单
  showTestMenu() {
    this.setData({ showTestModal: true })
  },

  // 隐藏测试菜单
  hideTestMenu() {
    this.setData({ showTestModal: false })
  },

  // 阻止冒泡
  stopPropagation() {},

  // 创建测试商品
  createTestProduct(e) {
    const type = e.currentTarget.dataset.type
    const userInfo = wx.getStorageSync('userInfo') || {}
    const userId = wx.getStorageSync('userId') || 1001
    
    // 占位图片（透明1x1像素图片）
    const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    
    const timestamp = Date.now()
    const productId = `test_product_${timestamp}`
    
    let newProduct = {
      id: productId,
      name: type === 'single' ? `测试商品-单价${timestamp}` : `测试商品-规格${timestamp}`,
      summary: '这是一个测试商品，用于测试下单流程',
      category: '测试分类',
      images: [placeholderImage],
      coverImage: placeholderImage,
      tags: ['测试'],
      isOnSale: true,
      deliveryDays: 3,
      stock: 999,
      maxBuyCount: 10,
      artistId: userId,
      artistName: userInfo.nickName || userInfo.name || '测试画师',
      artistAvatar: userInfo.avatarUrl || userInfo.avatar || placeholderImage,
      createdAt: new Date().toISOString()
    }

    if (type === 'single') {
      // 单一价格
      newProduct.price = 19.9
      newProduct.basePrice = 19.9
      newProduct.hasSpecs = false
    } else {
      // 多规格
      newProduct.hasSpecs = true
      newProduct.specs = {
        spec1Name: '尺寸',
        spec1Values: [
          { name: '小', addPrice: 19.9 },
          { name: '中', addPrice: 29.9 },
          { name: '大', addPrice: 39.9 }
        ],
        spec2Name: '材质',
        spec2Values: [
          { name: '普通', addPrice: 0 },
          { name: '高级', addPrice: 10 }
        ]
      }
      newProduct.price = 19.9 // 最低价
      newProduct.basePrice = 0
    }

    // 保存到本地存储
    const products = wx.getStorageSync('mock_products') || []
    products.unshift(newProduct)
    
    try {
      wx.setStorageSync('mock_products', products)
      this.hideTestMenu()
      wx.showToast({
        title: '测试商品已创建',
        icon: 'success'
      })
      // 刷新页面
      setTimeout(() => {
        this.loadProducts()
      }, 500)
    } catch (error) {
      console.error('创建测试商品失败', error)
      wx.showToast({
        title: '创建失败，存储空间可能不足',
        icon: 'none'
      })
    }
  }
  // ==================== 🧪 测试功能结束 ====================
})
