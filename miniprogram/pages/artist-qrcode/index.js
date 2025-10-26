Page({
  data: {
    step: 1, // 当前步骤：1-个人信息，2-工作信息，3-完成
    
    // 步骤1：个人信息
    contactPhone: '',
    contactWechat: '',
    emergencyName: '',
    emergencyPhone: '',
    verifyCode: '',
    canSendCode: false,
    codeButtonText: '发送验证码',
    countdown: 60,
    
    // 步骤2：工作信息
    qrcodeUrl: '',
    artistName: '',
    artistBio: '',
    
    // 完成信息
    createTime: ''
  },

  onLoad() {
    this.checkExistingProfile()
  },

  // 检查是否已有档案
  checkExistingProfile() {
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    
    // 从本地存储读取画师档案
    const artistProfiles = wx.getStorageSync('artist_profiles') || {}
    const profile = artistProfiles[userId]
    
    if (profile) {
      // 已有档案，直接显示完成状态
      this.setData({
        step: 3,
        artistName: profile.artistName,
        contactPhone: profile.contactPhone,
        createTime: profile.createTime
      })
    }
  },

  // ========== 步骤1：个人信息输入 ==========
  
  onPhoneInput(e) {
    const phone = e.detail.value
    this.setData({
      contactPhone: phone,
      canSendCode: this.validatePhone(phone)
    })
  },

  onCodeInput(e) {
    this.setData({
      verifyCode: e.detail.value
    })
  },

  onWechatInput(e) {
    this.setData({
      contactWechat: e.detail.value
    })
  },

  onEmergencyNameInput(e) {
    this.setData({
      emergencyName: e.detail.value
    })
  },

  onEmergencyPhoneInput(e) {
    this.setData({
      emergencyPhone: e.detail.value
    })
  },

  // 验证手机号格式
  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone)
  },

  // 发送验证码
  sendVerifyCode() {
    if (!this.data.canSendCode) return
    
    wx.showLoading({ title: '发送中...' })
    
    // 模拟发送验证码
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      })
      
      // 开始倒计时
      this.startCountdown()
      
      // 实际项目中应调用云函数发送短信
      console.log('📱 发送验证码到:', this.data.contactPhone)
    }, 500)
  },

  // 倒计时
  startCountdown() {
    this.setData({
      canSendCode: false,
      countdown: 60
    })
    
    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1
      
      if (countdown <= 0) {
        clearInterval(timer)
        this.setData({
          canSendCode: true,
          codeButtonText: '重新发送',
          countdown: 60
        })
      } else {
        this.setData({
          countdown: countdown,
          codeButtonText: `${countdown}秒后重发`
        })
      }
    }, 1000)
  },

  // 进入步骤2
  goToStep2() {
    // 验证步骤1的所有字段
    const { contactPhone, verifyCode, contactWechat, emergencyName, emergencyPhone } = this.data
    
    if (!this.validatePhone(contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }
    
    if (!verifyCode || verifyCode.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none'
      })
      return
    }
    
    // 模拟验证码校验
    if (verifyCode !== '123456') {
      wx.showToast({
        title: '验证码错误',
        icon: 'none'
      })
      return
    }
    
    if (!contactWechat || contactWechat.length < 2) {
      wx.showToast({
        title: '请输入联系微信',
        icon: 'none'
      })
      return
    }
    
    if (!emergencyName || emergencyName.length < 2) {
      wx.showToast({
        title: '请输入紧急联系人姓名',
        icon: 'none'
      })
      return
    }
    
    if (!this.validatePhone(emergencyPhone)) {
      wx.showToast({
        title: '请输入正确的紧急联系电话',
        icon: 'none'
      })
      return
    }
    
    // 验证通过，进入步骤2
    this.setData({
      step: 2
    })
    
    // 滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },

  // ========== 步骤2：工作信息设置 ==========
  
  // 选择二维码
  chooseQRCode() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        this.setData({
          qrcodeUrl: tempFilePath
        })
        
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        })
      }
    })
  },

  onArtistNameInput(e) {
    this.setData({
      artistName: e.detail.value
    })
  },

  onArtistBioInput(e) {
    this.setData({
      artistBio: e.detail.value
    })
  },

  // 返回步骤1
  backToStep1() {
    this.setData({
      step: 1
    })
    
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },

  // 提交档案
  submitProfile() {
    const { qrcodeUrl, artistName, artistBio } = this.data
    
    // 验证步骤2的字段
    if (!qrcodeUrl) {
      wx.showToast({
        title: '请上传工作二维码',
        icon: 'none'
      })
      return
    }
    
    if (!artistName || artistName.length < 2 || artistName.length > 20) {
      wx.showToast({
        title: '接单昵称为2-20字',
        icon: 'none'
      })
      return
    }
    
    if (!artistBio || artistBio.length < 10 || artistBio.length > 200) {
      wx.showToast({
        title: '接单简介为10-200字',
        icon: 'none'
      })
      return
    }
    
    // 保存档案
    this.saveProfile()
  },

  // 保存画师档案
  saveProfile() {
    wx.showLoading({ title: '提交中...' })
    
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    const now = new Date()
    const createTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    // 构建档案数据
    const profile = {
      userId: userId,
      // 个人信息
      contactPhone: this.data.contactPhone,
      contactWechat: this.data.contactWechat,
      emergencyName: this.data.emergencyName,
      emergencyPhone: this.data.emergencyPhone,
      // 工作信息
      qrcodeUrl: this.data.qrcodeUrl,
      artistName: this.data.artistName,
      artistBio: this.data.artistBio,
      // 时间戳
      createTime: createTime,
      updateTime: createTime
    }
    
    // 保存到画师档案
    const artistProfiles = wx.getStorageSync('artist_profiles') || {}
    artistProfiles[userId] = profile
    wx.setStorageSync('artist_profiles', artistProfiles)
    
    // 同时保存工作二维码到原有的存储位置
    const artistQRCodes = wx.getStorageSync('artist_qrcodes') || {}
    artistQRCodes[userId] = this.data.qrcodeUrl
    wx.setStorageSync('artist_qrcodes', artistQRCodes)
    
    // 保存联系方式历史记录（用于后台查看，画师无法删除）
    const contactHistory = wx.getStorageSync('artist_contact_history') || {}
    if (!contactHistory[userId]) {
      contactHistory[userId] = []
    }
    contactHistory[userId].push({
      contactPhone: this.data.contactPhone,
      contactWechat: this.data.contactWechat,
      emergencyName: this.data.emergencyName,
      emergencyPhone: this.data.emergencyPhone,
      recordTime: createTime
    })
    wx.setStorageSync('artist_contact_history', contactHistory)
    
    console.log('✅ 画师档案已保存')
    console.log('  - 用户ID:', userId)
    console.log('  - 接单昵称:', this.data.artistName)
    console.log('  - 联系电话:', this.data.contactPhone)
    console.log('  - 联系方式历史记录数:', contactHistory[userId].length)
    
    setTimeout(() => {
      wx.hideLoading()
      
      this.setData({
        step: 3,
        createTime: createTime
      })
      
      wx.showToast({
        title: '档案建立成功',
        icon: 'success'
      })
    }, 1000)
  },

  // 进入工作台
  goToWorkspace() {
    wx.redirectTo({
      url: '/pages/workspace/index'
    })
  }
})
