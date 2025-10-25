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
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        productId: options.id,
        isEdit: true
      })
      this.loadProduct()
    }
    
    // 尝试恢复草稿
    this.loadDraft()
  },

  // 加载商品信息
  async loadProduct() {
    this.setData({ loading: true })
    
    try {
      // 模拟加载商品数据
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockProduct = {
        name: '精美头像设计',
        summary: '专业画师手绘，风格多样，满意为止',
        summaryImages: [],
        basePrice: '88.00',
        stock: 100,
        category: 'portrait',
        images: [
          'https://via.placeholder.com/400x400.png?text=商品图1',
          'https://via.placeholder.com/400x400.png?text=商品图2'
        ],
        tags: ['热销', '精品'],
        isOnSale: true,
        maxBuyCount: 5
      }
      
      // 找到分类索引
      const categoryIndex = this.data.categories.findIndex(c => c.id === mockProduct.category)
      const categoryName = categoryIndex >= 0 ? this.data.categories[categoryIndex].name : '请选择分类'
      
      this.setData({
        formData: mockProduct,
        categoryIndex,
        categoryName
      })
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
      this.setData({
        currentStep: this.data.currentStep + 1,
        progress: (this.data.currentStep + 1) * 33.33
      })
      
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
      }
    })
  },

  // 删除简介图片
  deleteSummaryImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.formData.summaryImages.filter((_, i) => i !== index)
    this.setData({
      'formData.summaryImages': images
    })
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

      // 模拟提交
      await new Promise(resolve => setTimeout(resolve, 1000))

      wx.hideLoading()
      
      // 清除草稿
      wx.removeStorageSync('product_draft')
      
      // 成功提示
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500
      })
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack()
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
