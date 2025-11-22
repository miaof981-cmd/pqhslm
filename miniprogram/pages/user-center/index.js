const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')
const orderHelper = require('../../utils/order-helper.js')
const orderStatusUtil = require('../../utils/order-status.js')

/**
 * 🔧 iOS兼容的日期解析函数
 */
const parseDate = orderStatusUtil.parseDate

Page({
  data: {
    userInfo: null,
    orders: [],
    loading: true,
    memberInfo: null,
    orderStats: {
      processing: 0,
    },
    userId: 0,
    roles: [],
    roleTexts: [],
    isArtist: false,
    isAdmin: false,
    isStaff: false,
    staffBalance: 0,
    totalBalance: 0,
    hasIncome: false,
    showServiceQrcodeModal: false,
    serviceQrcode: '',
    shouldShowCert: true,
    shouldShowWorkspace: false,
    hasWorkQRCode: false,
    applicationStatus: null,
    applicationTime: '',
    rejectTime: '',
    rejectReason: '',
    applicationId: ''
  },

  onLoad(options) {
    this.loadData()
    this.checkAllIncome()
  },

  onShow() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 [user-center] 页面显示，准备刷新角色数据')
    console.log('  - 时间:', new Date().toLocaleTimeString())
    
    // ✅ 检查刷新标志（UI状态，可保留）
    const needRefresh = wx.getStorageSync('needRefresh')
    if (needRefresh) {
      console.log('⚡ 检测到 needRefresh 标志，强制刷新数据')
      wx.removeStorageSync('needRefresh')
      
      this.setData({ roles: [], roleTexts: [] })
      
      setTimeout(() => {
        this.loadUserRole()
        this.loadData()
        this.loadOrders()
        this.checkAllIncome()
      }, 100)
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return
    }
    
    console.log('🟢 正常进入个人中心')
    
    this.setData({ roles: [], roleTexts: [] })
    
    setTimeout(() => {
      this.loadUserRole()
      this.loadOrders()
      this.checkAllIncome()
    }, 100)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    this.loadUserRole()
    
    try {
      await Promise.all([
        this.loadUserInfo(),
        this.loadOrders(),
        this.checkArtistStatus(),
        this.loadApplicationStatus(),
        this.checkWorkQRCode()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载用户角色（支持多角色）
  async loadUserRole() {
    const userId = app.globalData.userId
    // ✅ userRoles 是UI状态，可保留本地缓存
    let roles = wx.getStorageSync('userRoles')
    
    console.log('🧾 本地读取roles:', roles)
    
    if (typeof roles === 'string') {
      console.warn('⚠️ roles 是字符串，转换为数组:', roles)
      roles = [roles]
    }
    
    if (!roles || roles.length === 0) {
      console.log('⚠️ roles 为空，默认设置为 [customer]')
      roles = ['customer']
    }
    
    try {
      // ✅ 从云端检查申请记录
      const appsRes = await cloudAPI.getArtistApplicationList({ userId })
      const applications = appsRes.success ? (appsRes.data || []) : []
      const userApp = applications.find(app => app.userId === userId && app.status === 'approved' && app.permissionGranted)
      
      if (userApp && !roles.includes('artist')) {
        console.log('✅ 检测到管理员已授权，自动添加 artist 权限')
        console.log('  - 画师编号:', userApp.artistNumber)
        console.log('  - 授权时间:', userApp.permissionGrantedTime)
        
        roles.push('artist')
        wx.setStorageSync('userRoles', roles)
        
        console.log('  - 更新后的roles:', roles)
      }
    } catch (err) {
      console.error('❌ 检查申请记录失败:', err)
    }
    
    console.log('✅ 最终使用的 roles:', roles)
    
    app.globalData.roles = roles
    app.globalData.role = roles[0]
    app.globalData.userId = userId
    
    const roleTexts = roles.map(r => this.getRoleText(r))
    
    try {
      // ✅ 从云端获取申请记录
      const appsRes = await cloudAPI.getArtistApplicationList({ userId })
      const applications = appsRes.success ? (appsRes.data || []) : []
      const userApplications = applications.filter(app => app.userId === userId)
      let applicationApproved = false
      
      if (userApplications.length > 0) {
        userApplications.sort((a, b) => parseDate(b.submitTime) - parseDate(a.submitTime))
        const latestApp = userApplications[0]
        applicationApproved = (latestApp.status === 'approved')
        console.log('📋 最新申请状态:', latestApp.status, '→ applicationApproved:', applicationApproved)
      }
      
      const isArtist = roles.indexOf('artist') !== -1
      const isAdmin = roles.indexOf('admin') !== -1
      const isService = roles.indexOf('service') !== -1
      
      const shouldShowCert = !isArtist && !isAdmin && !applicationApproved
      const hasArtistRole = isArtist || applicationApproved
      const hasServiceRole = isService
      
      console.log('📊 计算UI显示逻辑:')
      console.log('  - isArtist:', isArtist)
      console.log('  - isAdmin:', isAdmin)
      console.log('  - isService:', isService)
      console.log('  - applicationApproved:', applicationApproved)
      console.log('  - shouldShowCert:', shouldShowCert)
      console.log('  - hasArtistRole:', hasArtistRole)
      console.log('  - hasServiceRole:', hasServiceRole)
      
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
    } catch (err) {
      console.error('❌ 加载申请状态失败:', err)
    }
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
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('hasLoggedIn')
      wx.removeStorageSync('isGuestMode')
      
      app.globalData.userInfo = null
      
      console.log('✅ 已清除登录信息')
      
      wx.hideLoading()
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
      
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

  // 修改昵称
  async editNickname() {
    const currentName = this.data.userInfo?.name || ''
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: currentName,
      confirmText: '保存',
      success: async (res) => {
        if (res.confirm) {
          const newName = (res.content || '').trim()
          if (!newName) {
            wx.showToast({
              title: '昵称不能为空',
              icon: 'none'
            })
            return
          }

          const userId = app.globalData.userId
          
          try {
            wx.showLoading({ title: '更新中...' })
            
            // ✅ 调用云端API更新用户信息
            const result = await cloudAPI.updateUserInfo({
              userId: String(userId),
              nickName: newName
            })

            wx.hideLoading()

            if (result.success) {
              // 更新本地显示
              this.setData({
                'userInfo.name': newName
              })

              // 更新全局数据
              if (app.globalData.userInfo) {
                app.globalData.userInfo.nickName = newName
              }

              wx.showToast({
                title: '昵称已更新',
                icon: 'success'
              })
            } else {
              wx.showToast({
                title: result.error || '更新失败',
                icon: 'none'
              })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('❌ 更新昵称失败:', err)
            wx.showToast({
              title: '更新失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 更新用户信息（手动授权）
  async updateUserInfo() {
    const userId = app.globalData.userId
    
    wx.showLoading({ title: '获取授权...' })
    
    try {
      const userInfo = await app.getWxUserInfo()
      
      console.log('✅ 获取到微信用户信息:', {
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      })
      
      // ✅ 调用云端API更新用户信息
      const result = await cloudAPI.updateUserInfo({
        userId: String(userId),
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      })

      if (result.success) {
        // 更新全局数据
        app.globalData.userInfo = userInfo
        
        // 重新加载用户信息
        await this.loadUserInfo()
        
        wx.hideLoading()
        wx.showToast({
          title: '头像和昵称已更新',
          icon: 'success'
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.error || '更新失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('❌ 更新用户信息失败:', error)
      
      // 刷新页面显示
      await this.loadUserInfo()
      
      wx.hideLoading()
      wx.showToast({
        title: '取消授权，信息已保留',
        icon: 'none'
      })
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    console.log('🔄 开始加载用户信息...')
    
    // ✅ userInfo 可以从本地缓存读取（UI优化）
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
    
    const mainRole = this.data.roles.length > 0 ? this.data.roles[0] : 'customer'
    
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKg8L3RleHQ+PC9zdmc+'
    
    const userInfo = {
      openid: app.globalData.openid,
      name: wxUserInfo ? wxUserInfo.nickName : '微信用户',
      avatar: wxUserInfo ? wxUserInfo.avatarUrl : defaultAvatar,
      role: mainRole
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
    const userId = app.globalData.userId
    const storageKey = `processing_count_${userId}`
    // ✅ 订单计数缓存可保留（UI优化）
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

    // ✅ 已废弃：订单计数应从云端实时计算
    // wx.setStorageSync(`processing_count_${userId}`, processingCount)
  },

  // 申请成为画师
  goToArtistCertification() {
    wx.navigateTo({
      url: '/pages/apply/index'
    })
  },

  applyArtist() {
    this.goToArtistCertification()
  },

  // 检查是否已设置工作二维码
  async checkWorkQRCode() {
    const userId = app.globalData.userId
    
    try {
      // ✅ 从云端获取画师档案
      const res = await cloudAPI.getArtistProfile(String(userId))
      const hasQRCode = res.success && res.data && res.data.qrcode
      
      console.log('📱 检查工作二维码:', hasQRCode ? '已设置' : '未设置')
      
      this.setData({
        hasWorkQRCode: hasQRCode
      })
    } catch (err) {
      console.error('❌ 检查工作二维码失败:', err)
      this.setData({
        hasWorkQRCode: false
      })
    }
  },

  // 跳转到上传工作二维码页面
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

  // 检查所有收入（画师+客服+管理员）
  async checkAllIncome() {
    const userId = app.globalData.userId
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
    
    try {
      // ✅ 从云端获取数据
      const [ordersRes, rewardsRes, withdrawsRes] = await Promise.all([
        cloudAPI.getOrderList({ userId }),
        cloudAPI.getRewardList({ userId }),
        cloudAPI.getWithdrawList({ userId })
      ])

      const allOrders = ordersRes.success ? (ordersRes.data || []) : []
      const rewardRecords = rewardsRes.success ? (rewardsRes.data || []) : []
      const withdrawRecords = withdrawsRes.success ? (withdrawsRes.data || []) : []

      console.log('📦 云端数据获取成功:', {
        订单数: allOrders.length,
        打赏数: rewardRecords.length,
        提现数: withdrawRecords.length
      })

      // 计算画师订单稿费
      const PLATFORM_DEDUCTION_PER_ITEM = 5.00
      const myCompletedOrders = allOrders.filter(o => 
        o.status === 'completed' && String(o.artistId || o.artist_id) === userKey
      )
      const orderIncome = myCompletedOrders.reduce((sum, order) => {
        const orderAmount = parseFloat(order.totalPrice || order.total_price || order.price) || 0
        const quantity = parseInt(order.quantity) || 1
        const totalDeduction = PLATFORM_DEDUCTION_PER_ITEM * quantity
        const artistShare = Math.max(0, orderAmount - totalDeduction)
        return sum + artistShare
      }, 0)

      // 计算打赏收入
      const myRewards = rewardRecords.filter(record => {
        if (record.artistId || record.artist_id) {
          return String(record.artistId || record.artist_id) === userKey
        }
        const order = allOrders.find(o => String(o._id || o.id) === String(record.orderId || record.order_id))
        if (!order) return false
        return String(order.artistId || order.artist_id) === userKey
      })
      const rewardIncome = myRewards.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      const artistIncome = orderIncome + rewardIncome

      // TODO: 客服收入和管理员收入需要云端计算
      const csIncome = 0
      const staffIncome = 0

      const totalIncome = artistIncome + csIncome + staffIncome

      // 计算已提现金额
      const withdrawn = withdrawRecords
        .filter(r => String(r.userId || r.user_id) === userKey && (r.status === 'success' || r.status === 'completed'))
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      const availableBalance = Math.max(0, totalIncome - withdrawn)

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💰 收入统计汇总 (user-center - 云端版)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('👤 用户ID:', userKey)
      console.log('📦 订单数:', allOrders.length)
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
        isStaff: staffIncome > 0,
        staffBalance: staffIncome.toFixed(2),
        totalBalance: availableBalance.toFixed(2),
        hasIncome: availableBalance > 0
      })
    } catch (err) {
      console.error('❌ 加载收入数据失败:', err)
      this.setData({
        isStaff: false,
        staffBalance: 0,
        totalBalance: 0,
        hasIncome: false
      })
    }
  },

  // 跳转到提现页面
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

  // 显示平台售后二维码
  async showServiceQrcode() {
    try {
      // ✅ 从云端获取系统设置
      const res = await cloudAPI.getSystemSettings()
      const serviceQrcode = res.success && res.data ? (res.data.serviceQrcode || res.data.service_qrcode || '') : ''
      
      if (!serviceQrcode) {
        wx.showToast({
          title: '售后二维码未配置',
          icon: 'none'
        })
        return
      }
      
      this.setData({
        serviceQrcode: serviceQrcode,
        showServiceQrcodeModal: true
      })
    } catch (err) {
      console.error('❌ 获取售后二维码失败:', err)
      wx.showToast({
        title: '获取失败',
        icon: 'none'
      })
    }
  },

  // 关闭售后二维码弹窗
  closeServiceQrcodeModal() {
    this.setData({
      showServiceQrcodeModal: false
    })
  },

  // 预览二维码
  previewServiceQrcode() {
    wx.previewImage({
      urls: [this.data.serviceQrcode],
      current: this.data.serviceQrcode
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
    const status = e.currentTarget.dataset.status || 'all'
    wx.navigateTo({
      url: `/pages/order-list/index?status=${status}`
    })
  },

  // 跳转到登录页面更新用户信息
  goToLogin() {
    console.log('🔄 跳转到登录页面更新用户信息')
    
    wx.showModal({
      title: '更新用户信息',
      content: '将跳转到登录页面重新获取您的头像和昵称',
      confirmText: '立即更新',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          console.log('✅ 用户确认更新，跳转到登录页')
          
          wx.removeStorageSync('hasLoggedIn')
          
          wx.redirectTo({
            url: '/pages/login/index',
            success: () => {
              console.log('✅ 已跳转到登录页')
            },
            fail: (err) => {
              console.error('❌ 跳转失败:', err)
              wx.showToast({
                title: '跳转失败',
                icon: 'none'
              })
            }
          })
        } else {
          console.log('❌ 用户取消更新')
        }
      }
    })
  },

  // 加载画师申请状态
  async loadApplicationStatus() {
    const userId = this.data.userId
    console.log('🔍 加载用户申请状态, userId:', userId)
    
    try {
      // ✅ 从云端获取申请记录
      const res = await cloudAPI.getArtistApplicationList({ userId })
      const applications = res.success ? (res.data || []) : []
      
      console.log('📦 云端申请记录总数:', applications.length)
      
      const userApplications = applications.filter(app => app.userId === userId)
      console.log('👤 当前用户的申请记录:', userApplications.length)
      
      if (userApplications.length === 0) {
        console.log('ℹ️ 用户未提交过申请')
        this.setData({
          applicationStatus: null
        })
        return
      }
      
      userApplications.sort((a, b) => parseDate(b.submitTime) - parseDate(a.submitTime))
      const latestApplication = userApplications[0]
      
      console.log('📋 最新申请状态:', latestApplication.status)
      
      if (latestApplication.status === 'approved') {
        console.log('✅ 申请已通过，不显示申请卡片')
        this.setData({
          applicationStatus: null
        })
        return
      }
      
      const formatTime = (timeStr) => {
        if (!timeStr) return ''
        const date = parseDate(timeStr)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }
      
      this.setData({
        applicationStatus: latestApplication.status,
        applicationTime: formatTime(latestApplication.submitTime),
        rejectTime: formatTime(latestApplication.rejectTime),
        rejectReason: latestApplication.rejectReason || '未填写驳回原因',
        applicationId: latestApplication._id
      })
      
      console.log('✅ 申请状态加载完成:', {
        status: latestApplication.status,
        time: this.data.applicationTime
      })
    } catch (err) {
      console.error('❌ 加载申请状态失败:', err)
      this.setData({
        applicationStatus: null
      })
    }
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
