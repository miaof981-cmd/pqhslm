Page({
  data: {
    userId: 0,
    roles: [],
    availableRoles: [
      { id: 'customer', name: '普通用户', desc: '可以浏览和购买商品', color: '#42A5F5', icon: '👤' },
      { id: 'artist', name: '画师', desc: '可以上传作品和接单', color: '#A8E6CF', icon: '🎨' },
      { id: 'admin', name: '管理员', desc: '可以管理平台和用户', color: '#FF6B6B', icon: '⚙️' }
    ]
  },

  onLoad() {
    this.loadRoles()
  },

  onShow() {
    this.loadRoles()
  },

  // 加载当前角色
  loadRoles() {
    const userId = wx.getStorageSync('userId') || 10001
    let roles = wx.getStorageSync('userRoles') || ['customer']
    
    // 确保roles是数组
    if (!Array.isArray(roles)) {
      roles = ['customer']
    }
    
    this.setData({
      userId: userId,
      roles: roles
    })
  },

  // 切换角色
  toggleRole(e) {
    const roleId = e.currentTarget.dataset.role
    let { roles } = this.data
    
    // 不能移除customer角色（至少保留一个角色）
    if (roleId === 'customer' && roles.includes('customer') && roles.length === 1) {
      wx.showToast({
        title: '至少保留一个角色',
        icon: 'none'
      })
      return
    }
    
    // 切换角色
    if (roles.includes(roleId)) {
      // 移除角色
      roles = roles.filter(r => r !== roleId)
      
      // 如果移除后没有角色，添加customer
      if (roles.length === 0) {
        roles = ['customer']
      }
    } else {
      // 添加角色
      roles.push(roleId)
    }
    
    // 保存到本地
    wx.setStorageSync('userRoles', roles)
    
    // 更新全局数据
    const app = getApp()
    app.globalData.roles = roles
    app.globalData.role = roles[0]
    
    this.setData({
      roles: roles
    })
    
    wx.showToast({
      title: '权限已更新',
      icon: 'success'
    })
  },

  // 重置为普通用户
  resetToCustomer() {
    wx.showModal({
      title: '确认重置',
      content: '将清除所有权限，仅保留普通用户身份',
      success: (res) => {
        if (res.confirm) {
          const roles = ['customer']
          
          // 保存到本地
          wx.setStorageSync('userRoles', roles)
          
          // 更新全局数据
          const app = getApp()
          app.globalData.roles = roles
          app.globalData.role = 'customer'
          
          this.setData({
            roles: roles
          })
          
          wx.showToast({
            title: '已重置为普通用户',
            icon: 'success'
          })
        }
      }
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})

