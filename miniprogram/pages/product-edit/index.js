Page({
  data: {
    productId: '',
    isEdit: false,
    formData: {
      name: '',
      price: '',
      deliveryDays: 3,
      category: 'portrait',
      images: [],
      tags: []
    },
    categories: [
      { id: 'portrait', name: '头像' },
      { id: 'illustration', name: '插画' },
      { id: 'logo', name: 'LOGO' },
      { id: 'poster', name: '海报' },
      { id: 'emoticon', name: '表情包' },
      { id: 'ui', name: 'UI设计' },
      { id: 'animation', name: '动画' }
    ],
    categoryIndex: 0,
    categoryName: '头像',
    tagOptions: ['热门', '精品', '原创', '限量', '包修改', '专业', '创意', '高质量', '现代', '可爱', '实用'],
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
    // 模拟加载商品数据
    this.setData({
      formData: {
        name: '精美头像设计',
        price: '88',
        deliveryDays: 3,
        category: 'portrait',
        images: ['https://via.placeholder.com/300x300.png?text=商品图1'],
        tags: ['热门', '精品']
      }
    })
  },

  // 输入商品名称
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  // 输入价格
  onPriceInput(e) {
    this.setData({
      'formData.price': e.detail.value
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

  // 选择图片
  async chooseImages() {
    try {
      const res = await wx.chooseImage({
        count: 9 - this.data.formData.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '上传中...' })
      
      // 暂时使用本地图片路径
      this.setData({
        'formData.images': [...this.data.formData.images, ...res.tempFilePaths]
      })

      wx.hideLoading()
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })

    } catch (error) {
      wx.hideLoading()
      console.error('上传失败', error)
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    }
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.formData.images
    images.splice(index, 1)
    this.setData({
      'formData.images': images
    })
  },

  // 切换标签
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const tags = this.data.formData.tags
    const index = tags.indexOf(tag)
    
    if (index > -1) {
      tags.splice(index, 1)
    } else {
      if (tags.length < 3) {
        tags.push(tag)
      } else {
        wx.showToast({
          title: '最多选择3个标签',
          icon: 'none'
        })
        return
      }
    }
    
    this.setData({
      'formData.tags': tags
    })
  },

  // 提交表单
  async submitForm() {
    const { name, price, deliveryDays, category, images, tags } = this.data.formData
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none'
      })
      return
    }

    if (!price || parseFloat(price) <= 0) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'none'
      })
      return
    }

    if (images.length === 0) {
      wx.showToast({
        title: '请上传商品图片',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: this.data.isEdit ? '保存中...' : '发布中...' })

      // 模拟提交
      setTimeout(() => {
        wx.hideLoading()
        wx.showToast({
          title: this.data.isEdit ? '保存成功' : '发布成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }, 1000)

    } catch (error) {
      wx.hideLoading()
      console.error('提交失败', error)
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  }
})
