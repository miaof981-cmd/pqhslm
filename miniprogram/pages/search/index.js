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
    const products = rawProducts.map(product => {
      const price = parseFloat(product.price) || parseFloat(product.basePrice) || 0
      const coverImage = ensureRenderableImage(
        Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.productImage,
        { namespace: 'search-cover', fallback: DEFAULT_PLACEHOLDER }
      )
      const categoryName = product.categoryName || categoryService.getCategoryNameById(product.category)
      const tags = Array.isArray(product.tags) ? product.tags : []

      return {
        id: product.id || product._id,
        name: product.name || '未命名商品',
        price: price.toFixed(2),
        coverImage,
        tags,
        categoryName: categoryName || '',
        deliveryDays: product.deliveryDays || 0,
        searchTokens: [
          (product.name || '').toLowerCase(),
          (categoryName || '').toLowerCase(),
          ...(tags.map(tag => String(tag).toLowerCase()))
        ].filter(Boolean)
      }
    }).filter(item => !!item.id)

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
