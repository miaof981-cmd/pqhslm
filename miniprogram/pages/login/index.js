const app = getApp()

Page({
  data: {
    isLoading: false,
    avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',  // 默认头像
    nickName: ''  // 用户昵称
  },

  onLoad(options) {
    // 检查是否已经登录
    this.checkLoginStatus()
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('📷 用户选择头像:', avatarUrl)
    this.setData({
      avatarUrl: avatarUrl
    })
  },

  // 输入昵称（实时更新）
  onNicknameInput(e) {
    const nickName = e.detail.value
    console.log('✏️ 用户输入昵称:', nickName)
    this.setData({
      nickName: nickName
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn')
    
    if (userInfo && hasLoggedIn) {
      // 已登录，直接跳转到首页
      console.log('✅ 用户已登录，跳转首页')
      this.setData({ isLoading: true }) // 显示加载状态
      this.redirectToHome()
    } else {
      console.log('⚠️ 未登录，显示登录页面')
    }
  },

  // 处理登录
  async handleLogin() {
    if (this.data.isLoading) return
    
    const { avatarUrl, nickName } = this.data
    
    // 验证必填项
    if (!nickName || nickName.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }
    
    this.setData({ isLoading: true })
    
    wx.showLoading({
      title: '登录中...',
      mask: true
    })

    try {
      // 🎯 如果是临时头像，先转换为 base64
      let finalAvatarUrl = avatarUrl
      if (avatarUrl && avatarUrl.startsWith('http://tmp/')) {
        console.log('⚠️ 检测到临时头像，正在转换为 base64...')
        try {
          const fs = wx.getFileSystemManager()
          const fileData = fs.readFileSync(avatarUrl, 'base64')
          finalAvatarUrl = 'data:image/jpeg;base64,' + fileData
          console.log('✅ 临时头像转换成功')
        } catch (err) {
          console.error('❌ 临时头像转换失败:', err)
          // 转换失败，使用默认头像
          finalAvatarUrl = this.data.avatarUrl
        }
      }
      
      console.log('📱 准备登录，昵称:', nickName.trim())
      
      // ✅ 调用云函数登录
      const cloudAPI = require('../../utils/cloud-api.js')
      const loginRes = await cloudAPI.login(nickName.trim(), finalAvatarUrl)
      
      if (!loginRes.success) {
        throw new Error(loginRes.message || '登录失败')
      }
      
      console.log('✅ 云函数登录成功:', loginRes.data)
      
      const userData = loginRes.data
      
      // ✅ 如果云函数返回的头像无效，使用当前输入的 base64 头像
      let finalDisplayAvatar = userData.avatarUrl
      if (!finalDisplayAvatar || finalDisplayAvatar.startsWith('wxfile://') || finalDisplayAvatar.startsWith('http://tmp/')) {
        console.log('⚠️ 云函数返回头像无效，使用当前输入:', finalDisplayAvatar)
        finalDisplayAvatar = finalAvatarUrl // 使用转换后的 base64
      }
      
      // 构建用户信息
      const userInfo = {
        nickName: userData.nickName,
        avatarUrl: finalDisplayAvatar,
        gender: 0,
        country: '',
        province: '',
        city: '',
        language: ''
      }
      
      // 保存用户信息到本地存储
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('userId', userData.userId)
      wx.setStorageSync('openid', userData.openid)
      wx.setStorageSync('hasLoggedIn', true)
      
      // 初始化用户角色
      const userRoles = [userData.role || 'customer']
      wx.setStorageSync('userRoles', userRoles)
      
      // 保存到全局数据
      app.globalData.userInfo = userInfo
      app.globalData.userId = userData.userId
      app.globalData.openid = userData.openid
      app.globalData.roles = userRoles
      
      console.log('✅ 登录信息已保存')
      console.log('  - userId:', userData.userId)
      console.log('  - openid:', userData.openid)
      console.log('  - role:', userData.role)
      console.log('  - isNewUser:', userData.isNewUser)
      
      wx.hideLoading()
      
      // 显示欢迎提示
      wx.showToast({
        title: userData.isNewUser ? `欢迎注册，${userInfo.nickName}` : `欢迎回来，${userInfo.nickName}`,
        icon: 'success',
        duration: 1500
      })
      
      console.log('✅ 登录成功，即将跳转首页')
      
      // 延迟跳转，让用户看到欢迎提示
      setTimeout(() => {
        this.redirectToHome()
      }, 1500)
      
    } catch (error) {
      wx.hideLoading()
      this.setData({ isLoading: false })
      
      console.error('⚠️ 登录失败:', error)
      
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  // 获取微信用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善您的个人资料',
        success: (res) => {
          console.log('✅ wx.getUserProfile 成功:', res)
          resolve(res.userInfo)
        },
        fail: (err) => {
          console.error('❌ wx.getUserProfile 失败:', err)
          
          // 在开发环境中，如果getUserProfile失败，使用模拟数据
          // 真机上不会走到这里
          if (err.errMsg && err.errMsg.includes('getUserProfile')) {
            console.log('⚠️ 开发环境模拟授权，使用测试数据')
            
            // 模拟用户信息
            const mockUserInfo = {
              nickName: '测试用户',
              avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132',
              gender: 0,
              country: '',
              province: '',
              city: '',
              language: ''
            }
            
            resolve(mockUserInfo)
          } else {
            reject(err)
          }
        }
      })
    })
  },

  // 跳过登录
  skipLogin() {
    console.log('用户选择跳过登录')
    
    wx.showToast({
      title: '进入浏览模式',
      icon: 'none',
      duration: 1500
    })
    
    // 标记为游客模式
    wx.setStorageSync('isGuestMode', true)
    
    setTimeout(() => {
      this.redirectToHome()
    }, 1000)
  },

  // 跳转到首页
  redirectToHome() {
    wx.switchTab({
      url: '/pages/home/index',
      fail: () => {
        // 如果switchTab失败，尝试redirectTo
        wx.redirectTo({
          url: '/pages/home/index'
        })
      }
    })
  },

  // 显示用户协议
  showAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '1. 尊重画师版权，不得盗用作品\n2. 诚信交易，按时支付稿费\n3. 理性沟通，文明用语\n4. 遵守平台规则，维护良好秩序',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们承诺：\n1. 仅收集必要的用户信息\n2. 不会泄露您的个人信息\n3. 信息仅用于平台服务\n4. 您可以随时删除账号信息',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 测试获取用户信息（开发调试用）
  testGetUserProfile() {
    console.log('🧪 开始测试 wx.getUserProfile...')
    
    wx.getUserProfile({
      desc: '用于完善您的个人资料',
      success: (res) => {
        console.log('✅ 测试成功！获取到的用户信息:')
        console.log('  完整数据:', res)
        console.log('  userInfo:', res.userInfo)
        console.log('  昵称:', res.userInfo.nickName)
        console.log('  头像:', res.userInfo.avatarUrl)
        console.log('  性别:', res.userInfo.gender)
        
        wx.showModal({
          title: '测试成功',
          content: `昵称: ${res.userInfo.nickName}\n头像: ${res.userInfo.avatarUrl ? '已获取' : '未获取'}`,
          showCancel: false
        })
      },
      fail: (err) => {
        console.error('❌ 测试失败:', err)
        
        wx.showModal({
          title: '测试失败',
          content: `错误信息: ${err.errMsg || JSON.stringify(err)}`,
          showCancel: false
        })
      }
    })
  }
})
