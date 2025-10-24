Page({
  data: {
    loading: true,
    users: [],
    allUsers: [],
    totalUsers: 0,
    searchKeyword: '',
    statusFilter: 'all',
    userStats: {
      all: 0,
      normal: 0,
      blocked: 0
    },
    hasMore: true,
    loadingMore: false,
    page: 1,
    pageSize: 20,
    
    // 弹窗相关
    showPhoneModal: false,
    showDetailModal: false,
    currentUser: null,
    newPhone: ''
  },

  onLoad() {
    this.checkPermission()
    this.loadUsers()
  },

  // 检查管理员权限
  checkPermission() {
    const role = wx.getStorageSync('userRole') || 'customer'
    if (role !== 'admin') {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return false
    }
    return true
  },

  // 加载用户列表
  async loadUsers() {
    this.setData({ loading: true })
    
    try {
      // 模拟数据 - 实际应从云数据库获取
      const mockUsers = [
        {
          _id: '1',
          userId: 10001,
          openid: 'oXXXX1234567890',
          nickname: '张三',
          avatar: 'https://via.placeholder.com/100',
          phone: '138****1234',
          orderCount: 15,
          totalAmount: '1,580.00',
          registerTime: '2024-01-10 10:30',
          lastLoginTime: '2小时前',
          status: 'normal'
        },
        {
          _id: '2',
          userId: 10002,
          openid: 'oXXXX0987654321',
          nickname: '李四',
          avatar: 'https://via.placeholder.com/100',
          phone: '139****5678',
          orderCount: 8,
          totalAmount: '680.00',
          registerTime: '2024-01-15 14:20',
          lastLoginTime: '1天前',
          status: 'normal'
        },
        {
          _id: '3',
          userId: 10003,
          openid: 'oXXXX1122334455',
          nickname: '王五',
          avatar: 'https://via.placeholder.com/100',
          phone: '',
          orderCount: 23,
          totalAmount: '2,360.00',
          registerTime: '2023-12-20 09:15',
          lastLoginTime: '3小时前',
          status: 'normal'
        },
        {
          _id: '4',
          userId: 10004,
          openid: 'oXXXX5544332211',
          nickname: '赵六',
          avatar: 'https://via.placeholder.com/100',
          phone: '137****9012',
          orderCount: 0,
          totalAmount: '0.00',
          registerTime: '2024-01-20 16:45',
          lastLoginTime: '刚刚',
          status: 'blocked'
        },
        {
          _id: '5',
          userId: 10005,
          openid: 'oXXXX6677889900',
          nickname: '钱七',
          avatar: 'https://via.placeholder.com/100',
          phone: '136****3456',
          orderCount: 12,
          totalAmount: '1,120.00',
          registerTime: '2024-01-05 11:00',
          lastLoginTime: '5小时前',
          status: 'normal'
        }
      ]
      
      // 计算统计数据
      const userStats = {
        all: mockUsers.length,
        normal: mockUsers.filter(u => u.status === 'normal').length,
        blocked: mockUsers.filter(u => u.status === 'blocked').length
      }
      
      this.setData({
        allUsers: mockUsers,
        users: mockUsers,
        totalUsers: mockUsers.length,
        userStats: userStats,
        hasMore: false
      })
    } catch (error) {
      console.error('加载用户失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 搜索
  onSearch(e) {
    const keyword = e.detail.value.toLowerCase()
    this.setData({ searchKeyword: keyword })
    
    if (!keyword) {
      this.setData({ users: this.data.allUsers })
      return
    }
    
    const filtered = this.data.allUsers.filter(user => 
      user.nickname.toLowerCase().includes(keyword) ||
      user.userId.toString().includes(keyword) ||
      (user.phone && user.phone.includes(keyword))
    )
    
    this.setData({ users: filtered })
  },

  // 清除搜索
  clearSearch() {
    this.setData({ 
      searchKeyword: '',
      users: this.data.allUsers 
    })
  },

  // 按状态筛选
  filterByStatus(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ statusFilter: filter })
    
    if (filter === 'all') {
      this.setData({ users: this.data.allUsers })
    } else {
      const filtered = this.data.allUsers.filter(u => u.status === filter)
      this.setData({ users: filtered })
    }
  },

  // 查看用户详情
  viewUserDetail(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.allUsers.find(u => u._id === id)
    
    if (user) {
      this.setData({
        currentUser: user,
        showDetailModal: true
      })
    }
  },

  // 拉黑用户
  blockUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.allUsers.find(u => u._id === id)
    
    wx.showModal({
      title: '拉黑用户',
      content: `确认拉黑用户"${user.nickname}"？拉黑后该用户将无法登录和下单`,
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 实际应调用云函数
          wx.showToast({ title: '已拉黑', icon: 'success' })
          this.loadUsers()
        }
      }
    })
  },

  // 解封用户
  unblockUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.allUsers.find(u => u._id === id)
    
    wx.showModal({
      title: '解封用户',
      content: `确认解封用户"${user.nickname}"？`,
      success: (res) => {
        if (res.confirm) {
          // 实际应调用云函数
          wx.showToast({ title: '已解封', icon: 'success' })
          this.loadUsers()
        }
      }
    })
  },

  // 修改手机号
  editPhone(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.allUsers.find(u => u._id === id)
    
    if (user) {
      this.setData({
        currentUser: user,
        newPhone: '',
        showPhoneModal: true
      })
    }
  },

  onPhoneInput(e) {
    this.setData({ newPhone: e.detail.value })
  },

  savePhone() {
    const { newPhone } = this.data
    
    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(newPhone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认修改',
      content: `确认将手机号修改为 ${newPhone}？`,
      success: (res) => {
        if (res.confirm) {
          // 实际应调用云函数
          wx.showLoading({ title: '保存中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '修改成功', icon: 'success' })
            this.closePhoneModal()
            this.loadUsers()
          }, 500)
        }
      }
    })
  },

  closePhoneModal() {
    this.setData({ showPhoneModal: false })
  },

  closeDetailModal() {
    this.setData({ showDetailModal: false })
  },

  // 查看用户订单
  viewUserOrders() {
    const userId = this.data.currentUser.userId
    wx.showToast({ title: '功能开发中', icon: 'none' })
    // 实际应跳转到订单列表页并筛选该用户的订单
  },

  // 加载更多
  loadMore() {
    if (this.data.loadingMore) return
    
    this.setData({ loadingMore: true })
    
    // 模拟加载
    setTimeout(() => {
      this.setData({ 
        loadingMore: false,
        hasMore: false
      })
    }, 1000)
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 阻止冒泡
  stopPropagation() {}
})

