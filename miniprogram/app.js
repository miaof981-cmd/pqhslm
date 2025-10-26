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
    
    // 检查登录状态
    this.checkLoginStatus()
  },

  // 初始化用户信息
  initUserInfo() {
    // 检查本地存储是否有用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const resetFlag = wx.getStorageSync('resetUserId')  // ✅ 新增：重置标志
    let userId = wx.getStorageSync('userId')
    let openid = wx.getStorageSync('openid')
    
    // ✅ 修改：增加重置逻辑
    if (userId && openid && !resetFlag) {
      // 已有基础信息，继续使用
      this.globalData.userId = userId
      this.globalData.openid = openid
      
      if (userInfo) {
        this.globalData.userInfo = userInfo
        console.log('✅ 用户信息已加载')
        console.log('  - 来源: 本地缓存')
        console.log('  - 用户ID:', userId)
        console.log('  - 昵称:', userInfo.nickName)
      } else {
        console.log('✅ 用户ID已加载:', userId, '(来源: 本地缓存)')
      }
    } else {
      // 没有用户信息，或者需要重置，生成新的自增ID
      const newUserId = this.generateNewUserId()
      const newOpenid = `openid-${newUserId}-${Date.now()}`
      
      this.globalData.userId = newUserId
      this.globalData.openid = newOpenid
      
      wx.setStorageSync('userId', newUserId)
      wx.setStorageSync('openid', newOpenid)
      
      // ✅ 清除重置标志
      if (resetFlag) {
        wx.removeStorageSync('resetUserId')
        console.log('🔄 用户ID已重置')
      }
      
      console.log('🆕 生成新用户ID')
      console.log('  - 来源:', resetFlag ? '手动重置' : '首次创建')
      console.log('  - 新ID:', newUserId)
    }
  },

  // 生成新的自增用户ID
  generateNewUserId() {
    // 获取当前最大的用户ID
    let maxUserId = wx.getStorageSync('maxUserId') || 1000
    
    // 新用户ID = 最大ID + 1
    const newUserId = maxUserId + 1
    
    // 保存新的最大ID
    wx.setStorageSync('maxUserId', newUserId)
    
    console.log('📊 ID生成逻辑:')
    console.log('  - 当前最大ID:', maxUserId)
    console.log('  - 新用户ID:', newUserId)
    console.log('  - 已更新maxUserId为:', newUserId)
    
    return newUserId
  },

  // 重置用户ID（开发调试用）
  resetUserId() {
    console.log('⚠️ 准备重置用户ID...')
    
    // 设置重置标志
    wx.setStorageSync('resetUserId', true)
    
    // 清除当前用户数据
    wx.removeStorageSync('userId')
    wx.removeStorageSync('openid')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('hasLoggedIn')
    
    console.log('✅ 用户数据已清除，下次启动将生成新ID')
    
    // 重新启动小程序
    wx.reLaunch({
      url: '/pages/login/index',
      success: () => {
        console.log('✅ 已跳转到登录页')
      }
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn')
    const isGuestMode = wx.getStorageSync('isGuestMode')
    
    if (!userInfo && !hasLoggedIn && !isGuestMode) {
      // 未登录且不是游客模式，跳转到登录页
      console.log('用户未登录，跳转登录页')
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/login/index',
          fail: () => {
            console.log('跳转登录页失败，可能已在登录页')
          }
        })
      }, 500)
    } else {
      console.log('用户已登录或处于游客模式')
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