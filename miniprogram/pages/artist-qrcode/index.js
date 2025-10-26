Page({
  data: {
    isSubmitted: false, // 是否已提交
    hasArtistPermission: false, // 是否已有画师权限
    applicationApproved: false, // 申请是否已通过（但权限未开启）
    
    // 工作人员二维码
    staffQRCode: '',
    
    // 个人信息
    realName: '',
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
    this.checkApplicationStatus() // 先检查申请状态
    this.checkArtistPermission()
    this.loadStaffQRCode()
    this.checkExistingProfile()
  },

  // 检查申请状态
  checkApplicationStatus() {
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    
    // 读取所有申请记录
    const allApplications = wx.getStorageSync('artist_applications') || []
    const userApplications = allApplications.filter(app => app.userId === userId)
    
    if (userApplications.length > 0) {
      // 按时间排序，取最新的
      userApplications.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
      const latestApp = userApplications[0]
      
      console.log('📋 [artist-qrcode] 申请状态检查:')
      console.log('  - 最新申请状态:', latestApp.status)
      
      // 如果申请已通过，标记为已通过
      if (latestApp.status === 'approved') {
        this.setData({
          applicationApproved: true
        })
        console.log('  ✅ 申请已通过，等待权限开启')
      }
    }
  },

  // 检查是否有画师权限
  checkArtistPermission() {
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    let roles = wx.getStorageSync('userRoles') || ['customer']
    
    console.log('🔍 [artist-qrcode] 权限检查详情:')
    console.log('  - 当前用户ID:', userId)
    console.log('  - 当前角色列表:', roles)
    
    // ⭐ 检查申请记录，如果管理员已授权，自动添加 artist 角色
    const applications = wx.getStorageSync('artist_applications') || []
    const userApp = applications.find(app => app.userId == userId && app.status === 'approved' && app.permissionGranted)
    
    if (userApp && !roles.includes('artist')) {
      console.log('✅ 检测到管理员已授权，自动添加 artist 权限')
      console.log('  - 画师编号:', userApp.artistNumber)
      console.log('  - 授权时间:', userApp.permissionGrantedTime)
      
      roles.push('artist')
      wx.setStorageSync('userRoles', roles)
      app.globalData.roles = roles
      
      console.log('  - 更新后的roles:', roles)
    }
    
    const hasArtistPermission = roles.includes('artist')
    
    console.log('  - 是否包含artist:', hasArtistPermission)
    console.log('  - 本地存储userRoles:', wx.getStorageSync('userRoles'))
    console.log('  - app.globalData.roles:', app.globalData.roles)
    
    this.setData({
      hasArtistPermission: hasArtistPermission
    })
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
        contactPhone: profile.contactPhone,
        contactWechat: profile.contactWechat,
        createTime: profile.createTime
      })
    }
  },

  // ========== 个人信息输入 ==========
  
  onRealNameInput(e) {
    this.setData({
      realName: e.detail.value
    })
  },

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
    const { realName, contactPhone, verifyCode, contactWechat, emergencyName, emergencyRelation, emergencyPhone } = this.data
    
    // 验证个人信息
    if (!realName || realName.length < 2) {
      wx.showToast({
        title: '请输入真实姓名',
        icon: 'none'
      })
      return
    }
    
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
    
    // 验证码校验
    // TODO: 接入真实短信验证接口
    // 开发阶段：任何6位数字都通过
    // 生产阶段：需要调用后端接口验证
    
    const isDev = true // 开发模式开关，上线时改为 false
    
    if (isDev) {
      // 开发模式：任何6位数字都通过
      console.log('📱 [开发模式] 验证码校验通过:', verifyCode)
    } else {
      // 生产模式：调用后端验证
      // TODO: 调用云函数或后端API验证验证码
      // const result = await wx.cloud.callFunction({
      //   name: 'verifyCode',
      //   data: { phone: contactPhone, code: verifyCode }
      // })
      // if (!result.success) {
      //   wx.showToast({ title: '验证码错误', icon: 'none' })
      //   return
      // }
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
      realName: this.data.realName,
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
      realName: this.data.realName,
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
    console.log('  - 真实姓名:', this.data.realName)
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
        icon: 'success',
        duration: 2000
      })
      
      // 滚动到顶部
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      })
      
      // ⭐ 3秒后自动跳转到工作台
      setTimeout(() => {
        console.log('📍 档案建立完成，3秒后跳转到工作台')
        wx.redirectTo({
          url: '/pages/workspace/index',
          success: () => {
            console.log('✅ 跳转成功')
          },
          fail: (err) => {
            console.error('❌ 跳转失败:', err)
            // 如果跳转失败，尝试用 navigateTo
            wx.navigateTo({
              url: '/pages/workspace/index'
            })
          }
        })
      }, 3000)
    }, 1000)
  },

  // 进入工作台
  goToWorkspace() {
    console.log('🚀 [artist-qrcode] 点击了"进入工作台"按钮')
    console.log('  - 当前用户ID:', wx.getStorageSync('userId'))
    console.log('  - 当前角色:', wx.getStorageSync('userRoles'))
    console.log('  - 准备跳转到 /pages/workspace/index')
    
    wx.redirectTo({
      url: '/pages/workspace/index',
      success: () => {
        console.log('✅ 跳转成功')
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err)
        // 如果 redirectTo 失败，尝试 navigateTo
        wx.navigateTo({
          url: '/pages/workspace/index',
          success: () => {
            console.log('✅ navigateTo 跳转成功')
          },
          fail: (err2) => {
            console.error('❌ navigateTo 也失败了:', err2)
          }
        })
      }
    })
  }
})
