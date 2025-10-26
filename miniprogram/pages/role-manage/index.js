Page({
  data: {
    userId: 0,
    roles: [],
    currentScenario: '',
    // 快速切换场景
    userScenarios: [
      { 
        id: 'customer', 
        name: '普通用户', 
        icon: '👤',
        roles: ['customer'],
        rolesText: '仅购买'
      },
      { 
        id: 'artist', 
        name: '画师', 
        icon: '🎨',
        roles: ['customer', 'artist'],
        rolesText: '购买+接单'
      },
      { 
        id: 'service', 
        name: '客服', 
        icon: '💬',
        roles: ['customer', 'service'],
        rolesText: '购买+客服'
      },
      { 
        id: 'admin', 
        name: '管理员', 
        icon: '⚙️',
        roles: ['customer', 'admin'],
        rolesText: '全部权限'
      },
      { 
        id: 'super', 
        name: '超级用户', 
        icon: '👑',
        roles: ['customer', 'artist', 'service', 'admin'],
        rolesText: '所有身份'
      }
    ],
    // 可选角色
    availableRoles: [
      { id: 'customer', name: '普通用户', desc: '可以浏览和购买商品', color: '#42A5F5', icon: '👤' },
      { id: 'artist', name: '画师', desc: '可以上传作品和接单', color: '#A8E6CF', icon: '🎨' },
      { id: 'service', name: '客服', desc: '可以查看和处理订单', color: '#FFB74D', icon: '💬' },
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
    const userId = wx.getStorageSync('userId') || 1001
    let roles = wx.getStorageSync('userRoles') || ['customer']
    
    // 确保roles是数组
    if (!Array.isArray(roles)) {
      roles = ['customer']
    }
    
    // 判断当前是哪个场景
    const currentScenario = this.detectScenario(roles)
    
    this.setData({
      userId: userId,
      roles: roles,
      currentScenario: currentScenario
    })
  },

  // 检测当前场景
  detectScenario(roles) {
    const rolesStr = JSON.stringify(roles.sort())
    
    for (let scenario of this.data.userScenarios) {
      if (JSON.stringify(scenario.roles.sort()) === rolesStr) {
        return scenario.id
      }
    }
    
    return '' // 自定义组合
  },

  // 快速切换场景
  switchScenario(e) {
    const scenarioId = e.currentTarget.dataset.scenario
    const scenario = this.data.userScenarios.find(s => s.id === scenarioId)
    
    if (!scenario) return
    
    const roles = [...scenario.roles]
    
    console.log('🔄 开始切换用户场景')
    console.log('  - 目标场景:', scenario.name)
    console.log('  - 目标角色:', roles)
    
    // 保存到本地
    wx.setStorageSync('userRoles', roles)
    
    // 更新全局数据
    const app = getApp()
    app.globalData.roles = roles
    app.globalData.role = roles[0]
    
    // ✅ 新增：设置刷新标志
    wx.setStorageSync('needRefresh', true)
    console.log('✅ 已设置刷新标志 needRefresh = true')
    
    this.setData({
      roles: roles,
      currentScenario: scenarioId
    })
    
    wx.showToast({
      title: `已切换为${scenario.name}`,
      icon: 'success',
      duration: 1000  // ✅ 修改：缩短为1秒
    })
    
    // ✅ 修改：缩短延迟时间
    setTimeout(() => {
      console.log('🔙 准备返回个人中心...')
      wx.navigateBack({
        success: () => {
          console.log('✅ 已返回个人中心，等待页面刷新')
        },
        fail: (err) => {
          console.error('❌ 返回失败:', err)
        }
      })
    }, 1000)
  },

  // 切换角色（手动调整）
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
    
    console.log('🔄 手动调整角色')
    console.log('  - 新角色列表:', roles)
    
    // 保存到本地
    wx.setStorageSync('userRoles', roles)
    
    // 更新全局数据
    const app = getApp()
    app.globalData.roles = roles
    app.globalData.role = roles[0]
    
    // ✅ 新增：设置刷新标志
    wx.setStorageSync('needRefresh', true)
    console.log('✅ 已设置刷新标志 needRefresh = true')
    
    // 重新检测场景
    const currentScenario = this.detectScenario(roles)
    
    this.setData({
      roles: roles,
      currentScenario: currentScenario
    })
    
    wx.showToast({
      title: '权限已更新',
      icon: 'success',
      duration: 1000  // ✅ 修改：缩短为1秒
    })
    
    // ✅ 修改：缩短延迟时间
    setTimeout(() => {
      console.log('🔙 准备返回个人中心...')
      wx.navigateBack({
        success: () => {
          console.log('✅ 已返回个人中心，等待页面刷新')
        }
      })
    }, 1000)
  },

  // 重置用户ID为1001
  resetUserId() {
    wx.showModal({
      title: '重置用户ID',
      content: '将用户ID重置为固定的开发测试ID: 1001',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const fixedUserId = 1001
          const fixedOpenid = 'dev-openid-1001'
          
          // 保存到本地存储
          wx.setStorageSync('userId', fixedUserId)
          wx.setStorageSync('openid', fixedOpenid)
          
          // 更新全局数据
          const app = getApp()
          app.globalData.userId = fixedUserId
          app.globalData.openid = fixedOpenid
          
          // 更新页面显示
          this.setData({
            userId: fixedUserId
          })
          
          wx.showToast({
            title: 'ID已重置为1001',
            icon: 'success'
          })
          
          console.log('✅ 用户ID已重置为:', fixedUserId)
        }
      }
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})

