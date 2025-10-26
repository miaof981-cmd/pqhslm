Page({
  data: {
    loading: true,
    hasPermission: false, // 是否有权限访问
    userRole: '', // 'artist' 或 'service'
    availableRoles: [], // 用户可以切换的角色列表
    
    // 待处理订单统计
    showPendingOrders: true, // 是否显示待处理订单
    pendingStats: {
      nearDeadline: 5,  // 临近截稿
      overdue: 2,       // 已拖稿
      inProgress: 18    // 进行中
    },
    
    // 平台须知
    notices: [
      { id: 1, content: '每笔订单从今日起2xx天内~~' },
      { id: 2, content: '每笔订单从今日起2xx天内~~' }
    ],
    
    // 快捷功能（根据角色不同）
    quickActions: [],
    
    // 推广链接
    promoLink: 'https://teatnet.com'
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
    
    // 收集用户可以使用的工作角色（只有画师和客服）
    const availableRoles = []
    if (roles.includes('artist')) {
      availableRoles.push('artist')
    }
    if (roles.includes('service')) {
      availableRoles.push('service')
    }
    
    // 检查是否有权限
    if (availableRoles.length === 0) {
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
    let pendingStats
    
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
  }
})
