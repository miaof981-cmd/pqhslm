// ✅ 引入全局错误处理模块
const { globalErrorHandler } = require('./utils/global-error-handler.js')

App({
  globalData: {
    userInfo: null,
    userId: 0,        // 自增用户ID
    openid: '',       // 微信openid（内部使用）
    role: 'customer', // customer, artist, admin
    userProfile: null,
    errorHandler: globalErrorHandler // 暴露错误处理器
  },

  onLaunch() {
    // ✅ 初始化全局错误捕获
    globalErrorHandler.init()
    console.log('🛡️ 全局错误捕获已启动')
    
    // ✅ 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-2gca1h9d11f4d9d2',
        traceUser: true
      })
      console.log('☁️ 云开发已初始化')
    }
    
    // 初始化用户信息（包含自增ID、openid、缓存用户信息）
    this.initUserInfo()

    // ✅ 引入用户助手模块
    const userHelper = require('./utils/user-helper.js')
    
    // ✅ 启动时检查并同步用户信息
    userHelper.syncUserInfo().then(userId => {
      if (userId) {
        console.log('[app] ✅ 用户信息同步完成:', userId)
        
        // ✅ 修复历史订单的 buyerId（如果有缺失）
        userHelper.fixHistoricalOrders()
      }
    }).catch(err => {
      console.log('[app] ⚠️ 用户信息同步失败:', err)
    })
    
    // ✅ 启动时修复订单中的头像数据（仅首次执行）
    const migrated = wx.getStorageSync('avatar_migrated_v2')
    if (!migrated) {
      this.migrateOrderAvatars()
      wx.setStorageSync('avatar_migrated_v2', true)
    }
    
    // ✅ 新增：检查画师申请状态，自动赋予权限
    this.checkArtistApplication()
    
    // 检查登录状态
    this.checkLoginStatus()
  },

  // 初始化用户信息
  initUserInfo() {
    const resetFlag = wx.getStorageSync('resetUserId')

    if (resetFlag) {
      wx.removeStorageSync('userId')
      wx.removeStorageSync('openid')
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('hasLoggedIn')
      wx.removeStorageSync('isGuestMode')
      wx.removeStorageSync('resetUserId')
      console.log('🔄 检测到重置标志，已清空旧用户信息')
    }

    const userId = this.ensureUserId()
    this.globalData.userId = userId

    let openid = wx.getStorageSync('openid')
    if (!openid) {
      openid = `openid-${userId}-${Date.now()}`
      wx.setStorageSync('openid', openid)
    }
    this.globalData.openid = openid

    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      console.log('✅ 用户信息已加载', { userId, nickName: userInfo.nickName })
    } else {
      console.log('✅ 用户ID已加载:', userId)
    }
  },

  ensureUserId() {
    const STORAGE_KEY = 'userId'
    const COUNTER_KEY = 'userId_counter'

    let existing = wx.getStorageSync(STORAGE_KEY)
    if (existing) {
      // 🎯 统一转换为string类型
      const userId = String(existing)
      this.globalData.userId = userId
      return userId
    }

    let counter = Number(wx.getStorageSync(COUNTER_KEY))
    if (!counter || counter < 1000) {
      counter = 1000
    }

    counter += 1
    wx.setStorageSync(COUNTER_KEY, counter)
    // 🎯 统一存储为string类型
    const userId = String(counter)
    wx.setStorageSync(STORAGE_KEY, userId)

    this.globalData.userId = userId
    console.log('🆕 生成新用户ID', userId)

    return userId
  },

  // 重置用户ID（开发调试用）
  resetUserId() {
    console.log('⚠️ 准备重置用户ID...')
    
    wx.removeStorageSync('userId')
    wx.removeStorageSync('openid')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('hasLoggedIn')
    wx.removeStorageSync('isGuestMode')

    const newUserId = this.ensureUserId()
    const newOpenid = `openid-${newUserId}-${Date.now()}`
    wx.setStorageSync('openid', newOpenid)

    this.globalData.userId = newUserId
    this.globalData.openid = newOpenid
    this.globalData.userInfo = null

    console.log('✅ 已生成新用户ID:', newUserId)

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

  migrateOrderAvatars() {
    try {
      const toKey = (value) => {
        if (value === undefined || value === null) return ''
        return String(value).trim()
      }
      const normalizeAvatar = (value) => {
        const avatar = toKey(value)
        if (!avatar) return ''
        const lower = avatar.toLowerCase()
        if (avatar.startsWith('http://tmp/') || avatar.startsWith('wxfile://') || avatar.startsWith('/assets/')) {
          return ''
        }
        if (lower === 'undefined' || lower === 'null') return ''
        return avatar
      }

      const products = wx.getStorageSync('mock_products') || []
      const productMap = new Map()
      products.forEach(product => {
        const key = toKey(product && product.id)
        if (key) {
          productMap.set(key, product)
        }
      })

      const services = wx.getStorageSync('customer_service_list') || []
      const serviceMap = new Map()
      services.forEach(service => {
        if (!service) return
        const idKey = toKey(service.id)
        const userKey = toKey(service.userId)
        if (idKey) serviceMap.set(idKey, service)
        if (userKey) serviceMap.set(userKey, service)
      })

      const normalizeOrderList = (orders = []) => {
        let changed = 0
        const updated = orders.map(order => {
          if (!order) return order

          let nextOrder = order
          let modified = false

          const product = productMap.get(toKey(order.productId))
          const service = serviceMap.get(toKey(order.serviceId))

          // 🎯 只清理无效路径，不写默认头像（让 WXML 兜底）
          const currentArtistAvatar = normalizeAvatar(order.artistAvatar)
          if (!currentArtistAvatar && order.artistAvatar) {
            // 有值但无效，从商品表补充
            const candidate = product ? normalizeAvatar(product.artistAvatar) : ''
            if (candidate && candidate !== order.artistAvatar) {
              nextOrder = { ...nextOrder, artistAvatar: candidate }
              modified = true
            } else if (!candidate) {
              // 商品表也没有，清空让 WXML 兜底
              nextOrder = { ...nextOrder, artistAvatar: '' }
              modified = true
            }
          } else if (currentArtistAvatar && currentArtistAvatar !== order.artistAvatar) {
            nextOrder = { ...nextOrder, artistAvatar: currentArtistAvatar }
            modified = true
          }

          // 🎯 只清理无效路径，不写默认头像（让 WXML 兜底）
          const currentServiceAvatar = normalizeAvatar(order.serviceAvatar)
          if (!currentServiceAvatar && order.serviceAvatar) {
            // 有值但无效，从客服表补充
            const serviceCandidate = service ? normalizeAvatar(service.avatar || service.avatarUrl) : ''
            if (serviceCandidate && serviceCandidate !== order.serviceAvatar) {
              nextOrder = { ...nextOrder, serviceAvatar: serviceCandidate }
              modified = true
            } else if (!serviceCandidate) {
              // 客服表也没有，清空让 WXML 兜底
              nextOrder = { ...nextOrder, serviceAvatar: '' }
              modified = true
            }
          } else if (currentServiceAvatar && currentServiceAvatar !== order.serviceAvatar) {
            nextOrder = { ...nextOrder, serviceAvatar: currentServiceAvatar }
            modified = true
          }

          if (!toKey(order.serviceName) && service && toKey(service.name || service.nickName)) {
            nextOrder = { ...nextOrder, serviceName: toKey(service.name || service.nickName) }
            modified = true
          }

          if (modified) {
            changed += 1
          }

          return nextOrder
        })
        return { updated, changed }
      }

      const pendingResult = normalizeOrderList(wx.getStorageSync('pending_orders') || [])
      if (pendingResult.changed > 0) {
        wx.setStorageSync('pending_orders', pendingResult.updated)
      }

      const ordersResult = normalizeOrderList(wx.getStorageSync('orders') || [])
      if (ordersResult.changed > 0) {
        wx.setStorageSync('orders', ordersResult.updated)
      }

      const completedResult = normalizeOrderList(wx.getStorageSync('completed_orders') || [])
      if (completedResult.changed > 0) {
        wx.setStorageSync('completed_orders', completedResult.updated)
      }

      if (pendingResult.changed || ordersResult.changed || completedResult.changed) {
        console.log('[app][migrate] 订单头像已同步修复', {
          pending: pendingResult.changed,
          orders: ordersResult.changed,
          completed: completedResult.changed
        })
      } else {
        console.log('[app][migrate] 订单头像无需修复')
      }
    } catch (error) {
      console.error('[app][migrate] 订单头像修复失败', error)
    }
  },
  
  // 检查是否有任一权限
  hasAnyRole(roles) {
    const userRoles = wx.getStorageSync('userRoles') || ['customer']
    return roles.some(role => userRoles.includes(role))
  },
  
  // 获取用户所有角色
  getUserRoles() {
    return wx.getStorageSync('userRoles') || ['customer']
  },

  // ✅ 检查画师申请状态（仅用于显示，不自动赋权）
  checkArtistApplication() {
    const userId = this.globalData.userId || wx.getStorageSync('userId')
    if (!userId) return

    console.log('🎨 检查画师申请状态...')

    // 读取所有申请记录
    const allApplications = wx.getStorageSync('artist_applications') || []
    
    // 查找当前用户的申请
    const userApplications = allApplications.filter(app => app.userId === userId)
    
    if (userApplications.length > 0) {
      // 按时间排序，取最新的
      userApplications.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
      const latestApp = userApplications[0]
      
      console.log('  - 最新申请状态:', latestApp.status)
      
      // ⚠️ 注意：申请通过后，需要管理员在后台手动开启权限
      // 不再自动添加画师权限，避免未完成档案建立就获得权限
      if (latestApp.status === 'approved') {
        console.log('  ℹ️ 申请已通过，等待管理员开启权限')
      }
    } else {
      console.log('  - 无申请记录')
    }
  }
})
