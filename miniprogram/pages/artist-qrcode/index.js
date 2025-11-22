const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')

Page({
  data: {
    isSubmitted: false,
    hasArtistPermission: false,
    applicationApproved: false,
    
    staffQRCode: '',
    
    realName: '',
    contactPhone: '',
    contactWechat: '',
    verifyCode: '',
    canSendCode: false,
    codeButtonText: '发送验证码',
    countdown: 60,
    
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    relationOptions: ['父母', '配偶', '子女', '兄弟姐妹', '朋友', '其他'],
    relationIndex: -1,
    
    createTime: ''
  },

  onLoad() {
    this.checkApplicationStatus()
    this.checkArtistPermission()
    this.loadStaffQRCode()
    this.checkExistingProfile()
  },

  // 检查申请状态
  async checkApplicationStatus() {
    const userId = app.globalData.userId
    
    try {
      // ✅ 从云端读取申请记录
      const res = await cloudAPI.getArtistApplicationList({ userId })
      // 🛡️ 安全数组解析
      const allApplications = cloudAPI.safeArray(res)
      const userApplications = allApplications.filter(app => app.userId === userId)
      
      if (userApplications.length > 0) {
        userApplications.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
        const latestApp = userApplications[0]
        
        console.log('📋 [artist-qrcode] 申请状态检查:')
        console.log('  - 最新申请状态:', latestApp.status)
        
        if (latestApp.status === 'approved') {
          this.setData({
            applicationApproved: true
          })
          console.log('  ✅ 申请已通过，等待权限开启')
        }
      }
    } catch (err) {
      console.error('❌ 检查申请状态失败:', err)
    }
  },

  // 检查是否有画师权限
  async checkArtistPermission() {
    const userId = app.globalData.userId
    // ✅ userRoles 是UI状态，可保留
    let roles = wx.getStorageSync('userRoles') || ['customer']
    
    console.log('🔍 [artist-qrcode] 权限检查详情:')
    console.log('  - 当前用户ID:', userId)
    console.log('  - 当前角色列表:', roles)
    
    try {
      // ✅ 从云端检查申请记录
      const res = await cloudAPI.getArtistApplicationList({ userId })
      // 🛡️ 安全数组解析
      const applications = cloudAPI.safeArray(res)
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
    } catch (err) {
      console.error('❌ 检查申请记录失败:', err)
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
  async loadStaffQRCode() {
    try {
      // ✅ 从云端获取系统设置
      const res = await cloudAPI.getSystemSettings()
      const staffQRCode = res.success && res.data ? (res.data.staff_contact_qrcode || res.data.staffContactQrcode || '/assets/default-qrcode.png') : '/assets/default-qrcode.png'
      
      console.log('👔 加载工作人员联系二维码:', staffQRCode)
      
      this.setData({
        staffQRCode: staffQRCode
      })
    } catch (err) {
      console.error('❌ 加载工作人员二维码失败:', err)
      this.setData({
        staffQRCode: '/assets/default-qrcode.png'
      })
    }
  },

  // 检查是否已有档案
  async checkExistingProfile() {
    const userId = app.globalData.userId
    
    try {
      // ✅ 从云端读取画师档案
      const res = await cloudAPI.getArtistProfile(String(userId))
      
      if (res.success && res.data) {
        const profile = res.data
        this.setData({
          isSubmitted: true,
          contactPhone: profile.contactPhone || profile.contact_phone || '',
          contactWechat: profile.contactWechat || profile.contact_wechat || '',
          createTime: profile.createTime || profile.create_time || ''
        })
      }
    } catch (err) {
      console.error('❌ 加载画师档案失败:', err)
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
      
      this.startCountdown()
      
      // TODO: 实际项目中应调用云函数发送短信
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
    const isDev = true
    
    if (isDev) {
      console.log('📱 [开发模式] 验证码校验通过:', verifyCode)
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
  async saveProfile() {
    wx.showLoading({ title: '提交中...' })
    
    const userId = app.globalData.userId
    const now = new Date()
    const createTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    // 构建档案数据
    const profileData = {
      userId: String(userId),
      realName: this.data.realName,
      contactPhone: this.data.contactPhone,
      contactWechat: this.data.contactWechat,
      emergencyName: this.data.emergencyName,
      emergencyRelation: this.data.emergencyRelation,
      emergencyPhone: this.data.emergencyPhone
    }
    
    try {
      // ✅ 保存到云端
      const res = await cloudAPI.updateArtistProfile(String(userId), profileData)
      
      if (!res.success) {
        wx.hideLoading()
        wx.showToast({
          title: res.error || '保存失败',
          icon: 'none'
        })
        return
      }
      
      console.log('✅ 画师档案已保存（云端）')
      console.log('  - 用户ID:', userId)
      console.log('  - 真实姓名:', this.data.realName)
      console.log('  - 联系电话:', this.data.contactPhone)
      console.log('  - 紧急联系人:', this.data.emergencyName, '(', this.data.emergencyRelation, ')')
      
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
      
      // 3秒后自动跳转到工作台
      setTimeout(() => {
        console.log('📍 档案建立完成，3秒后跳转到工作台')
        wx.redirectTo({
          url: '/pages/workspace/index',
          success: () => {
            console.log('✅ 跳转成功')
          },
          fail: (err) => {
            console.error('❌ 跳转失败:', err)
            wx.navigateTo({
              url: '/pages/workspace/index'
            })
          }
        })
      }, 3000)
    } catch (err) {
      wx.hideLoading()
      console.error('❌ 保存画师档案失败:', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 进入工作台
  goToWorkspace() {
    const userId = app.globalData.userId
    const roles = app.globalData.roles || wx.getStorageSync('userRoles') || []
    
    console.log('🚀 [artist-qrcode] 点击了"进入工作台"按钮')
    console.log('  - 当前用户ID:', userId)
    console.log('  - 当前角色:', roles)
    console.log('  - 准备跳转到 /pages/workspace/index')
    
    wx.redirectTo({
      url: '/pages/workspace/index',
      success: () => {
        console.log('✅ 跳转成功')
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err)
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
