Page({
  data: {
    loading: true,
    hasPermission: false, // 是否有权限访问
    userRole: '', // 'artist' 或 'service'
    availableRoles: [], // 用户可以切换的角色列表
    
    // 待处理订单统计
    pendingStats: {
      nearDeadline: 5,  // 临近截稿
      overdue: 2,       // 已拖稿
      inProgress: 18    // 进行中
    },
    
    // 平台须知
    showNotices: false, // 默认折叠
    notices: [
      { id: 1, content: '每笔订单从今日起20天内未确认收货，系统将自动确认收货' },
      { id: 2, content: '平台回收一定比例的服务费用于承担工作人员工资' },
      { id: 3, content: '首月会员费19.9元用于评估收益，次月起29.9元' }
    ]
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    this.loadData()
  },

  // 检查权限并确定角色
  checkPermission() {
    const app = getApp()
    const roles = app.getUserRoles()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 [workspace] 权限检查开始')
    console.log('  - 用户ID:', userId)
    console.log('  - getUserRoles() 返回:', roles)
    console.log('  - 本地存储 userRoles:', wx.getStorageSync('userRoles'))
    console.log('  - app.globalData.roles:', app.globalData.roles)
    
    // 收集用户可以使用的工作角色（只有画师和客服）
    const availableRoles = []
    if (roles.includes('artist')) {
      availableRoles.push('artist')
    }
    if (roles.includes('service')) {
      availableRoles.push('service')
    }
    
    console.log('  - 可用工作角色:', availableRoles)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // ✅ 如果有工作台权限，直接进入
    if (availableRoles.length > 0) {
      console.log('✅ 用户有工作台权限，直接进入')
      
      // 默认选择第一个可用角色
      const defaultRole = availableRoles[0]
      
      this.setData({
        loading: false,
        hasPermission: true,
        userRole: defaultRole,
        availableRoles: availableRoles
      })
      
      // 加载工作台数据
      this.loadData()
      
      return
    }
    
    // ⭐ 如果没有工作台权限，检查是否申请已通过
    if (availableRoles.length === 0) {
      console.log('🔍 没有工作台权限，检查申请状态...')
      
      // 检查画师申请状态
      const applications = wx.getStorageSync('artist_applications') || []
      const userApplications = applications.filter(app => app.userId === userId)
      
      if (userApplications.length > 0) {
        userApplications.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
        const latestApp = userApplications[0]
        
        console.log('📋 最新申请状态:', latestApp.status)
        
        // 如果申请已通过，检查是否已建立档案
        if (latestApp.status === 'approved') {
          const profiles = wx.getStorageSync('artist_profiles') || {}
          const hasProfile = !!profiles[userId]
          
          console.log('📝 是否已建立档案:', hasProfile)
          
          // 只有在档案未建立时才跳转
          if (!hasProfile) {
            console.log('✅ 申请已通过但档案未建立，跳转到建立档案页面')
            wx.redirectTo({
              url: '/pages/artist-qrcode/index'
            })
            return
          } else {
            console.log('⚠️ 申请已通过且档案已建立，但权限未激活')
            // 档案已建立但权限未激活，显示提示
            this.setData({
              loading: false,
              hasPermission: false
            })
            
            wx.showModal({
              title: '权限待激活',
              content: '您的档案已建立，但工作台权限尚未激活。\n\n请联系管理员开通权限。',
              showCancel: false,
              confirmText: '我知道了',
              success: () => {
                wx.navigateBack()
              }
            })
            return
          }
        }
      }
      
      // 申请未通过或未申请，显示权限不足提示
      this.setData({
        loading: false,
        hasPermission: false
      })
      
      wx.showModal({
        title: '权限不足',
        content: '您还不是画师或客服，无法访问工作台\n\n💡 如何成为画师？\n1. 返回首页\n2. 点击底部"画师认证"\n3. 填写申请表单\n4. 等待管理员审核',
        showCancel: true,
        cancelText: '返回',
        confirmText: '去申请',
        success: (res) => {
          if (res.confirm) {
            // 跳转到画师申请页面
            wx.redirectTo({
              url: '/pages/apply/index'
            })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }
    
    // ✅ 新增：如果是画师，检查是否已设置工作二维码
    if (roles.includes('artist')) {
      const userId = app.globalData.userId || wx.getStorageSync('userId')
      const artistQRCodes = wx.getStorageSync('artist_qrcodes') || {}
      const hasQRCode = !!artistQRCodes[userId]
      
      console.log('📱 检查画师工作二维码:', hasQRCode ? '已设置' : '未设置')
      
      if (!hasQRCode) {
        // 没有工作二维码，跳转到上传页面
        wx.redirectTo({
          url: '/pages/artist-qrcode/index'
        })
        return
      }
    }
    
    // 从本地存储读取上次选择的角色
    let userRole = wx.getStorageSync('workspace_role') || availableRoles[0]
    
    // 确保选择的角色在可用列表中
    if (!availableRoles.includes(userRole)) {
      userRole = availableRoles[0]
    }
    
    this.setData({ 
      hasPermission: true,
      userRole,
      availableRoles
    })
    
    this.loadData()
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    const { userRole } = this.data
    
    // 根据角色加载不同的快捷功能
    if (userRole === 'artist') {
      this.loadArtistActions()
    } else if (userRole === 'service') {
      this.loadServiceActions()
    }
    
    // 加载订单统计数据
    this.loadPendingStats()
    
    this.setData({ loading: false })
  },

  // 加载画师快捷功能
  loadArtistActions() {
    const quickActions = [
      { id: 'data-stats', label: '数据统计', iconClass: 'icon-chart' },
      { id: 'order-manage', label: '订单管理', iconClass: 'icon-order' },
      { id: 'product-manage', label: '商品管理', iconClass: 'icon-product' },
      { id: 'rewards', label: '打赏记录', iconClass: 'icon-money' }
    ]
    
    this.setData({ quickActions })
  },

  // 加载客服快捷功能
  loadServiceActions() {
    const quickActions = [
      { id: 'order-manage', label: '订单管理', iconClass: 'icon-order' },
      { id: 'consultations', label: '咨询记录', iconClass: 'icon-chat' }
    ]
    
    this.setData({ quickActions })
  },

  // 加载待处理订单统计
  loadPendingStats() {
    const { userRole } = this.data
    
    // 模拟数据 - 实际应该从后端获取
    let pendingStats = {
      nearDeadline: 0,
      overdue: 0,
      inProgress: 0
    }
    
    if (userRole === 'artist') {
      // 画师：只看自己的订单
      pendingStats = {
        nearDeadline: 2,
        overdue: 1,
        inProgress: 5
      }
    } else if (userRole === 'service') {
      // 客服：看所有订单
      pendingStats = {
        nearDeadline: 12,
        overdue: 5,
        inProgress: 38
      }
    }
    
    this.setData({ pendingStats })
  },

  // 切换角色标签
  switchRoleTab(e) {
    const { role } = e.currentTarget.dataset
    const { availableRoles } = this.data
    
    // 检查是否有该角色权限
    if (!availableRoles.includes(role)) {
      wx.showToast({
        title: '您没有该角色权限',
        icon: 'none'
      })
      return
    }
    
    // 保存选择到本地存储
    wx.setStorageSync('workspace_role', role)
    
    // 更新角色并重新加载数据
    this.setData({
      userRole: role
    })
    
    this.loadData()
  },

  // 切换待处理订单显示/隐藏
  togglePendingOrders(e) {
    this.setData({
      showPendingOrders: e.detail.value
    })
  },

  // 查看通知动态
  viewNotices() {
    wx.showToast({
      title: '查看通知功能开发中',
      icon: 'none'
    })
  },

  // 处理快捷功能点击
  handleQuickAction(e) {
    const { action } = e.currentTarget.dataset
    
    switch (action) {
      case 'data-stats':
        wx.navigateTo({
          url: '/pages/admin-panel/index?tab=dashboard'
        })
        break
      case 'order-manage':
        wx.navigateTo({
          url: '/pages/admin-panel/index?tab=orders'
        })
        break
      case 'product-manage':
        wx.navigateTo({
          url: '/pages/product-manage/index'
        })
        break
      case 'rewards':
      case 'consultations':
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
        break
      default:
        console.log('未知操作:', action)
    }
  },

  // 复制推广链接
  copyPromoLink() {
    const { promoLink } = this.data
    
    wx.setClipboardData({
      data: promoLink,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },
  
  // 切换平台须知显示/隐藏
  toggleNotices() {
    this.setData({
      showNotices: !this.data.showNotices
    })
  },
  
  // 跳转到订单管理
  goToOrderManage() {
    console.log('跳转到订单管理页面')
    wx.navigateTo({
      url: '/pages/order-list/index'
    })
  },
  
  // 跳转到特定类型的订单
  goToOrders(e) {
    const { type } = e.currentTarget.dataset
    console.log('查看订单类型:', type)
    wx.navigateTo({
      url: `/pages/order-list/index?type=${type}`
    })
  },
  
  // 处理功能点击
  handleFunction(e) {
    const { func } = e.currentTarget.dataset
    
    console.log('点击功能:', func)
    
    switch (func) {
      case 'dataStats':
        // 跳转到数据统计页面
        wx.showToast({
          title: '数据统计开发中',
          icon: 'none'
        })
        break
        
      case 'productManage':
        // 跳转到商品管理
        wx.navigateTo({
          url: '/pages/product-manage/index'
        })
        break
        
      case 'rewards':
        // 跳转到打赏记录
        wx.showToast({
          title: '打赏记录开发中',
          icon: 'none'
        })
        break
        
      case 'withdraw':
        // 跳转到资金提现
        wx.showToast({
          title: '资金提现开发中',
          icon: 'none'
        })
        break
        
      default:
        console.log('未知功能:', func)
    }
  }
})
