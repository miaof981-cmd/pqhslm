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
    
    // 库存管理
    enableStockLimit: false, // 默认自动补货模式
    
    // 富文本编辑器（使用 selection 来准确追踪光标）
    selectionStart: -1, // 选区开始位置
    selectionEnd: -1, // 选区结束位置
    cursorPosition: 0 // 当前光标位置（用于插入）
    
    // 第一步：基础信息
    categories: [
      { id: 'portrait', name: '头像设计' },
      { id: 'illustration', name: '插画设计' },
      { id: 'logo', name: 'LOGO设计' },
      { id: 'poster', name: '海报设计' },
      { id: 'emoticon', name: '表情包' },
      { id: 'ui', name: 'UI设计' },
      { id: 'animation', name: '动画设计' },
      { id: 'banner', name: '横幅设计' }
    ],
    categoryIndex: -1,
    categoryName: '请选择分类',
    deliveryOptions: [3, 5, 7, 10, 15, 30],
    deliveryIndex: 0,
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
      
      // 找到出稿天数索引
      const deliveryIndex = this.data.deliveryOptions.findIndex(d => d === product.deliveryDays)
      
      // 恢复表单数据
      this.setData({
        formData: {
          name: product.name || '',
          summary: product.summary || '',
          summaryImages: product.summaryImages || [],
          basePrice: product.basePrice || '',
          stock: product.stock || 0,
          category: product.category || '',
          images: product.images || [],
          tags: product.tags || [],
          isOnSale: product.isOnSale !== false,
          maxBuyCount: product.maxBuyCount || 0
        },
        categoryIndex: categoryIndex >= 0 ? categoryIndex : -1,
        categoryName,
        deliveryIndex: deliveryIndex >= 0 ? deliveryIndex : 0,
        enableStockLimit: product.stock > 0
      })
      
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
    const { currentStep, formData, categoryIndex, deliveryIndex } = this.data
    
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
      if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
        wx.showToast({ title: '请输入基础价格', icon: 'none' })
        return false
      }
    }
    
    return true
  },

  // 保存草稿
  saveDraft() {
    const draftData = {
      currentStep: this.data.currentStep,
      progress: this.data.progress,
      formData: JSON.parse(JSON.stringify(this.data.formData)), // 深拷贝
      categoryIndex: this.data.categoryIndex,
      categoryName: this.data.categoryName,
      deliveryIndex: this.data.deliveryIndex,
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
    
    try {
      wx.setStorageSync('product_draft', draftData)
      console.log('草稿已保存', draftData)
      
      // 显示保存提示
      this.setData({ draftSaved: true })
      setTimeout(() => {
        this.setData({ draftSaved: false })
      }, 2000)
    } catch (error) {
      console.error('保存草稿失败', error)
    }
  },

  // 加载草稿
  loadDraft() {
    if (this.data.isEdit) return // 编辑模式不恢复草稿
    
    try {
      const draft = wx.getStorageSync('product_draft')
      if (draft && draft.timestamp) {
        // 草稿有效期：24小时
        const isValid = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000
        if (isValid) {
          wx.showModal({
            title: '发现未完成的草稿',
            content: '是否继续编辑？',
            success: (res) => {
              if (res.confirm) {
                console.log('恢复草稿', draft)
                this.setData({
                  currentStep: draft.currentStep || 1,
                  progress: draft.progress || 33,
                  formData: draft.formData || this.data.formData,
                  categoryIndex: draft.categoryIndex >= 0 ? draft.categoryIndex : -1,
                  categoryName: draft.categoryName || '请选择分类',
                  deliveryIndex: draft.deliveryIndex || 0,
                  enableStockLimit: draft.enableStockLimit || false,
                  spec1Selected: draft.spec1Selected || false,
                  spec1Name: draft.spec1Name || '',
                  spec1Values: draft.spec1Values || [],
                  spec2Selected: draft.spec2Selected || false,
                  spec2Name: draft.spec2Name || '',
                  spec2Values: draft.spec2Values || [],
                  pricePreviewTable: draft.pricePreviewTable || []
                })
              } else {
                // 用户选择不恢复，清除草稿
                wx.removeStorageSync('product_draft')
              }
            }
          })
        } else {
          // 草稿过期，清除
          wx.removeStorageSync('product_draft')
        }
      }
    } catch (error) {
      console.error('加载草稿失败', error)
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

      wx.showLoading({ title: '上传中...' })
      
      // 模拟上传到云存储
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      this.setData({
        'formData.images': [...this.data.formData.images, ...res.tempFilePaths]
      })

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })

    } catch (error) {
      wx.hideLoading()
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // 删除主图
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.formData.images]
    images.splice(index, 1)
    this.setData({
      'formData.images': images
    })
  },

  // 选择分类
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    if (index >= 0 && index < this.data.categories.length) {
      const category = this.data.categories[index]
      this.setData({
        'formData.category': category.id,
        categoryIndex: index,
        categoryName: category.name
      })
    }
  },

  // 选择出稿天数
  onDeliveryOptionChange(e) {
    this.setData({
      deliveryIndex: parseInt(e.detail.value)
    })
  },

  // 切换标签
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const tags = [...this.data.formData.tags]
    const index = tags.indexOf(tag)
    
    if (index > -1) {
      tags.splice(index, 1)
    } else {
      if (tags.length < 3) {
        tags.push(tag)
      } else {
        wx.showToast({ title: '最多选择3个标签', icon: 'none' })
        return
      }
    }
    
    this.setData({
      'formData.tags': tags
    })
  },

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
  addFirstSpec() {
    this.setData({
      spec1Selected: true,
      spec1Name: '',
      spec1Values: [{ name: '', addPrice: '0', image: '' }]
    })
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

      wx.showLoading({ title: '上传中...' })
      
      // 模拟上传到云存储
      // TODO: 后端需要实现图片上传接口，返回图片URL
      // const uploadRes = await wx.cloud.uploadFile({
      //   cloudPath: `spec-images/${Date.now()}-${Math.random()}.jpg`,
      //   filePath: res.tempFilePaths[0]
      // })
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const spec1Values = [...this.data.spec1Values]
      spec1Values[index].image = res.tempFilePaths[0] // TODO: 替换为上传后的URL
      this.setData({ spec1Values })

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
      
      // 保存草稿
      this.saveDraft()

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
    if (this.data.spec1Values.length <= 1) {
      wx.showToast({ title: '至少保留一个选项', icon: 'none' })
      return
    }
    const spec1Values = [...this.data.spec1Values]
    spec1Values.splice(index, 1)
    this.setData({ spec1Values })
    this.updatePricePreview()
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

      wx.showLoading({ title: '上传中...' })
      
      // 模拟上传到云存储
      // TODO: 后端需要实现图片上传接口，返回图片URL
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const spec2Values = [...this.data.spec2Values]
      spec2Values[index].image = res.tempFilePaths[0] // TODO: 替换为上传后的URL
      this.setData({ spec2Values })

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
      
      // 保存草稿
      this.saveDraft()

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
    if (this.data.spec2Values.length <= 1) {
      wx.showToast({ title: '至少保留一个选项', icon: 'none' })
      return
    }
    const spec2Values = [...this.data.spec2Values]
    spec2Values.splice(index, 1)
    this.setData({ spec2Values })
    this.updatePricePreview()
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
    this.setData({
      'formData.summary': e.detail.value
    })
  },

  // 监听光标位置变化（核心方法）
  onSelectionChange(e) {
    const { selectionStart, selectionEnd } = e.detail
    console.log('=== 光标位置变化 ===')
    console.log('selectionStart:', selectionStart)
    console.log('selectionEnd:', selectionEnd)
    
    this.setData({
      selectionStart: selectionStart,
      selectionEnd: selectionEnd,
      cursorPosition: selectionStart // 使用选区开始位置作为插入位置
    })
  },

  // 插入图片占位符
  insertImagePlaceholder(e) {
    const imageIndex = e.currentTarget.dataset.index
    const placeholder = `[图${imageIndex}]`
    const { summary } = this.data.formData
    let { cursorPosition, selectionStart, selectionEnd } = this.data
    
    console.log('=== 插入图片占位符 ===')
    console.log('当前文本:', summary)
    console.log('文本长度:', summary.length)
    console.log('cursorPosition:', cursorPosition)
    console.log('selectionStart:', selectionStart)
    console.log('selectionEnd:', selectionEnd)
    
    // 优先使用 selectionStart（更准确）
    let insertPosition = cursorPosition
    if (selectionStart >= 0 && selectionStart <= summary.length) {
      insertPosition = selectionStart
      console.log('使用 selectionStart:', insertPosition)
    } else {
      console.log('selectionStart 无效，使用 cursorPosition:', insertPosition)
    }
    
    // 确保插入位置有效
    if (typeof insertPosition !== 'number' || insertPosition < 0 || insertPosition > summary.length) {
      insertPosition = summary.length // 默认插入到末尾
      console.log('插入位置无效，使用末尾:', insertPosition)
    }
    
    // 如果有选中文字，替换选中内容
    let before, after
    if (selectionStart >= 0 && selectionEnd > selectionStart) {
      console.log('检测到选中文字，将替换选中内容')
      before = summary.substring(0, selectionStart)
      after = summary.substring(selectionEnd)
      insertPosition = selectionStart
    } else {
      // 没有选中，在光标位置插入
      before = summary.substring(0, insertPosition)
      after = summary.substring(insertPosition)
    }
    
    const newSummary = before + placeholder + after
    const newCursorPosition = insertPosition + placeholder.length
    
    console.log('before:', before)
    console.log('placeholder:', placeholder)
    console.log('after:', after)
    console.log('插入后文本:', newSummary)
    console.log('新光标位置:', newCursorPosition)
    
    // 更新内容和光标位置
    this.setData({
      'formData.summary': newSummary,
      cursorPosition: newCursorPosition,
      selectionStart: newCursorPosition,
      selectionEnd: newCursorPosition
    })
    
    wx.showToast({
      title: `已插入 ${placeholder}`,
      icon: 'success',
      duration: 1000
    })
    
    // 自动保存草稿
    this.saveDraft()
  },

  // 选择简介图片
  chooseSummaryImages() {
    const currentCount = this.data.formData.summaryImages.length
    const maxCount = 3 - currentCount

    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = [...this.data.formData.summaryImages, ...res.tempFilePaths]
        this.setData({
          'formData.summaryImages': newImages
        })
        
        wx.showToast({
          title: `已上传图${newImages.length}`,
          icon: 'success',
          duration: 1000
        })
        
        // 自动保存草稿
        this.saveDraft()
      }
    })
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
    
    // 如果没有规格，直接返回基础价格
    if (!this.data.spec1Selected || this.data.spec1Values.length === 0) {
      return basePrice
    }
    
    // 有规格：计算所有规格组合的价格，找出最低价
    let minPrice = Infinity
    
    if (this.data.spec2Selected && this.data.spec2Values.length > 0) {
      // 两级规格：一级价格 + 二级加价
      this.data.spec1Values.forEach(v1 => {
        this.data.spec2Values.forEach(v2 => {
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
        const price1 = parseFloat(v1.addPrice) || 0
        if (price1 < minPrice) {
          minPrice = price1
        }
      })
    }
    
    return minPrice === Infinity ? basePrice : minPrice
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
      
      // 组装完整数据
      const productData = {
        ...this.data.formData,
        price: finalPrice, // 最终显示价格（最低价）
        basePrice: this.data.formData.basePrice, // 保留基础价格
        deliveryDays: this.data.deliveryOptions[this.data.deliveryIndex],
        specs: []
      }
      
      // 添加规格数据
      if (this.data.spec1Selected && this.data.spec1Values.length > 0) {
        productData.specs.push({
          name: this.data.spec1Name,
          values: this.data.spec1Values
        })
      }
      if (this.data.spec2Selected && this.data.spec2Values.length > 0) {
        productData.specs.push({
          name: this.data.spec2Name,
          values: this.data.spec2Values
        })
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
          products[index] = {
            ...products[index],
            ...productData,
            id: this.data.productId, // 保持原ID
            updateTime: Date.now()
          }
          console.log('✓ 更新现有商品成功', products[index])
        } else {
          // 没找到，说明是旧数据首次保存，作为新增处理
          console.log('⚠️ 未找到商品，作为新增处理（旧数据迁移）')
          const newProduct = {
            id: this.data.productId, // 保持原ID（如 '1', '2'）
            ...productData,
            createTime: Date.now(),
            updateTime: Date.now()
          }
          products.unshift(newProduct)
          console.log('✓ 新增商品成功（迁移旧数据）', newProduct)
        }
      } else {
        // 新增模式：添加新商品
        const newProduct = {
          id: `product_${Date.now()}`,
          ...productData,
          createTime: Date.now(),
          updateTime: Date.now()
        }
        products.unshift(newProduct) // 添加到列表开头
        console.log('✓ 新增商品成功', newProduct)
      }
      
      // 保存到本地存储
      wx.setStorageSync('mock_products', products)
      console.log('商品列表已保存', products)

      wx.hideLoading()
      
      // 清除草稿
      wx.removeStorageSync('product_draft')
      
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
      deliveryIndex: 0,
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
