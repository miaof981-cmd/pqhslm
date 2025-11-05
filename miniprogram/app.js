App({
  globalData: {
    userInfo: null,
    userId: 0,        // 自增用户ID
    openid: '',       // 微信openid（内部使用）
    role: 'customer', // customer, artist, admin
    userProfile: null
  },

  onLaunch() {
    // ✅ 新增：临时修复逻辑 - 强制恢复ID为1001
    const savedId = wx.getStorageSync('userId')
    if (savedId && savedId !== 1001) {
      console.log('⚙️ 检测到ID异常，强制恢复为1001')
      console.log('  - 当前ID:', savedId)
      wx.setStorageSync('userId', 1001)
      wx.setStorageSync('maxUserId', 1001)
      this.globalData.userId = 1001
    } else if (!savedId) {
      console.log('🆕 未检测到ID，生成默认1001')
      wx.setStorageSync('userId', 1001)
      wx.setStorageSync('maxUserId', 1001)
      this.globalData.userId = 1001
    }
    
    // 初始化用户信息
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
    
    // ✅ 启动时修复订单中的头像数据
    this.migrateOrderAvatars()
    
    // ✅ 新增：检查画师申请状态，自动赋予权限
    this.checkArtistApplication()
    
    // 检查登录状态
    this.checkLoginStatus()
  },

  // 初始化用户信息
  initUserInfo() {
    // 检查本地存储是否有用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const resetFlag = wx.getStorageSync('resetUserId')  // ✅ 新增：重置标志
    let userId = wx.getStorageSync('userId')
    let openid = wx.getStorageSync('openid')
    
    // ✅ 修改：增加重置逻辑
    if (userId && openid && !resetFlag) {
      // 已有基础信息，继续使用
      this.globalData.userId = userId
      this.globalData.openid = openid
      
      if (userInfo) {
        this.globalData.userInfo = userInfo
        console.log('✅ 用户信息已加载')
        console.log('  - 来源: 本地缓存')
        console.log('  - 用户ID:', userId)
        console.log('  - 昵称:', userInfo.nickName)
      } else {
        console.log('✅ 用户ID已加载:', userId, '(来源: 本地缓存)')
      }
    } else {
      // 没有用户信息，或者需要重置，生成新的自增ID
      const newUserId = this.generateNewUserId()
      const newOpenid = `openid-${newUserId}-${Date.now()}`
      
      this.globalData.userId = newUserId
      this.globalData.openid = newOpenid
      
      wx.setStorageSync('userId', newUserId)
      wx.setStorageSync('openid', newOpenid)
      
      // ✅ 清除重置标志
      if (resetFlag) {
        wx.removeStorageSync('resetUserId')
        console.log('🔄 用户ID已重置')
      }
      
      console.log('🆕 生成新用户ID')
      console.log('  - 来源:', resetFlag ? '手动重置' : '首次创建')
      console.log('  - 新ID:', newUserId)
    }
  },

  // 生成新的自增用户ID
  generateNewUserId() {
    // 获取当前最大的用户ID
    let maxUserId = wx.getStorageSync('maxUserId') || 1000
    
    // 新用户ID = 最大ID + 1
    const newUserId = maxUserId + 1
    
    // 保存新的最大ID
    wx.setStorageSync('maxUserId', newUserId)
    
    console.log('📊 ID生成逻辑:')
    console.log('  - 当前最大ID:', maxUserId)
    console.log('  - 新用户ID:', newUserId)
    console.log('  - 已更新maxUserId为:', newUserId)
    
    return newUserId
  },

  // 重置用户ID（开发调试用）
  resetUserId() {
    console.log('⚠️ 准备重置用户ID...')
    
    // 设置重置标志
    wx.setStorageSync('resetUserId', true)
    
    // 清除当前用户数据
    wx.removeStorageSync('userId')
    wx.removeStorageSync('openid')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('hasLoggedIn')
    
    console.log('✅ 用户数据已清除，下次启动将生成新ID')
    
    // 重新启动小程序
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
      const { DEFAULT_AVATAR_DATA } = require('./utils/constants.js')
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

          const currentArtistAvatar = normalizeAvatar(order.artistAvatar)
          if (!currentArtistAvatar) {
            const candidate = product ? normalizeAvatar(product.artistAvatar) : ''
            const finalAvatar = candidate || DEFAULT_AVATAR_DATA
            if (finalAvatar !== order.artistAvatar) {
              nextOrder = { ...nextOrder, artistAvatar: finalAvatar }
              modified = true
            }
          } else if (currentArtistAvatar !== order.artistAvatar) {
            nextOrder = { ...nextOrder, artistAvatar: currentArtistAvatar }
            modified = true
          }

          const currentServiceAvatar = normalizeAvatar(order.serviceAvatar)
          if (!currentServiceAvatar) {
            const serviceCandidate = service ? normalizeAvatar(service.avatar || service.avatarUrl) : ''
            const finalServiceAvatar = serviceCandidate || DEFAULT_AVATAR_DATA
            if (finalServiceAvatar !== order.serviceAvatar) {
              nextOrder = { ...nextOrder, serviceAvatar: finalServiceAvatar }
              modified = true
            }
          } else if (currentServiceAvatar !== order.serviceAvatar) {
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
