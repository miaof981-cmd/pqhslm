App({
  globalData: {
    userInfo: null,
    userId: 0,        // 自增用户ID
    openid: '',       // 微信openid（内部使用）
    role: 'customer', // customer, artist, admin
    userProfile: null
  },

  onLaunch() {
    // 暂时禁用云开发，避免权限错误
    // 初始化云开发
    // if (!wx.cloud) {
    //   console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    // } else {
    //   wx.cloud.init({
    //     env: 'cloud1-0g8v8v8v8v8v8v8v', // 请替换为你的云开发环境ID
    //     traceUser: true,
    //   })
    // }

    // 获取用户信息
    this.getUserInfo()
  },

  // 获取用户信息
  getUserInfo() {
    // 暂时使用模拟数据，避免云开发权限错误
    this.globalData.openid = 'dev-openid-demo-' + Date.now()
    this.getUserProfile()
    
    // 云开发版本（需要先开通云开发）
    // wx.cloud.callFunction({
    //   name: 'login',
    //   success: res => {
    //     this.globalData.openid = res.result.openid
    //     this.getUserProfile()
    //   },
    //   fail: err => {
    //     console.error('获取openid失败', err)
    //   }
    // })
  },

  // 获取用户资料
  getUserProfile() {
    // 暂时使用模拟数据
    this.globalData.userProfile = {
      openid: this.globalData.openid,
      role: 'customer',
      name: '测试用户'
    }
    this.globalData.role = 'customer'
    
    // 云开发版本（需要先开通云开发）
    // wx.cloud.database().collection('users').where({
    //   openid: this.globalData.openid
    // }).get().then(res => {
    //   if (res.data.length > 0) {
    //     this.globalData.userProfile = res.data[0]
    //     this.globalData.role = res.data[0].role || 'customer'
    //   }
    // })
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

  // 检查权限
  checkPermission(requiredRole) {
    const roleHierarchy = {
      'customer': 1,
      'artist': 2,
      'admin': 3
    }
    return roleHierarchy[this.globalData.role] >= roleHierarchy[requiredRole]
  }
})