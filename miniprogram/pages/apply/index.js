Page({
  data: {
    formData: {
      name: '',
      phone: '',
      specialty: '',
      portfolio: []
    },
    uploading: false
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  // 输入电话
  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    })
  },

  // 输入擅长类型
  onSpecialtyInput(e) {
    this.setData({
      'formData.specialty': e.detail.value
    })
  },

  // 选择作品图片
  async chooseImages() {
    try {
      const res = await wx.chooseImage({
        count: 9 - this.data.formData.portfolio.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '上传中...' })
      
      // 暂时使用本地图片路径
      this.setData({
        'formData.portfolio': [...this.data.formData.portfolio, ...res.tempFilePaths]
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
    const portfolio = this.data.formData.portfolio
    portfolio.splice(index, 1)
    this.setData({
      'formData.portfolio': portfolio
    })
  },

  // 提交申请
  async submitApplication() {
    const { name, phone, specialty, portfolio } = this.data.formData
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    if (!phone.trim()) {
      wx.showToast({
        title: '请输入联系方式',
        icon: 'none'
      })
      return
    }

    if (portfolio.length === 0) {
      wx.showToast({
        title: '请上传作品图片',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '提交中...' })

      // 暂时使用模拟提交
      setTimeout(() => {
        wx.hideLoading()
        wx.showToast({
          title: '申请提交成功',
          icon: 'success'
        })

        // 清空表单
        this.setData({
          formData: {
            name: '',
            phone: '',
            specialty: '',
            portfolio: []
          }
        })
      }, 1000)

    } catch (error) {
      wx.hideLoading()
      console.error('提交申请失败', error)
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  }
})