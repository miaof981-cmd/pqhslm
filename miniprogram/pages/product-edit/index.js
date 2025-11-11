const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')
const categoryService = require('../../utils/category-service.js')

// 🎯 更新：根据实际橱窗类型调整分类
const DEFAULT_CATEGORY_OPTIONS = [
  { id: 'chibi_portrait', name: 'Q版头像', icon: '😊' },
  { id: 'half_body', name: '半身像', icon: '👤' },
  { id: 'full_body', name: '全身像', icon: '🧍' },
  { id: 'scene', name: '场景插画', icon: '🖼️' },
  { id: 'emoticon', name: '表情包', icon: '😄' },
  { id: 'logo', name: 'LOGO设计', icon: '🏷️' },
  { id: 'ui', name: 'UI设计', icon: '📱' },
  { id: 'animation', name: '动画设计', icon: '🎬' }
]

Page({
  data: {
    loading: false,
    productId: '',
    isEdit: false,
    
    // 步骤控制
    currentStep: 1,
    progress: 33, // 当前进度百分比
    draftSaved: false, // 是否已保存草稿
    
    // 表单数据
    formData: {
      name: '',
      summary: '',
      summaryImages: [],
      basePrice: '', // 基础价格
      stock: 0, // 默认0表示无限库存
      category: '',
      images: [],
      tags: [],
      isOnSale: true,
      maxBuyCount: 0
    },
    previewImages: [],
    
    // 库存管理
    enableStockLimit: false, // 默认自动补货模式
    
    // 富文本编辑器（使用 selection 来准确追踪光标）
    selectionStart: -1, // 选区开始位置
    selectionEnd: -1, // 选区结束位置
    cursorPosition: 0, // 当前光标位置（用于插入）
    
    // 防抖 timer
    saveDraftTimer: null,
    draftSaved: false,
    
    // 第一步：基础信息
    categories: DEFAULT_CATEGORY_OPTIONS.slice(),
    categoryIndex: -1,
    categoryName: '请选择分类',
    deliveryDays: 7, // 默认7天
    tagOptions: ['热销', '推荐', '特价', '精品', '原创', '限量', '包修改', '专业', '创意', '高质量', '现代', '可爱', '实用'],
    
    // 第二步：规格与定价
    spec1Selected: false,
    spec1Name: '',
    spec1Values: [],
    spec2Selected: false,
    spec2Name: '',
    spec2Values: [],
    pricePreviewTable: [], // 价格预览表
    finalPrice: 0, // 最终显示价格（用于第三步确认）
  },

  onLoad(options) {
    this.initCategoryOptions()

    if (options.id) {
      // 编辑模式：加载商品数据
      this.setData({
        productId: options.id,
        isEdit: true
      })
      this.loadProduct()
    } else {
      // 新增模式：尝试恢复草稿
      this.loadDraft()
    }
  },

  initCategoryOptions() {
    const serviceOptions = categoryService.getCategoryOptions()
    const legacyCandidates =
      wx.getStorageSync('product_category_options') ||
      wx.getStorageSync('product_categories') ||
      wx.getStorageSync('categories') ||
      []

    const merged = []
    const pushUnique = item => {
      if (!item) return
      const id = item.id || item._id || item.code || item.value
      if (!id) return
      if (merged.some(existing => String(existing.id || existing._id) === String(id))) return
      merged.push(item)
    }

    if (Array.isArray(serviceOptions)) {
      serviceOptions.forEach(pushUnique)
    }
    if (Array.isArray(legacyCandidates)) {
      legacyCandidates.forEach(pushUnique)
    }

    const normalized = this.normalizeCategoryOptions(merged.length > 0 ? merged : DEFAULT_CATEGORY_OPTIONS)
    if (normalized.length > 0) {
      this.setData({ categories: normalized })
      this.syncCategorySelection(normalized)
    }
  },

  normalizeCategoryOptions(rawList) {
    if (!Array.isArray(rawList)) return []

    return rawList
      .map((item, index) => {
        if (!item) return null
        const id = item.id || item._id || item.code || item.value
        const name = item.name || item.title || item.label
        if (!id || !name) return null

        const icon =
          item.icon ||
          DEFAULT_CATEGORY_OPTIONS[index % DEFAULT_CATEGORY_OPTIONS.length]?.icon ||
          ''

        return {
          id: String(id),
          name,
          icon
        }
      })
      .filter(Boolean)
  },

  syncCategorySelection(categories = this.data.categories) {
    const currentId = this.data.formData?.category
    if (!currentId) return
    const normalizedId = String(currentId)
    const idx = (categories || []).findIndex(item => String(item.id) === normalizedId)
    if (idx !== -1) {
      this.setData({
        categoryIndex: idx,
        categoryName: categories[idx].name
      })
    }
  },

  ensureCategoryInList(categoryId, categoryName) {
    if (!categoryId) return
    const normalizedId = String(categoryId)
    const categories = this.data.categories || []
    const exists = categories.some(item => String(item.id) === normalizedId)
    if (!exists) {
      const nextCategories = [
        ...categories,
        {
          id: normalizedId,
          name: categoryName || normalizedId,
          icon: ''
        }
      ]
      this.setData({ categories: nextCategories })
      this.syncCategorySelection(nextCategories)
    } else {
      this.syncCategorySelection(categories)
    }
  },

  // 加载商品信息
  async loadProduct() {
    this.setData({ loading: true })
    
    try {
      // 从本地存储加载商品数据
      const products = wx.getStorageSync('mock_products') || []
      const product = products.find(p => p.id === this.data.productId)
      
      if (!product) {
        wx.showToast({ 
          title: '商品不存在或已删除', 
          icon: 'none',
          duration: 2000
        })
        console.error('商品ID不存在:', this.data.productId)
        setTimeout(() => wx.navigateBack(), 2000)
        return
      }
      
      console.log('加载商品数据', product)
      
      // 找到分类索引
      const categoryIndex = this.data.categories.findIndex(c => c.id === product.category)
      const categoryName = categoryIndex >= 0 ? this.data.categories[categoryIndex].name : '请选择分类'
      
      // 恢复出稿天数
      const deliveryDays = product.deliveryDays || 7
      
      // 恢复表单数据
      const restoredImages = Array.isArray(product.images) ? product.images : []
      
      // 🎯 第2层防御：加载时验证category
      const loadedCategory = product.category || ''
      const cleanedCategory = this.validateAndCleanCategory(loadedCategory)
      
      if (loadedCategory && !cleanedCategory) {
        console.warn('⚠️ 商品数据中的分类异常，已自动清空:', loadedCategory)
        wx.showToast({ title: '检测到分类异常，请重新选择', icon: 'none', duration: 2000 })
      }

      this.setData({
        formData: {
          name: product.name || '',
          summary: product.summary || '',
          summaryImages: product.summaryImages || [],
          basePrice: product.basePrice || '',
          stock: product.stock || 0,
          category: cleanedCategory,  // 🎯 使用清洗后的分类
          images: restoredImages,
          tags: product.tags || [],
          isOnSale: product.isOnSale !== false,
          maxBuyCount: product.maxBuyCount || 0
        },
        categoryIndex: categoryIndex >= 0 ? categoryIndex : -1,
        categoryName,
        deliveryDays,
        enableStockLimit: product.stock > 0,
        previewImages: this.createPreviewImages(restoredImages)
      })
      
      this.ensureCategoryInList(product.category || product.categoryId, categoryName)
      
      // 恢复规格数据
      if (product.specs && product.specs.length > 0) {
        const spec1 = product.specs[0]
        this.setData({
          spec1Selected: true,
          spec1Name: spec1.name || '',
          spec1Values: spec1.values || []
        })
        
        if (product.specs.length > 1) {
          const spec2 = product.specs[1]
          this.setData({
            spec2Selected: true,
            spec2Name: spec2.name || '',
            spec2Values: spec2.values || []
          })
        }
        
        // 更新价格预览
        this.updatePricePreview()
      }
      
      console.log('商品数据加载完成')
    } catch (error) {
      console.error('加载商品失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },


  // 步骤导航
  goToStep(e) {
    const step = parseInt(e.currentTarget.dataset.step)
    if (step < this.data.currentStep) {
      // 允许返回上一步
      this.setData({
        currentStep: step,
        progress: step * 33.33
      })
    }
  },

  prevStep() {
    if (this.data.currentStep > 1) {
      // 先保存当前步骤的数据
      this.saveDraft()
      
      this.setData({
        currentStep: this.data.currentStep - 1,
        progress: (this.data.currentStep - 1) * 33.33
      })
    }
  },

  nextStep() {
    // 验证当前步骤
    if (!this.validateStep()) {
      return
    }
    
    if (this.data.currentStep < 3) {
      const nextStep = this.data.currentStep + 1
      
      // 如果进入第三步，计算最终价格
      if (nextStep === 3) {
        const finalPrice = this.calculateFinalPrice()
        this.setData({
          currentStep: nextStep,
          progress: nextStep * 33.33,
          finalPrice: finalPrice
        })
      } else {
        this.setData({
          currentStep: nextStep,
          progress: nextStep * 33.33
        })
      }
      
      // 自动保存草稿
      this.saveDraft()
    }
  },

  // 验证当前步骤
  validateStep() {
    const { currentStep, formData, categoryIndex, deliveryDays } = this.data
    
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        wx.showToast({ title: '请输入商品名称', icon: 'none' })
        return false
      }
      if (formData.name.trim().length < 2) {
        wx.showToast({ title: '商品名称至少2个字', icon: 'none' })
        return false
      }
      if (categoryIndex < 0) {
        wx.showToast({ title: '请选择商品分类', icon: 'none' })
        return false
      }
      if (formData.images.length === 0) {
        wx.showToast({ title: '请上传商品图片', icon: 'none' })
        return false
      }
    } else if (currentStep === 2) {
      // 价格验证：基础价格和规格价格二选一
      const hasBasePrice = formData.basePrice && parseFloat(formData.basePrice) > 0
      const hasValidSpecs = this.hasValidSpecPrices()
      
      if (!hasBasePrice && !hasValidSpecs) {
        wx.showToast({ 
          title: '请设置基础价格或规格价格', 
          icon: 'none',
          duration: 2500
        })
        return false
      }

      // ⚠️ 最低价格验证：不得低于9.9元
      const MINIMUM_PRICE = 9.9
      
      // 检查基础价格
      if (hasBasePrice) {
        const basePrice = parseFloat(formData.basePrice)
        if (basePrice < MINIMUM_PRICE) {
          wx.showToast({ 
            title: `商品价格不得低于¥${MINIMUM_PRICE}`, 
            icon: 'none',
            duration: 2500
          })
          return false
        }
      }
      
      // 检查规格价格
      if (hasValidSpecs) {
        const minSpecPrice = this.getMinimumSpecPrice()
        if (minSpecPrice < MINIMUM_PRICE) {
          wx.showToast({ 
            title: `规格价格不得低于¥${MINIMUM_PRICE}`, 
            icon: 'none',
            duration: 2500
          })
          return false
        }
      }
    }
    
    return true
  },

  // 检查是否有有效的规格价格
  hasValidSpecPrices() {
    // 检查一级规格
    if (this.data.spec1Selected && this.data.spec1Values.length > 0) {
      const hasValidSpec1 = this.data.spec1Values.some(v => 
        v.name && v.name.trim() && v.addPrice && parseFloat(v.addPrice) >= 0
      )
      if (hasValidSpec1) return true
    }
    
    // 检查二级规格
    if (this.data.spec2Selected && this.data.spec2Values.length > 0) {
      const hasValidSpec2 = this.data.spec2Values.some(v => 
        v.name && v.name.trim() && v.addPrice && parseFloat(v.addPrice) >= 0
      )
      if (hasValidSpec2) return true
    }
    
    return false
  },

  // 获取规格价格中的最低价
  getMinimumSpecPrice() {
    let minPrice = Infinity
    
    // 检查一级规格
    if (this.data.spec1Selected && this.data.spec1Values.length > 0) {
      this.data.spec1Values.forEach(v => {
        if (v.name && v.name.trim() && v.addPrice) {
          const price = parseFloat(v.addPrice)
          if (!isNaN(price) && price >= 0) {
            minPrice = Math.min(minPrice, price)
          }
        }
      })
    }
    
    // 检查二级规格（如果有二级规格，可能需要加到一级规格价格上）
    if (this.data.spec2Selected && this.data.spec2Values.length > 0) {
      let minSpec1Price = 0
      if (this.data.spec1Selected && this.data.spec1Values.length > 0) {
        minSpec1Price = Math.min(...this.data.spec1Values
          .filter(v => v.name && v.name.trim() && v.addPrice)
          .map(v => parseFloat(v.addPrice) || 0)
        )
      }
      
      this.data.spec2Values.forEach(v => {
        if (v.name && v.name.trim() && v.addPrice) {
          const price = parseFloat(v.addPrice)
          if (!isNaN(price) && price >= 0) {
            minPrice = Math.min(minPrice, minSpec1Price + price)
          }
        }
      })
    }
    
    return minPrice === Infinity ? 0 : minPrice
  },

  // 保存草稿（防抖版本）
  saveDraft() {
    // 清除之前的定时器
    if (this.data.saveDraftTimer) {
      clearTimeout(this.data.saveDraftTimer)
    }
    
    // 设置新的定时器，500ms 后执行保存
    const timer = setTimeout(() => {
      this._performSaveDraft()
    }, 500)
    
    this.setData({ saveDraftTimer: timer })
  },
  
  // 实际执行保存
  _performSaveDraft() {
    try {
      const draftData = {
        currentStep: this.data.currentStep,
        progress: this.data.progress,
        formData: JSON.parse(JSON.stringify(this.data.formData)), // 深拷贝
        categoryIndex: this.data.categoryIndex,
        categoryName: this.data.categoryName,
        deliveryDays: this.data.deliveryDays,
        enableStockLimit: this.data.enableStockLimit,
        spec1Selected: this.data.spec1Selected,
        spec1Name: this.data.spec1Name,
        spec1Values: JSON.parse(JSON.stringify(this.data.spec1Values)), // 深拷贝
        spec2Selected: this.data.spec2Selected,
        spec2Name: this.data.spec2Name,
        spec2Values: JSON.parse(JSON.stringify(this.data.spec2Values)), // 深拷贝
        pricePreviewTable: this.data.pricePreviewTable,
        timestamp: Date.now()
      }
      
      // 计算草稿大小（仅用于日志）
      const draftSize = JSON.stringify(draftData).length
      const draftSizeKB = (draftSize / 1024).toFixed(2)
      
      console.log('=== 保存草稿 ===')
      console.log('商品名称:', draftData.formData.name)
      console.log('图片数量:', draftData.formData.images.length)
      console.log('当前步骤:', draftData.currentStep)
      console.log('草稿大小:', draftSizeKB, 'KB')
      
      wx.setStorageSync('product_draft', draftData)
      
      // 验证保存是否成功
      const savedDraft = wx.getStorageSync('product_draft')
      if (savedDraft && savedDraft.timestamp === draftData.timestamp) {
        console.log('✅ 草稿保存成功')
        // 🎯 修复：不显示保存提示，避免频繁打扰用户
      } else {
        console.error('❌ 草稿保存验证失败')
      }
    } catch (error) {
      console.error('❌ 保存草稿失败', error)
      
      // 尝试清理旧草稿释放空间后重试
      try {
        const oldDraft = wx.getStorageSync('product_draft')
        if (oldDraft) {
          wx.removeStorageSync('product_draft')
          console.log('✅ 已清理旧草稿，尝试重新保存')
          // 不再重试，避免循环
        }
      } catch (e) {
        console.error('清理草稿失败', e)
      }
      
      // 静默失败，不打扰用户
      console.warn('草稿保存失败，但不影响继续编辑')
    }
  },

  // 加载草稿
  loadDraft() {
    if (this.data.isEdit) return // 编辑模式不恢复草稿
    
    try {
      const draft = wx.getStorageSync('product_draft')
      if (draft && draft.timestamp) {
        // 草稿有效期：7天（避免累积太多过期草稿）
        const DRAFT_EXPIRY = 7 * 24 * 60 * 60 * 1000
        const isValid = Date.now() - draft.timestamp < DRAFT_EXPIRY
        
        if (!isValid) {
          // 草稿已过期，自动清理
          wx.removeStorageSync('product_draft')
          console.log('✅ 已清理过期草稿（超过7天）')
          return
        }
        
        if (isValid) {
          // 生成草稿摘要
          const productName = draft.formData?.name || '(未命名)'
          const imageCount = draft.formData?.images?.length || 0
          const stepName = draft.currentStep === 1 ? '基础信息' : draft.currentStep === 2 ? '规格定价' : '详情发布'
          const draftSummary = `商品: ${productName}\n已上传 ${imageCount} 张图片\n进度: ${stepName}`
          
          wx.showModal({
            title: '发现未完成的草稿',
            content: draftSummary + '\n\n是否继续编辑？\n（取消将清除草稿）',
            confirmText: '继续编辑',
            cancelText: '放弃草稿',
            success: (res) => {
              if (res.confirm) {
                console.log('✅ 恢复草稿', draft)
                
                // 🎯 第3层防御：恢复草稿时验证category
                const draftFormData = draft.formData || this.data.formData
                if (draftFormData.category) {
                  const cleanedCategory = this.validateAndCleanCategory(draftFormData.category)
                  if (!cleanedCategory) {
                    console.warn('⚠️ 草稿中的分类异常，已自动清空:', draftFormData.category)
                    draftFormData.category = ''
                    wx.showToast({ title: '草稿中分类异常，请重新选择', icon: 'none', duration: 2000 })
                  } else {
                    draftFormData.category = cleanedCategory
                  }
                }
                
                this.setData({
                  currentStep: draft.currentStep || 1,
                  progress: draft.progress || 33,
                  formData: draftFormData,
                  categoryIndex: draft.categoryIndex >= 0 ? draft.categoryIndex : -1,
                  categoryName: draft.categoryName || '请选择分类',
                  deliveryDays: draft.deliveryDays || 7,
                  enableStockLimit: draft.enableStockLimit || false,
                  spec1Selected: draft.spec1Selected || false,
                  spec1Name: draft.spec1Name || '',
                  spec1Values: draft.spec1Values || [],
                  spec2Selected: draft.spec2Selected || false,
                  spec2Name: draft.spec2Name || '',
                  spec2Values: draft.spec2Values || [],
                  pricePreviewTable: draft.pricePreviewTable || [],
                  previewImages: this.createPreviewImages(draft.formData?.images || [])
                })
                
                this.ensureCategoryInList(
                  draftFormData.category,
                  draft.categoryName
                )
                
                wx.showToast({
                  title: '草稿已恢复',
                  icon: 'success'
                })
              } else {
                // 用户选择放弃草稿
                wx.removeStorageSync('product_draft')
                console.log('❌ 用户放弃草稿')
              }
            }
          })
        } else {
          // 草稿过期，清除
          wx.removeStorageSync('product_draft')
          console.log('⏰ 草稿已过期（>24小时）')
        }
      } else {
        console.log('ℹ️ 无草稿数据')
      }
    } catch (error) {
      console.error('❌ 加载草稿失败', error)
    }
  },

  // ===== 第一步：基础信息 =====

  // 输入商品名称
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  // 选择主图
  async chooseImages() {
    try {
      const res = await wx.chooseImage({
        count: 9 - this.data.formData.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '处理图片中...' })
      
      // 压缩并转换为 base64
      const promises = res.tempFilePaths.map(tempPath => {
        return this.compressAndConvertImage(tempPath)
      })
      
      const results = await Promise.all(promises)
      
      // 过滤成功的图片
      const validImages = results.filter(result => result.success).map(result => result.image)
      
      wx.hideLoading()
      
      if (validImages.length > 0) {
        const newImages = [...this.data.formData.images, ...validImages]
        this.setData({
          'formData.images': newImages,
          previewImages: this.createPreviewImages(newImages)
        })
        
        wx.showToast({ 
          title: `已添加${validImages.length}张图片`, 
          icon: 'success' 
        })
        
        console.log('✅ 图片已压缩', validImages.length, '张')
      } else {
        wx.showToast({ title: '图片处理失败', icon: 'none' })
      }

    } catch (error) {
      wx.hideLoading()
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        wx.showToast({ title: '选择图片失败', icon: 'none' })
        console.error('选择图片错误:', error)
      }
    }
  },
  
  // 压缩并转换图片为 base64（单张限制2MB）
  async compressAndConvertImage(tempPath) {
    return new Promise((resolve) => {
      // 先使用 canvas 压缩图片
      wx.getImageInfo({
        src: tempPath,
        success: (imgInfo) => {
          // 🎯 修复：统一裁剪为正方形，避免不同比例图片渲染错位
          const targetSize = 1200  // 统一尺寸
          const sourceSize = Math.min(imgInfo.width, imgInfo.height)  // 取短边
          
          // 计算裁剪起点（居中裁剪）
          const offsetX = (imgInfo.width - sourceSize) / 2
          const offsetY = (imgInfo.height - sourceSize) / 2
          
          console.log(`📐 图片裁剪: 原始${imgInfo.width}x${imgInfo.height} → 裁剪${sourceSize}x${sourceSize} → 输出${targetSize}x${targetSize}`)
          
          // 创建 canvas 进行压缩
          const ctx = wx.createCanvasContext('compressCanvas', this)
          // 🎯 关键：使用9参数drawImage实现居中裁剪
          // drawImage(src, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
          ctx.drawImage(tempPath, offsetX, offsetY, sourceSize, sourceSize, 0, 0, targetSize, targetSize)
          ctx.draw(false, () => {
            // 导出为临时文件（正方形）
            wx.canvasToTempFilePath({
              canvasId: 'compressCanvas',
              destWidth: targetSize,
              destHeight: targetSize,  // 🎯 修复：强制正方形输出
              quality: 0.75, // 压缩质量 75%，平衡质量和大小
              success: (canvasRes) => {
                // 🎯 直接使用临时文件路径，不转base64（避免mode渲染问题）
                console.log(`✅ 图片压缩成功: ${targetSize}x${targetSize} (正方形)`)
                
                resolve({ 
                  success: true, 
                  image: canvasRes.tempFilePath,  // 直接用临时路径
                  size: 0
                })
              },
              fail: (err) => {
                console.error('❌ canvas导出失败:', err)
                // 降级：直接使用原始临时路径
                console.log('⚠️ 使用原始临时路径')
                resolve({ 
                  success: true, 
                  image: tempPath,
                  size: 0
                })
              }
            }, this)
          })
        },
        fail: (err) => {
          console.error('❌ 获取图片信息失败:', err)
          // 降级：直接使用原始临时路径
          console.log('⚠️ 使用原始临时路径')
          resolve({ 
            success: true, 
            image: tempPath,
            size: 0
          })
        }
      })
    })
  },
  
  createPreviewImages(images = []) {
    if (!Array.isArray(images)) return []
    // 🎯 直接返回临时路径，不做转换（避免mode渲染问题）
    return images.map(image => image || DEFAULT_PLACEHOLDER)
  },

  // 直接转换（降级方案）
  directConvertToBase64(tempPath, resolve) {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: tempPath,
      encoding: 'base64',
      success: (fileRes) => {
        const sizeKB = (fileRes.data.length / 1024).toFixed(2)
        
        console.log('⚠️ 使用原图转换，大小:', sizeKB, 'KB')
        
        const base64 = 'data:image/jpeg;base64,' + fileRes.data
        resolve({ 
          success: true, 
          image: base64,
          size: sizeKB
        })
      },
      fail: (err) => {
        console.error('❌ 直接转换失败:', err)
        resolve({ success: false, image: null })
      }
    })
  },

  // 删除主图
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.formData.images]
    images.splice(index, 1)
    this.setData({
      'formData.images': images,
      previewImages: this.createPreviewImages(images)
    })
  },

  // 选择分类
  // 分类点选（卡片式）
  onCategorySelect(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    console.log('🏷️ 点击分类, index:', index)
    console.log('📋 categories length:', this.data.categories.length)
    
    if (index >= 0 && index < this.data.categories.length) {
      const category = this.data.categories[index]
      console.log('✅ 选中分类:', category.name, category.id)
      
      this.setData({
        'formData.category': category.id,
        categoryIndex: index,
        categoryName: category.name
      })
      
      console.log('📌 更新后 categoryIndex:', this.data.categoryIndex)
      console.log('📌 更新后 formData.category:', this.data.formData.category)
      
      this.saveDraft()
    } else {
      console.error('❌ 分类索引超出范围:', index)
    }
  },

  // 选择出稿天数
  // 出稿天数滑动中
  onDeliveryDaysChanging(e) {
    this.setData({
      deliveryDays: e.detail.value
    })
  },
  
  // 出稿天数滑动完成
  onDeliveryDaysChange(e) {
    this.setData({
      deliveryDays: e.detail.value
    })
    this.saveDraft()
  },

  // 标签由管理员控制，画师不可编辑

  // ===== 第二步：规格与定价 =====

  // 输入基础价格
  onBasePriceInput(e) {
    let value = e.detail.value
    value = value.replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts[1]
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    this.setData({
      'formData.basePrice': value
    })
    this.updatePricePreview()
  },

  // 切换库存模式
  toggleStockMode(e) {
    const mode = e.currentTarget.dataset.mode
    const enableStockLimit = mode === 'limit'
    
    this.setData({
      enableStockLimit,
      'formData.stock': enableStockLimit ? 100 : 0 // 切换到限量模式时默认100
    })
  },

  // 输入库存
  onStockInput(e) {
    const value = parseInt(e.detail.value) || 0
    this.setData({
      'formData.stock': value
    })
  },

  // 减少库存
  decreaseStock() {
    const stock = Math.max(1, this.data.formData.stock - 1) // 最小为1
    this.setData({
      'formData.stock': stock
    })
  },

  // 增加库存
  increaseStock() {
    const stock = this.data.formData.stock + 1
    this.setData({
      'formData.stock': stock
    })
  },

  // 添加一级规格
  // 选择基础定价
  selectBasicPricing() {
    if (this.data.spec1Selected) {
      wx.showModal({
        title: '切换定价方式',
        content: '切换到单一价格将清除已设置的规格，确定继续吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              spec1Selected: false,
              spec1Name: '',
              spec1Values: [],
              spec2Selected: false,
              spec2Name: '',
              spec2Values: [],
              pricePreviewTable: []
            })
            this.saveDraft()
          }
        }
      })
    }
  },

  // 选择规格定价
  selectSpecPricing() {
    if (!this.data.spec1Selected) {
      this.addFirstSpec()
    }
  },

  addFirstSpec() {
    // 🎯 修复：如果已有规格数据，不重置
    if (this.data.spec1Values && this.data.spec1Values.length > 0) {
      // 只标记为选中，不清空数据
      this.setData({
        spec1Selected: true
      })
    } else {
      // 首次设置，初始化空规格
      this.setData({
        spec1Selected: true,
        spec1Name: '',
        spec1Values: [{ name: '', addPrice: '0', image: '' }]
      })
    }
    this.saveDraft()
  },

  // 重置一级规格
  resetSpec1() {
    wx.showModal({
      title: '确认重置',
      content: '确定要重置一级规格吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            spec1Selected: false,
            spec1Name: '',
            spec1Values: [],
            spec2Selected: false,
            spec2Name: '',
            spec2Values: [],
            pricePreviewTable: []
          })
        }
      }
    })
  },

  // 输入一级规格名称
  onSpec1NameInput(e) {
    this.setData({
      spec1Name: e.detail.value
    })
    this.updatePricePreview()
    // 实时保存草稿
    this.saveDraft()
  },

  // 输入一级规格值名称
  onSpec1ValueNameInput(e) {
    const index = e.currentTarget.dataset.index
    const spec1Values = [...this.data.spec1Values]
    spec1Values[index].name = e.detail.value
    this.setData({ spec1Values })
    this.updatePricePreview()
    // 实时保存草稿
    this.saveDraft()
  },

  // 输入一级规格值加价
  onSpec1ValuePriceInput(e) {
    const index = e.currentTarget.dataset.index
    const spec1Values = [...this.data.spec1Values]
    spec1Values[index].addPrice = e.detail.value
    this.setData({ spec1Values })
    this.updatePricePreview()
    // 实时保存草稿
    this.saveDraft()
  },

  // 添加一级规格值
  addSpec1Value() {
    const spec1Values = [...this.data.spec1Values]
    spec1Values.push({ name: '', addPrice: '0', image: '' })
    this.setData({ spec1Values })
    // 保存草稿
    this.saveDraft()
  },

  // 选择一级规格图片
  async chooseSpec1Image(e) {
    const index = e.currentTarget.dataset.index
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '处理中...' })
      
      // 压缩图片
      const result = await this.compressAndConvertImage(res.tempFilePaths[0])
      
      if (result.success) {
        const spec1Values = [...this.data.spec1Values]
        spec1Values[index].image = result.image
        this.setData({ spec1Values })

        wx.hideLoading()
        wx.showToast({ title: '上传成功', icon: 'success' })
        
        // 保存草稿
        this.saveDraft()
      } else {
        wx.hideLoading()
        wx.showToast({ title: '上传失败', icon: 'none' })
      }

    } catch (error) {
      wx.hideLoading()
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // 删除一级规格值
  deleteSpec1Value(e) {
    const index = e.currentTarget.dataset.index
    console.log('删除一级规格，索引:', index)
    
    if (this.data.spec1Values.length <= 1) {
      wx.showToast({ title: '至少保留一个选项', icon: 'none' })
      return
    }
    
    const spec1Values = [...this.data.spec1Values]
    spec1Values.splice(index, 1)
    
    console.log('删除后剩余:', spec1Values.length, '个选项')
    
    // 立即更新UI
    this.setData({ 
      spec1Values: spec1Values 
    }, () => {
      // setData 完成后更新价格预览
      this.updatePricePreview()
      this.saveDraft()
    })
  },

  // 显示二级规格选择
  showSpec2Selector() {
    this.setData({ spec2Selected: true })
  },

  // 重置二级规格
  resetSpec2() {
    this.setData({
      spec2Selected: false,
      spec2Name: '',
      spec2Values: []
    })
    this.updatePricePreview()
  },

  // 输入二级规格名称
  onSpec2NameInput(e) {
    this.setData({
      spec2Name: e.detail.value
    })
    this.updatePricePreview()
    // 实时保存草稿
    this.saveDraft()
  },

  // 输入二级规格值名称
  onSpec2ValueNameInput(e) {
    const index = e.currentTarget.dataset.index
    const spec2Values = [...this.data.spec2Values]
    spec2Values[index].name = e.detail.value
    this.setData({ spec2Values })
    this.updatePricePreview()
    // 实时保存草稿
    this.saveDraft()
  },

  // 输入二级规格值加价
  onSpec2ValuePriceInput(e) {
    const index = e.currentTarget.dataset.index
    const spec2Values = [...this.data.spec2Values]
    spec2Values[index].addPrice = e.detail.value
    this.setData({ spec2Values })
    this.updatePricePreview()
    // 实时保存草稿
    this.saveDraft()
  },

  // 添加二级规格值
  addSpec2Value() {
    const spec2Values = [...this.data.spec2Values]
    spec2Values.push({ name: '', addPrice: '0', image: '' })
    this.setData({ spec2Values })
    // 保存草稿
    this.saveDraft()
  },

  // 选择二级规格图片
  async chooseSpec2Image(e) {
    const index = e.currentTarget.dataset.index
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '处理中...' })
      
      // 压缩图片
      const result = await this.compressAndConvertImage(res.tempFilePaths[0])
      
      if (result.success) {
        const spec2Values = [...this.data.spec2Values]
        spec2Values[index].image = result.image
        this.setData({ spec2Values })

        wx.hideLoading()
        wx.showToast({ title: '上传成功', icon: 'success' })
        
        // 保存草稿
        this.saveDraft()
      } else {
        wx.hideLoading()
        wx.showToast({ title: '上传失败', icon: 'none' })
      }

    } catch (error) {
      wx.hideLoading()
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // 删除二级规格值
  deleteSpec2Value(e) {
    const index = e.currentTarget.dataset.index
    console.log('删除二级规格，索引:', index)
    
    if (this.data.spec2Values.length <= 1) {
      wx.showToast({ title: '至少保留一个选项', icon: 'none' })
      return
    }
    
    const spec2Values = [...this.data.spec2Values]
    spec2Values.splice(index, 1)
    
    console.log('删除后剩余:', spec2Values.length, '个选项')
    
    // 立即更新UI
    this.setData({ 
      spec2Values: spec2Values 
    }, () => {
      // setData 完成后更新价格预览
      this.updatePricePreview()
      this.saveDraft()
    })
  },

  // 更新价格预览表
  updatePricePreview() {
    const { spec1Selected, spec1Values, spec2Selected, spec2Values } = this.data
    const previewTable = []
    
    if (!spec1Selected || spec1Values.length === 0) {
      this.setData({ pricePreviewTable: [] })
      return
    }
    
    if (spec2Selected && spec2Values.length > 0) {
      // 两级规格组合：一级价格 + 二级加价
      spec1Values.forEach(v1 => {
        spec2Values.forEach(v2 => {
          const price1 = parseFloat(v1.addPrice) || 0  // 一级规格价格
          const price2 = parseFloat(v2.addPrice) || 0  // 二级加价
          const totalPrice = (price1 + price2).toFixed(2)
          previewTable.push({
            spec: `${v1.name} - ${v2.name}`,
            price: totalPrice
          })
        })
      })
    } else {
      // 只有一级规格：直接使用一级规格价格
      spec1Values.forEach(v1 => {
        const price1 = parseFloat(v1.addPrice) || 0
        previewTable.push({
          spec: v1.name,
          price: price1.toFixed(2)
        })
      })
    }
    
    this.setData({ pricePreviewTable: previewTable })
  },

  // ===== 第三步：详情与发布 =====

  // 输入商品简介
  onSummaryInput(e) {
    const { value, cursor } = e.detail
    console.log('onSummaryInput - cursor:', cursor)
    this.setData({
      'formData.summary': value,
      cursorPosition: typeof cursor === 'number' ? cursor : value.length
    })
  },

  // 监听 textarea 获得焦点
  onTextareaFocus(e) {
    const { value, cursor } = e.detail
    console.log('onTextareaFocus - cursor:', cursor)
    if (typeof cursor === 'number') {
      this.setData({
        cursorPosition: cursor,
        selectionStart: cursor,
        selectionEnd: cursor
      })
    }
  },

  // 监听 textarea 点击
  onTextareaTap(e) {
    console.log('onTextareaTap - 用户点击了文本框')
    // 延迟获取光标位置
    setTimeout(() => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#summaryTextarea').fields({
        id: true,
        dataset: true,
        rect: true,
        size: true,
        scrollOffset: true,
        properties: ['value']
      }).exec((res) => {
        console.log('textarea 查询结果:', res)
      })
    }, 100)
  },

  // 监听光标位置变化（可能不会触发）
  onSelectionChange(e) {
    const { selectionStart, selectionEnd } = e.detail
    console.log('=== 光标位置变化（bindselectionchange）===')
    console.log('selectionStart:', selectionStart)
    console.log('selectionEnd:', selectionEnd)
    
    this.setData({
      selectionStart: selectionStart,
      selectionEnd: selectionEnd,
      cursorPosition: selectionStart
    })
  },

  // 插入图片占位符
  insertImagePlaceholder(e) {
    const imageIndex = e.currentTarget.dataset.index
    const placeholder = `[图${imageIndex}]`
    const { summary } = this.data.formData
    let { cursorPosition } = this.data
    
    console.log('=== 插入图片占位符 ===')
    console.log('当前文本:', summary)
    console.log('文本长度:', summary.length)
    console.log('cursorPosition:', cursorPosition)
    
    // 确保 cursorPosition 有效
    if (typeof cursorPosition !== 'number' || cursorPosition < 0 || cursorPosition > summary.length) {
      cursorPosition = summary.length
      console.log('cursorPosition 无效，使用末尾:', cursorPosition)
    }
    
    console.log('最终插入位置:', cursorPosition)
    
    // 在光标位置插入占位符
    const before = summary.substring(0, cursorPosition)
    const after = summary.substring(cursorPosition)
    const newSummary = before + placeholder + after
    const newCursorPosition = cursorPosition + placeholder.length
    
    console.log('before:', before)
    console.log('placeholder:', placeholder)
    console.log('after:', after)
    console.log('插入后文本:', newSummary)
    console.log('新光标位置:', newCursorPosition)
    
    // 更新内容和光标位置
    this.setData({
      'formData.summary': newSummary,
      cursorPosition: newCursorPosition
    })
    
    console.log('=== 插入完成 ===')
    
    wx.showToast({
      title: `已插入 ${placeholder}`,
      icon: 'success',
      duration: 1000
    })
    
    // 自动保存草稿
    this.saveDraft()
  },

  // 选择简介图片
  async chooseSummaryImages() {
    const currentCount = this.data.formData.summaryImages.length
    const maxCount = 3 - currentCount

    try {
      const res = await wx.chooseImage({
        count: maxCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      wx.showLoading({ title: '处理图片中...' })
      
      // 压缩所有图片
      const promises = res.tempFilePaths.map(tempPath => {
        return this.compressAndConvertImage(tempPath)
      })
      
      const results = await Promise.all(promises)
      const validImages = results.filter(result => result.success).map(result => result.image)
      
      if (validImages.length > 0) {
        const newImages = [...this.data.formData.summaryImages, ...validImages]
        this.setData({
          'formData.summaryImages': newImages
        })
        
        wx.hideLoading()
        wx.showToast({
          title: `已上传${validImages.length}张`,
          icon: 'success',
          duration: 1000
        })
        
        // 自动保存草稿
        this.saveDraft()
      } else {
        wx.hideLoading()
        wx.showToast({ title: '图片处理失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    }
  },

  // 删除简介图片
  deleteSummaryImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.formData.summaryImages.filter((_, i) => i !== index)
    
    // 检查文本中是否有对应的占位符
    const placeholder = `[图${index + 1}]`
    if (this.data.formData.summary.indexOf(placeholder) > -1) {
      wx.showModal({
        title: '提示',
        content: `文本中包含 ${placeholder}，删除图片后占位符将无法显示，是否继续？`,
        success: (res) => {
          if (res.confirm) {
            this.setData({
              'formData.summaryImages': images
            })
            // 自动保存草稿
            this.saveDraft()
          }
        }
      })
    } else {
      this.setData({
        'formData.summaryImages': images
      })
      // 自动保存草稿
      this.saveDraft()
    }
  },

  // 上架开关
  onSaleChange(e) {
    this.setData({
      'formData.isOnSale': e.detail.value
    })
  },

  // 输入最大购买数量
  onMaxBuyInput(e) {
    const value = parseInt(e.detail.value) || 0
    this.setData({
      'formData.maxBuyCount': value
    })
  },

  // 计算最终显示价格
  calculateFinalPrice() {
    const basePrice = parseFloat(this.data.formData.basePrice) || 0
    
    // ✅ 检查是否有有效的规格（规格名称和价格都不为空）
    const hasValidSpec1 = this.data.spec1Selected && 
                          this.data.spec1Values.length > 0 &&
                          this.data.spec1Values.some(v => v.name && v.name.trim() && v.addPrice)
    
    // 如果没有有效规格，直接返回基础价格
    if (!hasValidSpec1) {
      console.log('⚠️ 无有效规格，使用基础价格:', basePrice)
      return basePrice
    }
    
    // 有规格：计算所有规格组合的价格，找出最低价
    let minPrice = Infinity
    
    if (this.data.spec2Selected && this.data.spec2Values.length > 0) {
      // 两级规格：一级价格 + 二级加价
      this.data.spec1Values.forEach(v1 => {
        // ✅ 只计算有效的规格值
        if (!v1.name || !v1.name.trim() || !v1.addPrice) return
        
        this.data.spec2Values.forEach(v2 => {
          if (!v2.name || !v2.name.trim() || !v2.addPrice) return
          
          const price1 = parseFloat(v1.addPrice) || 0  // 一级规格价格
          const price2 = parseFloat(v2.addPrice) || 0  // 二级加价
          const totalPrice = price1 + price2
          if (totalPrice < minPrice) {
            minPrice = totalPrice
          }
        })
      })
    } else {
      // 只有一级规格：直接使用一级规格价格
      this.data.spec1Values.forEach(v1 => {
        // ✅ 只计算有效的规格值
        if (!v1.name || !v1.name.trim() || !v1.addPrice) return
        
        const price1 = parseFloat(v1.addPrice) || 0
        if (price1 < minPrice) {
          minPrice = price1
        }
      })
    }
    
    // 如果所有规格都无效，返回基础价格
    if (minPrice === Infinity) {
      console.log('⚠️ 规格无效，使用基础价格:', basePrice)
      return basePrice
    }
    
    console.log('✅ 计算规格最低价:', minPrice)
    return minPrice
  },

  // 🎯 验证并清洗category字段
  validateAndCleanCategory(category) {
    if (!category) return ''
    
    const categoryStr = String(category).trim()
    
    // 检测异常英文（和微信API返回的脏数据模式一致）
    const isInvalid = categoryStr.includes('cat_') || 
                      categoryStr === 'emoticon' || 
                      categoryStr === 'portrait' ||
                      /^[a-zA-Z0-9_]+$/.test(categoryStr)  // 纯英文+数字+下划线
    
    if (isInvalid) {
      console.warn('⚠️ 检测到非法分类，已清空:', categoryStr)
      return ''
    }
    
    // 验证分类是否存在于系统分类列表
    const validCategory = this.data.categories.find(c => String(c.id) === String(categoryStr))
    if (!validCategory) {
      console.warn('⚠️ 分类不存在于系统列表，已清空:', categoryStr)
      return ''
    }
    
    return categoryStr
  },

  // 提交表单
  async submitForm() {
    // 最终验证
    if (!this.validateStep()) {
      return
    }
    
    try {
      wx.showLoading({ title: this.data.isEdit ? '保存中...' : '发布中...' })

      // 计算最终显示价格
      const finalPrice = this.calculateFinalPrice()
      
      // 🎯 第1层防御：验证并清洗category字段
      const cleanedCategory = this.validateAndCleanCategory(this.data.formData.category)
      
      if (!cleanedCategory && this.data.categoryIndex < 0) {
        wx.hideLoading()
        wx.showToast({ title: '请选择商品分类', icon: 'none' })
        return
      }
      
      // 组装完整数据
      const productData = {
        ...this.data.formData,
        category: cleanedCategory,  // 🎯 使用清洗后的分类
        price: finalPrice, // 最终显示价格（最低价）
        basePrice: this.data.formData.basePrice, // 保留基础价格
        deliveryDays: this.data.deliveryDays,
        specs: []
      }

      // ✅ 保存分类名称，便于商品列表直接使用
      if (this.data.categoryIndex >= 0) {
        const currentCategory = this.data.categories[this.data.categoryIndex]
        productData.categoryName = currentCategory ? currentCategory.name : ''
      } else if (!productData.categoryName) {
        productData.categoryName = ''
      }
      
      // 添加规格数据（只保存有效的规格）
      if (this.data.spec1Selected && this.data.spec1Values.length > 0) {
        // ✅ 过滤掉无效的规格值（名称或价格为空）
        const validSpec1Values = this.data.spec1Values.filter(v => 
          v.name && v.name.trim() && v.addPrice
        )
        
        if (validSpec1Values.length > 0) {
          productData.specs.push({
            name: this.data.spec1Name,
            values: validSpec1Values
          })
          console.log('✅ 保存一级规格:', validSpec1Values.length, '个有效值')
        } else {
          console.log('⚠️ 一级规格无有效值，跳过保存')
        }
      }
      
      if (this.data.spec2Selected && this.data.spec2Values.length > 0) {
        // ✅ 过滤掉无效的规格值
        const validSpec2Values = this.data.spec2Values.filter(v => 
          v.name && v.name.trim() && v.addPrice
        )
        
        if (validSpec2Values.length > 0) {
          productData.specs.push({
            name: this.data.spec2Name,
            values: validSpec2Values
          })
          console.log('✅ 保存二级规格:', validSpec2Values.length, '个有效值')
        } else {
          console.log('⚠️ 二级规格无有效值，跳过保存')
        }
      }

      console.log('提交商品数据', productData)
      console.log('最终显示价格', finalPrice)

      // 模拟提交 - 保存到本地存储
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 获取现有商品列表
      let products = wx.getStorageSync('mock_products') || []
      
      console.log('=== 保存商品调试信息 ===')
      console.log('当前模式:', this.data.isEdit ? '编辑' : '新增')
      console.log('商品ID:', this.data.productId)
      console.log('现有商品数量:', products.length)
      console.log('现有商品ID列表:', products.map(p => p.id))
      
      if (this.data.isEdit) {
        // 编辑模式：更新现有商品
        const index = products.findIndex(p => p.id === this.data.productId)
        console.log('查找结果 index:', index)
        
        if (index > -1) {
          // 找到了，更新
          const userInfo = wx.getStorageSync('userInfo') || {}
          products[index] = {
            ...products[index],
            ...productData,
            id: this.data.productId, // 保持原ID
            artistName: userInfo.nickName || products[index].artistName || '画师',
            artistId: wx.getStorageSync('userId') || products[index].artistId || '',
            artistAvatar: userInfo.avatarUrl || products[index].artistAvatar || '/assets/default-avatar.png',
            updateTime: Date.now()
          }
          console.log('✓ 更新现有商品成功', products[index])
        } else {
          // 没找到，说明是旧数据首次保存，作为新增处理
          console.log('⚠️ 未找到商品，作为新增处理（旧数据迁移）')
          const userInfo = wx.getStorageSync('userInfo') || {}
          const newProduct = {
            id: this.data.productId, // 保持原ID（如 '1', '2'）
            ...productData,
            artistName: userInfo.nickName || '画师',
            artistId: wx.getStorageSync('userId') || '',
            artistAvatar: userInfo.avatarUrl || '/assets/default-avatar.png',
            createTime: Date.now(),
            updateTime: Date.now()
          }
          products.unshift(newProduct)
          console.log('✓ 新增商品成功（迁移旧数据）', newProduct)
        }
      } else {
        // 新增模式：添加新商品
        const userInfo = wx.getStorageSync('userInfo') || {}
        const newProduct = {
          id: `product_${Date.now()}`,
          ...productData,
          artistName: userInfo.nickName || '画师',
          artistId: wx.getStorageSync('userId') || '',
          artistAvatar: userInfo.avatarUrl || '/assets/default-avatar.png',
          createTime: Date.now(),
          updateTime: Date.now()
        }
        products.unshift(newProduct) // 添加到列表开头
        console.log('✓ 新增商品成功', newProduct)
      }
      
      // 保存到本地存储
      try {
        wx.setStorageSync('mock_products', products)
        console.log('✅ 商品列表已保存', products)
        
        // 只有保存成功后才清除草稿
        wx.removeStorageSync('product_draft')
        console.log('✅ 草稿已清除')
        
      } catch (storageError) {
        // 存储失败（微信小程序localStorage有10MB总限制）
        wx.hideLoading()
        console.error('❌ 存储失败:', storageError)
        
        // 尝试清理旧草稿释放空间
        try {
          wx.removeStorageSync('product_draft')
          console.log('✅ 已清理旧草稿')
        } catch (e) {
          console.error('清理草稿失败', e)
        }
        
        // 提示用户
        wx.showModal({
          title: '存储空间不足',
          content: '微信小程序存储空间已满（10MB限制）。\n\n建议：\n1. 减少商品图片数量\n2. 降低图片质量\n3. 删除部分旧商品\n\n提示：接入后端后将不受此限制。',
          showCancel: false
        })
        return // 提前返回，不执行后续操作
      }

      wx.hideLoading()
      
      // 成功提示
      wx.showToast({
        title: this.data.isEdit ? '保存成功' : '发布成功',
        icon: 'success',
        duration: 1500
      })
      
      // 延迟后返回
      setTimeout(() => {
        // 获取页面栈
        const pages = getCurrentPages()
        console.log('=== 返回逻辑调试信息 ===')
        console.log('页面栈长度:', pages.length)
        console.log('页面栈:', pages.map(p => p.route))
        
        if (pages.length > 1) {
          // 有上一页，直接返回
          const prevPage = pages[pages.length - 2]
          console.log('上一页路由:', prevPage.route)
          console.log('上一页是否有 onShow:', typeof prevPage.onShow === 'function')
          console.log('上一页是否有 loadProducts:', typeof prevPage.loadProducts === 'function')
          
          wx.navigateBack({
            delta: 1,
            success: () => {
              console.log('✓ 返回上一页成功')
              
              // 尝试刷新上一页数据
              if (prevPage) {
                console.log('尝试刷新上一页数据...')
                
                // 如果是商品管理页，调用 loadProducts
                if (typeof prevPage.loadProducts === 'function') {
                  console.log('调用 loadProducts()')
                  prevPage.loadProducts()
                }
                
                // 如果有 onShow，也调用一次
                if (typeof prevPage.onShow === 'function') {
                  console.log('调用 onShow()')
                  prevPage.onShow()
                }
              }
            },
            fail: (err) => {
              console.error('❌ 返回失败', err)
            }
          })
        } else {
          // 没有上一页，跳转到首页
          console.log('没有上一页，跳转首页')
          wx.switchTab({
            url: '/pages/home/index'
          })
        }
      }, 1500)

    } catch (error) {
      wx.hideLoading()
      console.error('提交失败', error)
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      currentStep: 1,
      progress: 33,
      formData: {
        name: '',
        summary: '',
        summaryImages: [],
        basePrice: '',
        stock: 100,
        category: '',
        images: [],
        tags: [],
        isOnSale: true,
        maxBuyCount: 0
      },
      categoryIndex: -1,
      categoryName: '请选择分类',
      deliveryDays: 7,
      spec1Selected: false,
      spec1Name: '',
      spec1Values: [],
      spec2Selected: false,
      spec2Name: '',
      spec2Values: [],
      pricePreviewTable: []
    })
  }
})
