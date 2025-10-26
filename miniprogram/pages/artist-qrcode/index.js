Page({
  data: {
    isSubmitted: false, // 是否已提交
    
    // 工作人员二维码
    staffQRCode: '',
    
    // 个人信息
    contactPhone: '',
    contactWechat: '',
    verifyCode: '',
    canSendCode: false,
    codeButtonText: '发送验证码',
    countdown: 60,
    
    // 紧急联系人
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    relationOptions: ['父母', '配偶', '子女', '兄弟姐妹', '朋友', '其他'],
    relationIndex: -1,
    
    // 完成信息
    createTime: ''
  },

  onLoad() {
    this.loadStaffQRCode()
    this.checkExistingProfile()
  },

  // 加载工作人员二维码
  loadStaffQRCode() {
    const staffQRCode = wx.getStorageSync('staff_contact_qrcode') || '/assets/default-qrcode.png'
    
    console.log('👔 加载工作人员联系二维码:', staffQRCode)
    
    this.setData({
      staffQRCode: staffQRCode
    })
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
        isSubmitted: true,
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

  onRelationChange(e) {
    const index = e.detail.value
    this.setData({
      relationIndex: index,
      emergencyRelation: this.data.relationOptions[index]
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

  // 提交档案
  submitProfile() {
    const { contactPhone, verifyCode, contactWechat, emergencyName, emergencyRelation, emergencyPhone } = this.data
    
    // 验证个人信息
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
    
    if (!emergencyRelation) {
      wx.showToast({
        title: '请选择与紧急联系人的关系',
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
      emergencyRelation: this.data.emergencyRelation,
      emergencyPhone: this.data.emergencyPhone,
      // 时间戳
      createTime: createTime,
      updateTime: createTime
    }
    
    // 保存到画师档案
    const artistProfiles = wx.getStorageSync('artist_profiles') || {}
    artistProfiles[userId] = profile
    wx.setStorageSync('artist_profiles', artistProfiles)
    
    // 保存联系方式历史记录（用于后台查看，画师无法删除）
    const contactHistory = wx.getStorageSync('artist_contact_history') || {}
    if (!contactHistory[userId]) {
      contactHistory[userId] = []
    }
    contactHistory[userId].push({
      contactPhone: this.data.contactPhone,
      contactWechat: this.data.contactWechat,
      emergencyName: this.data.emergencyName,
      emergencyRelation: this.data.emergencyRelation,
      emergencyPhone: this.data.emergencyPhone,
      recordTime: createTime
    })
    wx.setStorageSync('artist_contact_history', contactHistory)
    
    console.log('✅ 画师档案已保存')
    console.log('  - 用户ID:', userId)
    console.log('  - 联系电话:', this.data.contactPhone)
    console.log('  - 紧急联系人:', this.data.emergencyName, '(', this.data.emergencyRelation, ')')
    console.log('  - 联系方式历史记录数:', contactHistory[userId].length)
    
    setTimeout(() => {
      wx.hideLoading()
      
      this.setData({
        isSubmitted: true,
        createTime: createTime
      })
      
      wx.showToast({
        title: '档案建立成功',
        icon: 'success'
      })
      
      // 滚动到顶部
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
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
