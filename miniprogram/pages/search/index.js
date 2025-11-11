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
    empty: false,
    // 🔍 诊断数据（用于排查搜索问题）
    diagnosticReport: null
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
    
    // 🔍 诊断记录器
    const diagnostic = {
      totalProducts: rawProducts.length,
      afterOnSaleFilter: 0,
      afterIdFilter: 0,
      targetProduct: null, // "蓝色"商品的详细信息
      allProducts: [] // 所有商品的简要信息
    }
    
    // 🔧 修复：与首页保持完全一致的过滤逻辑
    const products = rawProducts
      .filter(p => {
        // ✅ 关键修复：只要 isOnSale 不是明确的 false，就显示
        // 这样可以兼容：true、1、'1'、'true'、undefined、null 等所有"真值"
        const shouldShow = p.isOnSale !== false
        
        // 🔍 诊断：记录"蓝色"商品的过滤结果
        if (p.name === '蓝色' || (p.name && p.name.includes('蓝色'))) {
          if (!shouldShow) {
            diagnostic.targetProduct = {
              name: p.name,
              step: '第一步：isOnSale过滤',
              reason: `isOnSale=${p.isOnSale}，被判定为下架商品`,
              pass: false
            }
          }
        }
        
        if (!shouldShow) {
          console.log('[搜索过滤] 过滤掉商品（isOnSale=false）:', p.name, 'isOnSale:', p.isOnSale)
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
      
      // 🎯 获取画师名字和编号（总是优先从users读取最新昵称）
      let artistName = ''
      let artistNumber = ''
      
      if (product.artistId) {
        // 🔧 修复：总是优先从 users 列表读取最新昵称（解决画师改名后搜索不到的问题）
        const artist = users.find(u => 
          String(u.id) === String(product.artistId) || String(u.userId) === String(product.artistId)
        )
        // 优先使用 users 中的最新昵称，降级使用 product.artistName
        artistName = artist ? (artist.nickName || artist.name || '') : (product.artistName || '')
      } else {
        // 如果没有 artistId，才直接使用 product.artistName
        artistName = product.artistName || ''
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
      
      const processedItem = {
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
      
      // 🔍 诊断：记录"蓝色"商品的详细信息
      if (product.name === '蓝色' || (product.name && product.name.includes('蓝色'))) {
        diagnostic.targetProduct = {
          name: product.name,
          step: '第二步：数据提取',
          rawArtistId: product.artistId,
          artistIdType: typeof product.artistId,
          artistName: artistName,
          artistNumber: artistNumber,
          searchTokens: processedItem.searchTokens,
          hasNumber1: processedItem.searchTokens.includes('1'),
          pass: true
        }
      }
      
      // 🔍 记录所有商品的简要信息（用于对比）
      diagnostic.allProducts.push({
        name: product.name,
        artistId: product.artistId,
        artistNumber: artistNumber,
        hasNumber1: processedItem.searchTokens.includes('1')
      })
      
      return processedItem
    }).filter(item => {
      // 🔧 修复：严格检查id存在性（允许0、'0'等值）
      const hasValidId = item.id !== undefined && item.id !== null && item.id !== ''
      
      // 🔍 诊断："蓝色"商品是否通过ID过滤
      if (item.name === '蓝色' || (item.name && item.name.includes('蓝色'))) {
        if (!hasValidId) {
          diagnostic.targetProduct = {
            ...diagnostic.targetProduct,
            step: '第三步：ID过滤',
            reason: `id=${item.id}，被判定为无效ID`,
            pass: false
          }
        } else {
          diagnostic.targetProduct = {
            ...diagnostic.targetProduct,
            step: '第三步：ID过滤',
            pass: true,
            finalId: item.id
          }
        }
      }
      
      if (!hasValidId) {
        console.log('[搜索过滤] 过滤掉商品（无效ID）:', item.name, 'id:', item.id)
      }
      return hasValidId
    })

    // 🔍 统计最终结果
    diagnostic.afterOnSaleFilter = products.length
    diagnostic.afterIdFilter = products.length
    
    // 🔍 保存诊断报告到data
    this.diagnosticReport = diagnostic

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
    
    // 🔍 特殊关键词：触发诊断报告
    if (normalized === '诊断' || normalized === 'debug' || normalized === '排查') {
      this.showDiagnosticReport()
      return
    }
    
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
  
  // 🔍 显示诊断报告（手机端可见）
  showDiagnosticReport() {
    const report = this.diagnosticReport
    if (!report) {
      wx.showModal({
        title: '诊断报告',
        content: '诊断数据未初始化，请重新进入搜索页面',
        showCancel: false
      })
      return
    }
    
    let content = `【商品数据统计】\n`
    content += `总商品数: ${report.totalProducts}\n`
    content += `通过上架过滤: ${report.afterOnSaleFilter}\n`
    content += `通过ID过滤: ${report.afterIdFilter}\n\n`
    
    if (report.targetProduct) {
      const target = report.targetProduct
      content += `【"蓝色"商品详情】\n`
      content += `当前步骤: ${target.step}\n`
      content += `是否通过: ${target.pass ? '✅ 是' : '❌ 否'}\n`
      
      if (target.rawArtistId !== undefined) {
        content += `画师ID: ${target.rawArtistId} (${target.artistIdType})\n`
        content += `画师编号: ${target.artistNumber || '无'}\n`
        content += `搜索索引包含"1": ${target.hasNumber1 ? '✅ 是' : '❌ 否'}\n`
      }
      
      if (target.searchTokens) {
        content += `搜索关键词: [${target.searchTokens.slice(0, 3).join(', ')}...]\n`
      }
      
      if (target.reason) {
        content += `\n❌ 失败原因:\n${target.reason}`
      }
    } else {
      content += `【"蓝色"商品】\n未找到名为"蓝色"的商品`
    }
    
    // 🔍 对比其他画师1的商品
    const artist1Products = report.allProducts.filter(p => 
      String(p.artistId) === '1' || String(p.artistId) === '001' || p.artistNumber === '1'
    )
    
    if (artist1Products.length > 0) {
      content += `\n\n【画师1的其他商品】\n`
      artist1Products.slice(0, 3).forEach(p => {
        content += `${p.name}: 编号=${p.artistNumber || '无'}, 包含"1"=${p.hasNumber1 ? '✅' : '❌'}\n`
      })
      if (artist1Products.length > 3) {
        content += `... 还有${artist1Products.length - 3}个商品`
      }
    }
    
    wx.showModal({
      title: '🔍 搜索诊断报告',
      content: content,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: content,
            success: () => {
              wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
            }
          })
        }
      }
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
