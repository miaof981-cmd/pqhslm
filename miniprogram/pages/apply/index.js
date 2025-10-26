Page({
  data: {
    formData: {
      name: '',           // 真实姓名
      age: '',            // 真实年龄
      wechat: '',         // 联系微信
      idealPrice: '',     // 理想稿酬
      minPrice: '',       // 最低可接受价格
      finishedWorks: [],  // 满意的作品
      processImages: []   // 绘画过程
    },
    agreedToTerms: false,     // 是否同意条款
    showTermsDetail: false,   // 是否显示详细条款
    uploading: false,
    // ✅ 新增：申请状态
    applicationStatus: null,  // null: 无申请, 'pending': 待审核, 'rejected': 已驳回
    applicationTime: '',
    rejectTime: '',
    rejectReason: ''
  },

  onLoad() {
    // ✅ 加载申请状态
    this.loadApplicationStatus()
  },

  // ✅ 加载申请状态
  loadApplicationStatus() {
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    
    // 从本地存储读取申请记录
    const applications = wx.getStorageSync('artist_applications') || []
    
    // 查找当前用户的最新申请
    const userApplications = applications.filter(app => app.userId === userId)
    
    if (userApplications.length > 0) {
      // 按时间排序，取最新的
      userApplications.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
      const latestApp = userApplications[0]
      
      // 如果已通过，不显示状态
      if (latestApp.status === 'approved') {
        return
      }
      
      console.log('📋 加载到申请状态:', latestApp.status)
      
      this.setData({
        applicationStatus: latestApp.status,
        applicationTime: latestApp.submitTime,
        rejectTime: latestApp.rejectTime || '',
        rejectReason: latestApp.rejectReason || ''
      })
    }
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  // 输入年龄
  onAgeInput(e) {
    this.setData({
      'formData.age': e.detail.value
    })
  },

  // 输入微信
  onWechatInput(e) {
    this.setData({
      'formData.wechat': e.detail.value
    })
  },

  // 输入理想稿酬
  onIdealPriceInput(e) {
    this.setData({
      'formData.idealPrice': e.detail.value
    })
  },

  // 输入最低价格
  onMinPriceInput(e) {
    this.setData({
      'formData.minPrice': e.detail.value
    })
  },

  // 切换同意条款
  toggleAgreement() {
    this.setData({
      agreedToTerms: !this.data.agreedToTerms
    })
  },

  // 切换详细条款显示
  toggleTermsDetail() {
    this.setData({
      showTermsDetail: !this.data.showTermsDetail
    })
  },

  // 选择图片
  async chooseImages(e) {
    const { type } = e.currentTarget.dataset
    const currentImages = this.data.formData[type]
    
    try {
      const res = await wx.chooseImage({
        count: 9 - currentImages.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '上传中...' })
      
      // 暂时使用本地图片路径
      this.setData({
        [`formData.${type}`]: [...currentImages, ...res.tempFilePaths]
      })

      wx.hideLoading()
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })

    } catch (error) {
      wx.hideLoading()
      if (error.errMsg !== 'chooseImage:fail cancel') {
        console.error('上传失败', error)
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    }
  },

  // 删除图片
  deleteImage(e) {
    const { type, index } = e.currentTarget.dataset
    const images = this.data.formData[type]
    images.splice(index, 1)
    this.setData({
      [`formData.${type}`]: images
    })
  },

  // 表单验证
  validateForm() {
    const { name, age, wechat, idealPrice, minPrice, finishedWorks, processImages } = this.data.formData
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入真实姓名',
        icon: 'none'
      })
      return false
    }

    if (!age || age < 16 || age > 100) {
      wx.showToast({
        title: '请输入有效的年龄（16-100岁）',
        icon: 'none'
      })
      return false
    }

    if (!wechat.trim()) {
      wx.showToast({
        title: '请输入联系微信',
        icon: 'none'
      })
      return false
    }

    if (!idealPrice || idealPrice <= 0) {
      wx.showToast({
        title: '请输入理想稿酬',
        icon: 'none'
      })
      return false
    }

    if (!minPrice || minPrice <= 0) {
      wx.showToast({
        title: '请输入最低可接受价格',
        icon: 'none'
      })
      return false
    }

    if (parseFloat(minPrice) > parseFloat(idealPrice)) {
      wx.showToast({
        title: '最低价格不能高于理想稿酬',
        icon: 'none'
      })
      return false
    }

    if (finishedWorks.length < 4) {
      wx.showToast({
        title: '请至少上传4张满意的作品',
        icon: 'none'
      })
      return false
    }

    if (finishedWorks.length > 9) {
      wx.showToast({
        title: '满意的作品最多上传9张',
        icon: 'none'
      })
      return false
    }

    if (processImages.length === 0) {
      wx.showToast({
        title: '请至少上传1张图层截图',
        icon: 'none'
      })
      return false
    }

    if (processImages.length > 9) {
      wx.showToast({
        title: '图层截图最多上传9张',
        icon: 'none'
      })
      return false
    }

    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先阅读并同意会员制条款',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 提交申请
  async submitApplication() {
    if (!this.validateForm()) {
      return
    }

    const app = getApp()
    
    // 获取用户信息（应该在启动时已授权）
    let userInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo
    
    if (!userInfo) {
      // 如果还没有授权，提示并请求
      wx.showToast({
        title: '正在获取授权...',
        icon: 'loading',
        duration: 500
      })
      
      try {
        userInfo = await app.getWxUserInfo()
      } catch (error) {
        wx.showToast({
          title: '需要授权才能提交',
          icon: 'none'
        })
        return
      }
    }
    
    // 直接提交
    this.doSubmitApplication(userInfo)
  },

  // 执行提交申请
  doSubmitApplication(userInfo) {
    wx.showLoading({ title: '提交中...' })

    const app = getApp()
    const userId = wx.getStorageSync('userId') || app.globalData.userId || 1001
    const openid = wx.getStorageSync('openid') || app.globalData.openid || 'mock_openid_' + userId

    // 创建申请记录
    const application = {
      id: 'app_' + Date.now(),
      userId: userId,
      openid: openid,
      // 微信信息
      avatarUrl: userInfo.avatarUrl,
      nickName: userInfo.nickName,
      // 申请表单信息
      name: this.data.formData.name,
      age: this.data.formData.age,
      wechat: this.data.formData.wechat,
      idealPrice: this.data.formData.idealPrice,
      minPrice: this.data.formData.minPrice,
      finishedWorks: this.data.formData.finishedWorks,
      processImages: this.data.formData.processImages,
      status: 'pending', // pending, approved, rejected
      submitTime: new Date().toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }).replace(/\//g, '-')
    }

    // 保存到本地存储
    let applications = wx.getStorageSync('artist_applications') || []
    applications.unshift(application) // 新申请放在最前面
    wx.setStorageSync('artist_applications', applications)

    console.log('申请已保存:', application)

    setTimeout(() => {
      wx.hideLoading()
      
      wx.showModal({
        title: '申请提交成功',
        content: '您的申请已提交，我们会在1-3个工作日内审核并通过微信通知您审核结果。\n\n审核通过后，您需要缴纳会员费才能开始接单。',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          // 清空表单
          this.setData({
            formData: {
              name: '',
              age: '',
              wechat: '',
              idealPrice: '',
              minPrice: '',
              finishedWorks: [],
              processImages: []
            },
            agreedToTerms: false
          })

          // 返回上一页
          wx.navigateBack()
        }
      })
    }, 1000)
  }
})
