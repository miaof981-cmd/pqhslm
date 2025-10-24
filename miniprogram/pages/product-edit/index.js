Page({
  data: {
    loading: false,
    productId: '',
    isEdit: false,
    formData: {
      name: '',
      summary: '',
      summaryImages: [],
      price: '',
      stock: 0,
      deliveryDays: 3,
      category: '',
      images: [],
      specs: [],
      tags: [],
      detail: '',
      isOnSale: true,
      maxBuyCount: 0
    },
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
    tagOptions: ['热销', '推荐', '特价', '精品', '原创', '限量', '包修改', '专业', '创意', '高质量', '现代', '可爱', '实用'],
    uploading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        productId: options.id,
        isEdit: true
      })
      this.loadProduct()
    }
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
        price: '88.00',
        stock: 100,
        deliveryDays: 3,
        category: 'portrait',
        images: [
          'https://via.placeholder.com/400x400.png?text=商品图1',
          'https://via.placeholder.com/400x400.png?text=商品图2'
        ],
        detailImages: [
          'https://via.placeholder.com/750x500.png?text=详情图1'
        ],
        specs: [
          { name: '尺寸', values: ['小', '中', '大'] }
        ],
        tags: ['热销', '精品'],
        detail: '这是一款精美的头像设计服务，由专业画师手绘完成。\n\n包含：\n1. 多种风格选择\n2. 无限次修改\n3. 源文件交付',
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

  // 输入商品名称
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  // 输入商品简介
  onSummaryInput(e) {
    this.setData({
      'formData.summary': e.detail.value
    })
  },

  // 输入价格
  onPriceInput(e) {
    let value = e.detail.value
    // 只允许输入数字和小数点
    value = value.replace(/[^\d.]/g, '')
    // 只保留两位小数
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts[1]
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    this.setData({
      'formData.price': value
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
    const stock = Math.max(0, this.data.formData.stock - 1)
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

  // 选择出稿天数
  onDeliveryChange(e) {
    this.setData({
      'formData.deliveryDays': parseInt(e.detail.value)
    })
  },

  // 选择分类
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    const category = this.data.categories[index]
    this.setData({
      'formData.category': category.id,
      categoryIndex: index,
      categoryName: category.name
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

  // 选择详情图
  async chooseDetailImages() {
    try {
      const res = await wx.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '上传中...' })
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      this.setData({
        'formData.detailImages': [...this.data.formData.detailImages, ...res.tempFilePaths]
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

  // 删除详情图
  deleteDetailImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.formData.detailImages]
    images.splice(index, 1)
    this.setData({
      'formData.detailImages': images
    })
  },

  // 添加规格
  addSpec() {
    const specs = [...this.data.formData.specs]
    specs.push({ 
      name: '', 
      multiple: false,
      values: [{ name: '', addPrice: '' }] 
    })
    this.setData({
      'formData.specs': specs
    })
  },

  // 删除规格
  deleteSpec(e) {
    const index = e.currentTarget.dataset.index
    const specs = [...this.data.formData.specs]
    specs.splice(index, 1)
    this.setData({
      'formData.specs': specs
    })
  },

  // 输入规格名称
  onSpecNameInput(e) {
    const index = e.currentTarget.dataset.index
    const value = e.detail.value
    const specs = [...this.data.formData.specs]
    specs[index].name = value
    this.setData({
      'formData.specs': specs
    })
  },

  // 输入规格值
  onSpecValueInput(e) {
    const { index, vindex } = e.currentTarget.dataset
    const value = e.detail.value
    const specs = [...this.data.formData.specs]
    specs[index].values[vindex].name = value
    this.setData({
      'formData.specs': specs
    })
  },

  // 添加规格值
  addSpecValue(e) {
    const index = e.currentTarget.dataset.index
    const specs = [...this.data.formData.specs]
    specs[index].values.push({ name: '', addPrice: '' })
    this.setData({
      'formData.specs': specs
    })
  },

  // 删除规格值
  deleteSpecValue(e) {
    const { index, vindex } = e.currentTarget.dataset
    const specs = [...this.data.formData.specs]
    if (specs[index].values.length > 1) {
      specs[index].values.splice(vindex, 1)
      this.setData({
        'formData.specs': specs
      })
    } else {
      wx.showToast({ title: '至少保留一个规格值', icon: 'none' })
    }
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

  // 输入商品详情
  onDetailInput(e) {
    this.setData({
      'formData.detail': e.detail.value
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

  // 取消
  cancel() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消编辑吗？未保存的内容将丢失',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  // 提交表单
  async submitForm() {
    const { name, price, category, images } = this.data.formData
    
    // 验证必填项
    if (!name.trim()) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }

    if (name.trim().length < 2) {
      wx.showToast({ title: '商品名称至少2个字', icon: 'none' })
      return
    }

    if (!category) {
      wx.showToast({ title: '请选择商品分类', icon: 'none' })
      return
    }

    if (!price || parseFloat(price) <= 0) {
      wx.showToast({ title: '请输入正确的价格', icon: 'none' })
      return
    }

    if (images.length === 0) {
      wx.showToast({ title: '请上传商品图片', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: this.data.isEdit ? '保存中...' : '发布中...' })

      // 模拟提交
      await new Promise(resolve => setTimeout(resolve, 1000))

      wx.hideLoading()
      wx.showToast({
        title: this.data.isEdit ? '保存成功' : '发布成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      wx.hideLoading()
      console.error('提交失败', error)
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
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

  // 规格多选开关
  onSpecMultipleChange(e) {
    const index = e.currentTarget.dataset.index
    const multiple = e.detail.value
    this.setData({
      [`formData.specs[${index}].multiple`]: multiple
    })
  },

  // 规格加价输入
  onSpecPriceInput(e) {
    const { index, vindex } = e.currentTarget.dataset
    const addPrice = e.detail.value
    this.setData({
      [`formData.specs[${index}].values[${vindex}].addPrice`]: addPrice
    })
  }
})
