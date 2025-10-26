const app = getApp()

Page({
  data: {
    isLoading: false
  },

  onLoad(options) {
    // 检查是否已经登录
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn')
    
    if (userInfo && hasLoggedIn) {
      // 已登录，直接跳转到首页
      console.log('用户已登录，跳转首页')
      this.redirectToHome()
    }
  },

  // 处理登录
  async handleLogin() {
    if (this.data.isLoading) return
    
    this.setData({ isLoading: true })
    
    wx.showLoading({
      title: '登录中...',
      mask: true
    })

    try {
      // 请求微信授权
      const userInfo = await this.getUserProfile()
      
      // 保存用户信息
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('hasLoggedIn', true)
      app.globalData.userInfo = userInfo
      
      wx.hideLoading()
      
      // 显示欢迎提示
      wx.showToast({
        title: `欢迎，${userInfo.nickName}`,
        icon: 'success',
        duration: 1500
      })
      
      console.log('✅ 登录成功:', userInfo)
      
      // 延迟跳转，让用户看到欢迎提示
      setTimeout(() => {
        this.redirectToHome()
      }, 1500)
      
    } catch (error) {
      wx.hideLoading()
      this.setData({ isLoading: false })
      
      console.log('⚠️ 用户取消授权或授权失败:', error)
      
      wx.showModal({
        title: '授权失败',
        content: '需要授权才能使用完整功能，您可以选择"暂不登录"先浏览商品',
        confirmText: '重新授权',
        cancelText: '暂不登录',
        success: (res) => {
          if (res.confirm) {
            this.handleLogin()
          } else {
            this.skipLogin()
          }
        }
      })
    }
  },

  // 获取微信用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善您的个人资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: (err) => {
          reject(err)
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
  }
})

