App({
  globalData: {
    userInfo: null,
    userId: 0,        // 自增用户ID
    openid: '',       // 微信openid（内部使用）
    role: 'customer', // customer, artist, admin
    userProfile: null
  },

  onLaunch() {
    // 初始化用户信息
    this.initUserInfo()
    
    // 延迟请求微信授权（给用户一个缓冲时间）
    setTimeout(() => {
      this.checkAndRequestAuth()
    }, 1000)
  },

  // 初始化用户信息
  initUserInfo() {
    // 检查本地存储是否有用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const userId = wx.getStorageSync('userId')
    const openid = wx.getStorageSync('openid')
    
    if (userId && openid) {
      // 已有基础信息
      this.globalData.userId = userId
      this.globalData.openid = openid
      
      if (userInfo) {
        this.globalData.userInfo = userInfo
        console.log('用户信息已加载:', userInfo)
      }
    } else {
      // 没有用户信息，生成临时ID
      const tempUserId = 1001 + Math.floor(Math.random() * 1000)
      const tempOpenid = 'dev-openid-' + Date.now()
      
      this.globalData.userId = tempUserId
      this.globalData.openid = tempOpenid
      
      wx.setStorageSync('userId', tempUserId)
      wx.setStorageSync('openid', tempOpenid)
      
      console.log('生成临时用户ID:', tempUserId)
    }
  },

  // 检查并请求授权
  checkAndRequestAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    
    // 如果没有用户信息，静默请求授权
    if (!userInfo) {
      console.log('检测到未授权，准备请求微信授权...')
      this.requestWxAuth()
    }
  },

  // 请求微信授权
  requestWxAuth() {
    wx.getUserProfile({
      desc: '用于完善您的个人资料',
      success: (res) => {
        const userInfo = res.userInfo
        
        // 保存用户信息到本地和全局
        wx.setStorageSync('userInfo', userInfo)
        this.globalData.userInfo = userInfo
        
        console.log('✅ 微信授权成功:', userInfo)
        
        wx.showToast({
          title: '授权成功',
          icon: 'success',
          duration: 1500
        })
      },
      fail: (err) => {
        console.log('⚠️ 用户取消授权或授权失败:', err)
        // 用户拒绝授权，不影响使用，但部分功能受限
      }
    })
  },

  // 获取微信用户信息（需要用户授权）
  async getWxUserInfo() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          const userInfo = res.userInfo
          
          // 保存用户信息到本地
          wx.setStorageSync('userInfo', userInfo)
          this.globalData.userInfo = userInfo
          
          console.log('获取微信用户信息成功:', userInfo)
          resolve(userInfo)
        },
        fail: (err) => {
          console.error('获取微信用户信息失败:', err)
          reject(err)
        }
      })
    })
  },

  // 设置用户角色
  setRole(role) {
    this.globalData.role = role
    // 更新数据库
    wx.cloud.database().collection('users').where({
      openid: this.globalData.openid
    }).update({
      data: {
        role: role
      }
    })
  },

  // 检查权限（支持多角色）
  checkPermission(requiredRole) {
    // 从本地存储读取用户的所有角色
    const userRoles = wx.getStorageSync('userRoles') || ['customer']
    
    // 检查用户是否拥有所需角色
    return userRoles.includes(requiredRole)
  },
  
  // 检查是否有任一权限
  hasAnyRole(roles) {
    const userRoles = wx.getStorageSync('userRoles') || ['customer']
    return roles.some(role => userRoles.includes(role))
  },
  
  // 获取用户所有角色
  getUserRoles() {
    return wx.getStorageSync('userRoles') || ['customer']
  }
})