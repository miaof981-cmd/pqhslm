Page({
  data: {
    userInfo: null,
    orders: [],
    loading: true,
    memberInfo: null,
    orderStats: {
      created: 0,
      completed: 0,
      refunded: 0,
      total: 0
    },
    userId: 0,
    // 改为多角色支持
    roles: [], // ['customer', 'artist', 'admin']
    roleTexts: [] // ['普通用户', '画师', '管理员']
  },

  onLoad(options) {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    // 加载用户ID和角色
    this.loadUserRole()
    
    try {
      await Promise.all([
        this.loadUserInfo(),
        this.loadOrders(),
        this.checkArtistStatus()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载用户角色（支持多角色）
  loadUserRole() {
    const app = getApp()
    const userId = wx.getStorageSync('userId') || 10001
    
    // 从本地存储读取用户的多个角色
    let roles = wx.getStorageSync('userRoles') || ['customer']
    
    // 确保roles是数组
    if (!Array.isArray(roles)) {
      roles = ['customer']
    }
    
    // 如果没有角色，默认为customer
    if (roles.length === 0) {
      roles = ['customer']
    }
    
    // 保存到本地
    wx.setStorageSync('userId', userId)
    wx.setStorageSync('userRoles', roles)
    
    // 更新全局数据（主角色为第一个）
    app.globalData.userId = userId
    app.globalData.role = roles[0]
    app.globalData.roles = roles
    
    // 生成角色文本数组
    const roleTexts = roles.map(role => this.getRoleText(role))
    
    this.setData({
      userId: userId,
      roles: roles,
      roleTexts: roleTexts
    })
  },

  // 获取角色文本
  getRoleText(role) {
    const roleMap = {
      'customer': '普通用户',
      'artist': '画师',
      'admin': '管理员'
    }
    return roleMap[role] || '未知'
  },

  // 检查是否有某个角色
  hasRole(role) {
    return this.data.roles.includes(role)
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#E74C3C',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doLogout()
        }
      }
    })
  },

  // 执行退出登录
  doLogout() {
    wx.showLoading({ title: '退出中...' })

    try {
      // 清除用户信息
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('hasLoggedIn')
      wx.removeStorageSync('isGuestMode')
      
      // 清除全局数据
      const app = getApp()
      app.globalData.userInfo = null
      
      console.log('✅ 已清除登录信息')
      
      wx.hideLoading()
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
      
      // 延迟跳转到登录页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/index'
        })
      }, 1500)
      
    } catch (error) {
      wx.hideLoading()
      console.error('退出登录失败:', error)
      
      wx.showToast({
        title: '退出失败，请重试',
        icon: 'none'
      })
    }
  },

  // 进入权限管理页面
  goToRoleManage() {
    wx.navigateTo({
      url: '/pages/role-manage/index'
    })
  },

  // 更新用户信息（手动授权）
  async updateUserInfo() {
    const app = getApp()
    
    wx.showLoading({ title: '获取授权...' })
    
    try {
      const userInfo = await app.getWxUserInfo()
      
      // 重新加载用户信息
      await this.loadUserInfo()
      
      wx.hideLoading()
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '授权失败',
        icon: 'none'
      })
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    const app = getApp()
    
    console.log('🔄 开始加载用户信息...')
    
    // 获取微信用户信息（优先从本地存储，其次从全局）
    let wxUserInfo = wx.getStorageSync('userInfo')
    console.log('  📦 本地存储:', wxUserInfo)
    
    if (!wxUserInfo) {
      wxUserInfo = app.globalData.userInfo
      console.log('  🌐 全局数据:', wxUserInfo)
    }
    
    if (wxUserInfo) {
      console.log('  ✅ 找到用户信息:')
      console.log('    - 昵称:', wxUserInfo.nickName)
      console.log('    - 头像:', wxUserInfo.avatarUrl)
    } else {
      console.log('  ⚠️ 未找到用户信息，使用默认值')
    }
    
    // 获取用户的主要角色（第一个角色）
    const mainRole = this.data.roles.length > 0 ? this.data.roles[0] : 'customer'
    
    // 默认头像（使用纯色背景 + 文字）
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKg8L3RleHQ+PC9zdmc+'
    
    const userInfo = {
      openid: app.globalData.openid,
      name: wxUserInfo ? wxUserInfo.nickName : '微信用户',
      avatar: wxUserInfo ? wxUserInfo.avatarUrl : defaultAvatar,
      role: mainRole  // 使用实际的主要角色
    }
    
    this.setData({ userInfo })
    
    console.log('✅ 用户中心最终显示:')
    console.log('  - 名称:', userInfo.name)
    console.log('  - 头像:', userInfo.avatar)
  },

  // 检查画师状态
  async checkArtistStatus() {
    const isArtist = this.hasRole('artist') || this.hasRole('admin')
    
    if (isArtist) {
      await this.loadMemberInfo()
    }
  },

  // 加载会员信息
  async loadMemberInfo() {
    this.setData({
      memberInfo: {
        isValid: true,
        endDate: '2024-12-31',
        daysLeft: 365,
        amount: 100
      }
    })
  },

  // 加载订单
  async loadOrders() {
    const orders = [
      {
        _id: 'order-1',
        status: 'created',
        createTime: '2024-01-01',
        deadline: '2024-01-04',
        price: 100,
        productName: '精美头像设计'
      },
      {
        _id: 'order-2',
        status: 'completed',
        createTime: '2024-01-02',
        deadline: '2024-01-05',
        price: 168,
        productName: '创意插画作品'
      }
    ]
    
    // 计算订单统计
    const stats = {
      created: orders.filter(o => o.status === 'created').length,
      completed: orders.filter(o => o.status === 'completed').length,
      refunded: 0,
      total: orders.length
    }
    
    this.setData({
      orders: orders,
      orderStats: stats
    })
  },

  // 申请成为画师
  applyArtist() {
    wx.navigateTo({
      url: '/pages/apply/index'
    })
  },

  // 进入工作台（根据角色显示不同内容）
  goToWorkspace() {
    wx.navigateTo({
      url: '/pages/workspace/index'
    })
  },

  // 进入管理后台
  goToAdmin() {
    const app = getApp()
    if (app.checkPermission('admin')) {
      wx.navigateTo({
        url: '/pages/admin/index'
      })
    } else {
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      })
    }
  },

  // 查看订单详情
  viewOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 查看全部订单
  viewAllOrders() {
    wx.navigateTo({
      url: '/pages/order-list/index'
    })
  },

  // 更新用户信息
  updateUserInfo() {
    wx.navigateTo({
      url: '/pages/user-edit/index'
    })
  }
})