const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')
const categoryService = require('../../utils/category-service.js')

const HISTORY_STORAGE_KEY = 'search_history_keywords'

Page({
  data: {
    keyword: '',
    history: [],
    results: [],
    allProducts: [],
    loading: true,
    empty: false
  },

  onLoad() {
    this.loadHistory()
    this.loadProducts()
  },

  // 🎯 每次显示页面时重新加载商品（确保画师改名等数据更新能实时同步）
  onShow() {
    this.loadProducts()
  },

  loadHistory() {
    try {
      const stored = wx.getStorageSync(HISTORY_STORAGE_KEY) || []
      if (Array.isArray(stored)) {
        this.setData({ history: stored.slice(0, 10) })
      }
    } catch (error) {
      console.warn('[search] 读取搜索历史失败:', error)
    }
  },

  saveHistory(keyword) {
    const value = (keyword || '').trim()
    if (!value) return

    const history = this.data.history.filter(item => item !== value)
    history.unshift(value)
    const truncated = history.slice(0, 10)

    this.setData({ history: truncated })
    wx.setStorageSync(HISTORY_STORAGE_KEY, truncated)
  },

  clearHistory() {
    wx.showModal({
      title: '清除搜索记录',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(HISTORY_STORAGE_KEY)
          this.setData({ history: [] })
        }
      }
    })
  },

  loadProducts() {
    const rawProducts = wx.getStorageSync('mock_products') || []
    const users = wx.getStorageSync('users') || []
    const artistApplications = wx.getStorageSync('artist_applications') || []
    
    // 🔧 修复：只加载已上架的商品（兼容多种状态值）
    const products = rawProducts
      .filter(p => {
        // 检查上架状态（兼容多种值）
        const isOnSale = p.isOnSale
        const status = p.status
        
        // 兼容多种上架状态：
        // 1. isOnSale: true/undefined/null/'上架'/'已上架'/'onSale'
        // 2. status: 'active'/'online'/'上架'/'已上架'/'onSale'
        const shouldShow = 
          isOnSale === true || 
          isOnSale === undefined || 
          isOnSale === null ||
          isOnSale === '上架' ||
          isOnSale === '已上架' ||
          isOnSale === 'onSale' ||
          status === 'active' ||
          status === 'online' ||
          status === '上架' ||
          status === '已上架' ||
          status === 'onSale'
        
        if (!shouldShow) {
          console.log('[搜索过滤] 过滤掉商品（未上架）:', p.name, 'isOnSale:', isOnSale, 'status:', status)
        }
        
        return shouldShow
      })
      .map(product => {
      const price = parseFloat(product.price) || parseFloat(product.basePrice) || 0
      const coverImage = ensureRenderableImage(
        Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.productImage,
        { namespace: 'search-cover', fallback: DEFAULT_PLACEHOLDER }
      )
      const categoryName = product.categoryName || categoryService.getCategoryNameById(product.category)
      const tags = Array.isArray(product.tags) ? product.tags : []
      
      // 🎯 获取画师名字和编号
      let artistName = product.artistName || ''
      let artistNumber = ''
      
      if (!artistName && product.artistId) {
        // 🔧 修复：使用String()确保类型一致
        const artist = users.find(u => 
          String(u.id) === String(product.artistId) || String(u.userId) === String(product.artistId)
        )
        artistName = artist ? (artist.nickName || artist.name || '') : ''
      }
      
      // 🎯 新增：获取画师编号用于搜索
      if (product.artistId) {
        // 🔧 修复：使用String()确保类型一致
        const artistApp = artistApplications.find(app => 
          String(app.userId) === String(product.artistId) && app.status === 'approved'
        )
        if (artistApp && artistApp.artistNumber) {
          artistNumber = String(artistApp.artistNumber)
        }
      }

      // 🔧 修复：提取所有规格维度（规格名 + 规格值）
      const specTokens = []
      if (Array.isArray(product.specs)) {
        product.specs.forEach(spec => {
          // 1. 提取规格名（如"颜色"、"尺寸"）
          if (spec.name) {
            specTokens.push(String(spec.name))
          }
          // 2. 🎯 关键：提取规格值（如"蓝色"、"红色"、"大号"）
          if (Array.isArray(spec.values)) {
            spec.values.forEach(value => {
              if (value.name) {
                specTokens.push(String(value.name))
              }
            })
          }
        })
      }
      
      // 🔧 调试日志：记录商品基本信息
      console.log(`[搜索加载] 商品: ${product.name}, price: ${price}, artistId: ${product.artistId}, artistNumber: ${artistNumber}`)
      
      return {
        id: product.id || product._id,
        name: product.name || '未命名商品',
        price: price.toFixed(2),
        coverImage,
        tags,
        categoryName: categoryName || '',
        deliveryDays: product.deliveryDays || 0,
        artistName, // 🎯 保存画师名字供显示
        artistNumber, // 🎯 保存画师编号供显示
        searchTokens: [
          (product.name || '').toLowerCase(),
          (product.id || '').toLowerCase(),
          (categoryName || '').toLowerCase(),
          (artistName || '').toLowerCase(),
          artistNumber ? String(artistNumber).toLowerCase() : '',
          ...(tags.map(tag => String(tag).toLowerCase())),
          ...(specTokens.map(token => token.toLowerCase())) // 🔧 修复：包含规格名和规格值
        ].filter(token => token && token.length > 0)
      }
    }).filter(item => {
      // 🔧 修复：严格检查id存在性（允许0、'0'等值）
      const hasValidId = item.id !== undefined && item.id !== null && item.id !== ''
      if (!hasValidId) {
        console.log('[搜索过滤] 过滤掉商品（无效ID）:', item.name, 'id:', item.id)
      }
      return hasValidId
    })

    this.setData({
      allProducts: products,
      results: products,
      loading: false,
      empty: products.length === 0
    })
  },

  handleInput(e) {
    const value = (e.detail.value || '').trimStart()
    this.setData({ keyword: value })
    this.performSearch(value)
  },

  handleConfirm(e) {
    const value = (e.detail.value || '').trim()
    this.setData({ keyword: value })
    this.saveHistory(value)
    this.performSearch(value)
  },

  handleClearKeyword() {
    this.setData({ keyword: '' })
    this.performSearch('')
  },

  selectHistory(e) {
    const value = e.currentTarget.dataset.value
    if (!value) return
    this.setData({ keyword: value })
    this.performSearch(value)
  },

  performSearch(keyword) {
    const normalized = (keyword || '').trim().toLowerCase()
    let results = this.data.allProducts

    if (normalized) {
      results = this.data.allProducts.filter(product => {
        if (!product || !product.searchTokens) return false
        return product.searchTokens.some(token => token.includes(normalized))
      })
    }

    this.setData({
      results,
      empty: (normalized ? results.length === 0 : this.data.allProducts.length === 0)
    })
  },

  goBack() {
    wx.navigateBack()
  },

  openProduct(e) {
    const productId = e.currentTarget.dataset.id
    if (!productId) return
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${productId}`
    })
  }
})
