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
  },

  // 初始化用户信息
  initUserInfo() {
    // 检查本地存储是否有用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const userId = wx.getStorageSync('userId')
    const openid = wx.getStorageSync('openid')
    
    if (userInfo && userId && openid) {
      // 已有用户信息，直接使用
      this.globalData.userInfo = userInfo
      this.globalData.userId = userId
      this.globalData.openid = openid
      console.log('用户信息已加载:', userInfo)
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