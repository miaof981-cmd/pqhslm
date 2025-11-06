const orderHelper = require('../../utils/order-helper.js')
const staffFinance = require('../../utils/staff-finance.js')
const serviceIncome = require('../../utils/service-income.js')

Page({
  data: {
    userInfo: null,
    orders: [],
    loading: true,
    memberInfo: null,
    orderStats: {
      processing: 0,  // 只统计制作中的数量
      // 其他状态不显示数字，节省性能
    },
    userId: 0,
    // 改为多角色支持
    roles: [], // ['customer', 'artist', 'admin']
    roleTexts: [], // ['普通用户', '画师', '管理员']
    // ✅ 新增：预计算的布尔值，供 WXML 使用
    isArtist: false,
    isAdmin: false,
    isStaff: false,  // 🎯 新增：是否为管理员
    staffBalance: 0, // 🎯 新增：管理员分成余额
    totalBalance: 0, // 🎯 新增：总余额（画师+客服+管理员）
    hasIncome: false, // 🎯 新增：是否有任何收入
    shouldShowCert: true,      // 是否显示画师认证
    shouldShowWorkspace: false, // 是否显示工作台
    hasWorkQRCode: false,      // 是否已设置工作二维码
    // 画师申请状态
    applicationStatus: null, // null: 未申请, 'pending': 待审核, 'rejected': 已驳回, 'approved': 已通过
    applicationTime: '',
    rejectTime: '',
    rejectReason: '',
    applicationId: ''
  },

  onLoad(options) {
    this.loadData()
    this.checkAllIncome() // 🎯 检查所有收入
  },

  onShow() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 [user-center] 页面显示，准备刷新角色数据')
    console.log('  - 时间:', new Date().toLocaleTimeString())
    
    // ✅ 检查刷新标志
    const needRefresh = wx.getStorageSync('needRefresh')
    if (needRefresh) {
      console.log('⚡ 检测到 needRefresh 标志，强制刷新数据')
      wx.removeStorageSync('needRefresh')
      
      // 先清空旧数据，避免保留上次角色状态
      this.setData({ roles: [], roleTexts: [] })
      
      // 延迟一点，确保本地存储已写入
      setTimeout(() => {
        this.loadUserRole()
        this.loadData()
        this.checkAllIncome() // 🎯 刷新所有收入
      }, 100)
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return
    }
    
    console.log('🟢 正常进入个人中心')
    
    // 先清空旧数据
    this.setData({ roles: [], roleTexts: [] })
    
    // 延迟加载
    setTimeout(() => {
      this.loadUserRole()
      this.checkAllIncome() // 🎯 刷新所有收入
    }, 100)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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
        this.checkArtistStatus(),
        this.loadApplicationStatus(), // 加载申请状态
        this.checkWorkQRCode()  // ✅ 新增：检查工作二维码
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
    const userId = wx.getStorageSync('userId') || app.globalData.userId || 1001
    let roles = wx.getStorageSync('userRoles')
    
    console.log('🧾 本地读取roles:', roles)
    
    // ✅ 如果 roles 是字符串，则转为数组
    if (typeof roles === 'string') {
      console.warn('⚠️ roles 是字符串，转换为数组:', roles)
      roles = [roles]
    }
    
    // ✅ 如果 roles 为空，默认是普通用户
    if (!roles || roles.length === 0) {
      console.log('⚠️ roles 为空，默认设置为 [customer]')
      roles = ['customer']
    }
    
    // ⭐ 检查申请记录，如果管理员已授权，自动添加 artist 角色
    const applications = wx.getStorageSync('artist_applications') || []
    const userApp = applications.find(app => app.userId === userId && app.status === 'approved' && app.permissionGranted)
    
    if (userApp && !roles.includes('artist')) {
      console.log('✅ 检测到管理员已授权，自动添加 artist 权限')
      console.log('  - 画师编号:', userApp.artistNumber)
      console.log('  - 授权时间:', userApp.permissionGrantedTime)
      
      roles.push('artist')
      wx.setStorageSync('userRoles', roles)
      
      console.log('  - 更新后的roles:', roles)
    }
    
    console.log('✅ 最终使用的 roles:', roles)
    
    // ✅ 同步全局
    app.globalData.roles = roles
    app.globalData.role = roles[0]
    app.globalData.userId = userId
    
    // 生成角色文本
    const roleTexts = roles.map(r => this.getRoleText(r))
    
    // ✅ 检查申请状态（用于判断是否显示工作台入口）
    // applications 已在上面声明，这里直接使用
    const userApplications = applications.filter(app => app.userId === userId)
    let applicationApproved = false
    
    if (userApplications.length > 0) {
      userApplications.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
      const latestApp = userApplications[0]
      applicationApproved = (latestApp.status === 'approved')
      console.log('📋 最新申请状态:', latestApp.status, '→ applicationApproved:', applicationApproved)
    }
    
    // ✅ 计算布尔值（分离不同角色）
    const isArtist = roles.indexOf('artist') !== -1
    const isAdmin = roles.indexOf('admin') !== -1
    const isService = roles.indexOf('service') !== -1
    
    // ⭐ 关键逻辑：
    // 1. 如果申请已通过（即使没有artist权限），也显示"工作台"入口
    // 2. 点击后会跳转到建立档案页面（由 workspace/index.js 处理）
    const shouldShowCert = !isArtist && !isAdmin && !applicationApproved
    const hasArtistRole = isArtist || applicationApproved  // 显示画师工作台
    const hasServiceRole = isService  // 显示客服工作台
    
    console.log('📊 计算UI显示逻辑:')
    console.log('  - isArtist:', isArtist)
    console.log('  - isAdmin:', isAdmin)
    console.log('  - isService:', isService)
    console.log('  - applicationApproved:', applicationApproved)
    console.log('  - shouldShowCert:', shouldShowCert)
    console.log('  - hasArtistRole:', hasArtistRole)
    console.log('  - hasServiceRole:', hasServiceRole)
    
    // ✅ 更新页面（包含布尔值）
    this.setData({
      userId: userId,
      roles: roles,
      roleTexts: roleTexts,
      isArtist: isArtist,
      isAdmin: isAdmin,
      shouldShowCert: shouldShowCert,
      hasArtistRole: hasArtistRole,
      hasServiceRole: hasServiceRole
    }, () => {
      console.log('✅ 页面角色刷新完成')
      console.log('  - roles:', this.data.roles)
      console.log('  - shouldShowCert:', this.data.shouldShowCert)
      console.log('  - hasArtistRole:', this.data.hasArtistRole)
      console.log('  - hasServiceRole:', this.data.hasServiceRole)
    })
  },

  // 获取角色文本
  getRoleText(role) {
    const roleMap = {
      'customer': '普通用户',
      'artist': '画师',
      'admin': '管理员',
      'service': '客服'
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

  editNickname() {
    const currentName = this.data.userInfo?.name || ''
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: currentName,
      confirmText: '保存',
      success: (res) => {
        if (res.confirm) {
          const newName = (res.content || '').trim()
          if (!newName) {
            wx.showToast({
              title: '昵称不能为空',
              icon: 'none'
            })
            return
          }

          const storedUserInfo = wx.getStorageSync('userInfo') || {}
          const updatedUserInfo = {
            ...storedUserInfo,
            nickName: newName,
            avatarUrl: storedUserInfo.avatarUrl || this.data.userInfo.avatar
          }
          wx.setStorageSync('userInfo', updatedUserInfo)

          const app = getApp()
          app.globalData.userInfo = updatedUserInfo

          this.setData({
            'userInfo.name': newName
          })

          wx.showToast({
            title: '昵称已更新',
            icon: 'success'
          })
        }
      }
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
      const userId = wx.getStorageSync('userId')
      const storageKey = `processing_count_${userId}`
      const cachedProcessing = wx.getStorageSync(storageKey)
      if (typeof cachedProcessing === 'number') {
        this.setData({
          orderStats: {
            processing: cachedProcessing
          }
        })
      }
    const customerOrders = orderHelper.prepareOrdersForPage({
      role: 'customer',
      userId
    })

    const processingStatuses = new Set([
      'processing',
      'inProgress',
      'paid',
      'waitingConfirm',
      'nearDeadline',
      'overdue'
    ])

    const processingCount = customerOrders.filter(order => {
      const statusKey = order.status || ''
      if (!statusKey) return false
      if (statusKey === 'unpaid' || statusKey === 'completed' || statusKey === 'cancelled' || statusKey === 'refunded') {
        return false
      }
      return processingStatuses.has(statusKey) || !['unpaid', 'completed', 'cancelled', 'refunded'].includes(statusKey)
    }).length

    this.setData({
      orderStats: {
        processing: processingCount
      }
    })

    wx.setStorageSync(`processing_count_${userId}`, processingCount)
  },

  // 申请成为画师
  // ✅ 新方法：跳转到画师认证页面（会自动显示申请状态）
  goToArtistCertification() {
    wx.navigateTo({
      url: '/pages/apply/index'
    })
  },

  // 保留旧方法以兼容其他地方的调用
  applyArtist() {
    this.goToArtistCertification()
  },

  // ✅ 新增：检查是否已设置工作二维码
  checkWorkQRCode() {
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    
    // 从本地存储读取画师工作二维码
    const artistQRCodes = wx.getStorageSync('artist_qrcodes') || {}
    const hasQRCode = !!artistQRCodes[userId]
    
    console.log('📱 检查工作二维码:', hasQRCode ? '已设置' : '未设置')
    
    this.setData({
      hasWorkQRCode: hasQRCode
    })
  },

  // ✅ 新增：跳转到上传工作二维码页面
  goToUploadQRCode() {
    wx.navigateTo({
      url: '/pages/artist-qrcode/index'
    })
  },

  // 进入画师工作台
  goToArtistWorkspace() {
    console.log('🎨 进入画师工作台')
    wx.navigateTo({
      url: '/pages/workspace/index?role=artist'
    })
  },

  // 进入客服工作台（独立页面）
  goToServiceWorkspace() {
    console.log('📞 进入客服工作台')
    wx.navigateTo({
      url: '/pages/service-workspace/index'
    })
  },

  // 进入管理后台
  goToAdmin() {
    console.log('🔧 进入管理后台')
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

  // 打赏入口
  // 🎯 检查所有收入（画师+客服+管理员）
  checkAllIncome() {
    const userId = wx.getStorageSync('userId')
    if (!userId) {
      this.setData({ 
        isStaff: false, 
        staffBalance: 0,
        totalBalance: 0,
        hasIncome: false
      })
      return
    }

    const userKey = String(userId)
    
    // 🎯 1. 获取所有订单并去重（避免订单在多个数组中重复）
    const orders = wx.getStorageSync('orders') || []
    const pendingOrders = wx.getStorageSync('pending_orders') || []
    const completedOrders = wx.getStorageSync('completed_orders') || []
    
    // 使用Map去重，key为订单ID
    const orderMap = new Map()
    ;[...orders, ...pendingOrders, ...completedOrders].forEach(order => {
      if (order && order.id) {
        orderMap.set(order.id, order)
      }
    })
    const allOrders = Array.from(orderMap.values())
    
    console.log('📦 订单去重:', {
      原始订单数: orders.length + pendingOrders.length + completedOrders.length,
      去重后订单数: allOrders.length
    })
    
    // 🎯 2. 计算画师订单稿费（仅画师角色）
    const PLATFORM_DEDUCTION = 5.00
    const myCompletedOrders = allOrders.filter(o => 
      o.status === 'completed' && String(o.artistId) === userKey
    )
    const orderIncome = myCompletedOrders.reduce((sum, order) => {
      const orderAmount = parseFloat(order.totalPrice) || parseFloat(order.price) || 0
      const artistShare = Math.max(0, orderAmount - PLATFORM_DEDUCTION)
      return sum + artistShare
    }, 0)
    
    console.log('🎨 画师订单稿费:', {
      已完成订单数: myCompletedOrders.length,
      订单稿费: orderIncome.toFixed(2)
    })
    
    // 🎯 3. 计算打赏收入（画师角色）
    const rewardRecords = wx.getStorageSync('reward_records') || []
    const myRewards = rewardRecords.filter(record => {
      if (record.artistId) {
        return String(record.artistId) === userKey
      }
      const order = allOrders.find(o => String(o.id) === String(record.orderId))
      if (!order) return false
      return String(order.artistId) === userKey
    })
    const rewardIncome = myRewards.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    console.log('💝 画师打赏收入:', {
      打赏次数: myRewards.length,
      打赏收入: rewardIncome.toFixed(2)
    })
    
    // 🎯 4. 画师总收入 = 订单稿费 + 打赏
    const artistIncome = orderIncome + rewardIncome
    
    // 🎯 5. 计算客服收入（客服角色，来自service-income记录）
    const csIncome = serviceIncome.computeIncomeByUserId(userId, 'service')
    console.log('👔 客服分成收入:', csIncome.toFixed(2))
    
    // 🎯 6. 计算管理员分成收入（管理员角色，来自service-income记录）
    const staffIncome = serviceIncome.computeIncomeByUserId(userId, 'admin_share')
    console.log('💼 管理员分成收入:', staffIncome.toFixed(2))
    
    // 🎯 7. 计算已提现金额
    const withdrawRecords = wx.getStorageSync('withdraw_records') || []
    const withdrawn = withdrawRecords
      .filter(r => String(r.userId) === userKey && r.status === 'success')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    // 🎯 8. 计算总余额（三种角色收入相加）
    const totalIncome = artistIncome + csIncome + staffIncome
    const availableBalance = Math.max(0, totalIncome - withdrawn)
    
    // 🎯 9. 检查是否为管理员
    const staffList = staffFinance.getStaffList()
    const staff = staffList.find(s => String(s.userId) === userKey)
    const isStaff = staff && staff.isActive !== false
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💰 收入统计汇总 (user-center)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 用户ID:', userKey)
    console.log('📦 订单去重:', orders.length + pendingOrders.length + completedOrders.length, '→', allOrders.length)
    console.log('')
    console.log('🎨 画师角色:')
    console.log('  - 订单稿费:', orderIncome.toFixed(2), '元 (', myCompletedOrders.length, '单)')
    console.log('  - 打赏收入:', rewardIncome.toFixed(2), '元 (', myRewards.length, '次)')
    console.log('  - 小计:', artistIncome.toFixed(2), '元')
    console.log('')
    console.log('👔 客服角色:', csIncome.toFixed(2), '元')
    console.log('💼 管理员角色:', staffIncome.toFixed(2), '元')
    console.log('')
    console.log('💵 总收入:', totalIncome.toFixed(2), '元')
    console.log('💸 已提现:', withdrawn.toFixed(2), '元')
    console.log('✅ 可提现:', availableBalance.toFixed(2), '元')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    this.setData({
      isStaff,
      staffBalance: staffIncome.toFixed(2),
      totalBalance: availableBalance.toFixed(2),
      hasIncome: availableBalance > 0
    })
  },

  // 🎯 跳转到提现页面
  goToWithdraw() {
    wx.navigateTo({
      url: '/pages/withdraw/index'
    })
  },

  goToRewardPage() {
    wx.navigateTo({
      url: '/pages/reward-records/index'
    })
  },

  handleFunctionTap(e) {
    const type = e.currentTarget.dataset.type
    let message = ''
    switch (type) {
      case 'favorite':
        message = '收藏功能开发中'
        break
      case 'history':
        message = '历史足迹功能开发中'
        break
      case 'service':
        message = '售后请联系您的专属客服'
        break
      default:
        message = '功能开发中'
        break
    }
    wx.showToast({
      title: message,
      icon: 'none'
    })
  },

  // 我的买家秀
  goToMyBuyerShow() {
    console.log('🎨 点击了"我的买家秀"')
    
    wx.navigateTo({
      url: '/pages/my-buyer-show/index',
      success: () => {
        console.log('✅ 跳转成功')
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err)
        wx.showToast({
          title: '页面打开失败',
          icon: 'none'
        })
      }
    })
  },

  // 查看订单详情
  viewOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 查看全部订单
  viewAllOrders(e) {
    // 获取点击的订单状态
    const status = e.currentTarget.dataset.status || 'all'
    wx.navigateTo({
      url: `/pages/order-list/index?status=${status}`
    })
  },

  // 提示重新登录以更新头像昵称
  promptRelogin() {
    console.log('🔄 用户点击头像，提示重新登录')
    
    wx.showModal({
      title: '更新头像和昵称',
      content: '重新授权即可更新您的头像和昵称',
      confirmText: '重新授权',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          console.log('✅ 用户确认更新头像昵称')
          this.updateUserInfo()
        } else {
          console.log('❌ 用户取消更新头像昵称')
        }
      }
    })
  },

  // 加载画师申请状态
  async loadApplicationStatus() {
    const userId = this.data.userId
    console.log('🔍 加载用户申请状态, userId:', userId)
    
    // 从本地存储读取所有申请记录
    const applications = wx.getStorageSync('artist_applications') || []
    console.log('📦 本地申请记录总数:', applications.length)
    
    // 查找当前用户的申请记录（按提交时间倒序，取最新的）
    const userApplications = applications.filter(app => app.userId === userId)
    console.log('👤 当前用户的申请记录:', userApplications.length)
    
    if (userApplications.length === 0) {
      console.log('ℹ️ 用户未提交过申请')
      this.setData({
        applicationStatus: null
      })
      return
    }
    
    // 按提交时间排序，取最新的
    userApplications.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
    const latestApplication = userApplications[0]
    
    console.log('📋 最新申请状态:', latestApplication.status)
    
    // 如果已通过，不显示申请状态（因为已经有画师权限了）
    if (latestApplication.status === 'approved') {
      console.log('✅ 申请已通过，不显示申请卡片')
      this.setData({
        applicationStatus: null
      })
      return
    }
    
    // 格式化时间
    const formatTime = (timeStr) => {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    
    // 设置申请状态
    this.setData({
      applicationStatus: latestApplication.status, // 'pending' 或 'rejected'
      applicationTime: formatTime(latestApplication.submitTime),
      rejectTime: formatTime(latestApplication.rejectTime),
      rejectReason: latestApplication.rejectReason || '未填写驳回原因',
      applicationId: latestApplication._id
    })
    
    console.log('✅ 申请状态加载完成:', {
      status: latestApplication.status,
      time: this.data.applicationTime
    })
  },

  // 查看申请详情
  viewApplicationDetail() {
    const applicationId = this.data.applicationId
    if (!applicationId) {
      wx.showToast({
        title: '申请记录不存在',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/artist-application-detail/index?id=${applicationId}`
    })
  }
})
