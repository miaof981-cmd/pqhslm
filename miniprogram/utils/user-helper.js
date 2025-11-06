const { createLogger } = require('./logger')

const logger = createLogger('user-helper')

/**
 * 👤 用户身份管理工具
 *
 * 功能：
 * 1. 统一 userId 获取逻辑
 * 2. 强制登录校验
 * 3. 异常日志上报
 * 4. 多设备同步支持
 *
 * 作者：AI Assistant
 * 日期：2025-10-28
 */

/**
 * 🔧 统一异常上报点
 * @param {string} msg - 错误信息
 * @param {object} extra - 额外信息
 */
function logUserError(msg, extra = {}) {
  logger.warn(msg, extra)
  
  // TODO: 接入监控平台（sentry / 腾讯云监控）
  // if (typeof wx.reportMonitor === 'function') {
  //   wx.reportMonitor('user_id_error', { msg, ...extra })
  // }
}

/**
 * ✅ 获取当前用户ID（带兜底逻辑）
 * 
 * 优先级：
 * 1. localStorage.userId
 * 2. app.globalData.userId
 * 3. 返回 null（不自动创建游客ID）
 * 
 * @returns {string|null} userId
 */
function getCurrentUserId() {
  // 1. 尝试从 localStorage 获取
  let userId = wx.getStorageSync('userId')
  
  if (userId) {
    return userId
  }
  
  // 2. 尝试从全局变量获取
  try {
    const app = getApp()
    userId = app?.globalData?.userId
    
    if (userId) {
      // 如果全局变量有但本地没有，同步到本地
      wx.setStorageSync('userId', userId)
      logger.info('从全局变量同步 userId 到本地', userId)
      return userId
    }
  } catch (e) {
    logUserError('getApp() 失败，可能应用尚未初始化', { error: e.message })
  }
  
  // 3. 如果还是没有，记录警告并返回 null
  logUserError('无法获取 userId，用户可能未登录')
  return null
}

/**
 * ⚠️ 确保用户已登录（强制校验）
 * 
 * 用于订单创建等关键流程，如果没有 userId 会阻止操作并引导登录
 * 
 * @param {object} options - 配置项
 * @param {string} options.title - 提示标题
 * @param {string} options.content - 提示内容
 * @param {string} options.redirectUrl - 登录后跳转的页面（可选）
 * @returns {Promise<string>} userId
 */
function ensureUserLogin(options = {}) {
  const {
    title = '需要登录',
    content = '请先登录后继续',
    redirectUrl = '/pages/user-center/index'
  } = options
  
  return new Promise((resolve, reject) => {
    const userId = getCurrentUserId()
    
    if (userId) {
      resolve(userId)
    } else {
      logUserError('用户未登录，阻止操作')
      
      wx.showModal({
        title: title,
        content: content,
        showCancel: false,
        confirmText: '去登录',
        success: () => {
          // ✅ 使用 navigateTo 而非 reLaunch，保留页面栈更平滑
          wx.navigateTo({
            url: redirectUrl,
            fail: () => {
              // 如果 navigateTo 失败（可能因为页面栈满），使用 redirectTo
              wx.redirectTo({
                url: redirectUrl,
                fail: () => {
                  // 最后的兜底方案
                  wx.reLaunch({ url: redirectUrl })
                }
              })
            }
          })
          reject(new Error('用户未登录'))
        }
      })
    }
  })
}

/**
 * 🎯 创建订单时的 userId 兜底获取
 * 
 * 多层兜底策略：
 * 1. 传入的 userId
 * 2. localStorage.userId
 * 3. app.globalData.userId
 * 4. 生成游客ID（最后的兜底）
 * 
 * @param {string} userId - 传入的 userId
 * @returns {object} { userId, isGuest }
 */
function getOrCreateUserId(userId) {
  // 1. 如果传入了有效的 userId，直接使用
  if (userId && userId !== 'undefined' && userId !== 'null') {
    return { userId, isGuest: false }
  }
  
  // 2. 尝试从 getCurrentUserId 获取
  userId = getCurrentUserId()
  if (userId) {
    return { userId, isGuest: false }
  }
  
  // 3. 最后的兜底：生成游客ID
  const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  
  logUserError('无法获取 userId，使用游客 ID', { guestId })
  
  // 记录游客订单以便后续追踪
  const guestOrders = wx.getStorageSync('guest_orders') || []
  guestOrders.push({
    guestId: guestId,
    timestamp: new Date().toISOString(),
    deviceInfo: wx.getSystemInfoSync()
  })
  wx.setStorageSync('guest_orders', guestOrders)
  
  return { userId: guestId, isGuest: true }
}

/**
 * 🔄 检查并同步用户信息
 * 
 * 用于应用启动时，确保 userId 在多设备/多次启动间的一致性
 * 
 * @returns {Promise<string|null>} userId
 */
async function syncUserInfo() {
  logger.info('开始同步用户信息...')
  
  try {
    const userId = getCurrentUserId()
    
    if (!userId) {
      logger.info('本地无 userId，需要用户登录')
      return null
    }
    
    // TODO: 如果有云端用户系统，可在此处从云端拉取最新用户信息
    // const userInfo = await wx.cloud.callFunction({
    //   name: 'getUserInfo',
    //   data: { userId }
    // })
    
    // 同步到全局变量
    const app = getApp()
    if (app) {
      app.globalData.userId = userId
      logger.info('已同步 userId 到全局变量')
    }
    
    return userId
  } catch (e) {
    logUserError('同步用户信息失败', { error: e.message })
    return null
  }
}

/**
 * 🧹 清理游客订单（用户登录后调用）
 * 
 * 将游客订单迁移到正式用户账号下
 * 
 * @param {string} userId - 正式用户ID
 */
function migrateGuestOrders(userId) {
  const guestOrders = wx.getStorageSync('guest_orders') || []
  
  if (guestOrders.length === 0) {
    logger.info('无游客订单需要迁移')
    return
  }
  
  logger.info(`发现 ${guestOrders.length} 个游客订单，开始迁移...`)
  
  // 读取所有订单
  const orders = wx.getStorageSync('orders') || []
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  
  let migratedCount = 0
  
  // 迁移 orders
  const updatedOrders = orders.map(order => {
    if (order.buyerId && order.buyerId.startsWith('guest_')) {
      migratedCount++
      return { ...order, buyerId: userId }
    }
    return order
  })
  
  // 迁移 pending_orders
  const updatedPendingOrders = pendingOrders.map(order => {
    if (order.buyerId && order.buyerId.startsWith('guest_')) {
      migratedCount++
      return { ...order, buyerId: userId }
    }
    return order
  })
  
  // 保存
  wx.setStorageSync('orders', updatedOrders)
  wx.setStorageSync('pending_orders', updatedPendingOrders)
  
  // 清空游客记录
  wx.removeStorageSync('guest_orders')
  
  logger.info(`成功迁移 ${migratedCount} 个游客订单`)
  
  wx.showToast({
    title: `已关联${migratedCount}个订单`,
    icon: 'success'
  })
}

/**
 * 🔍 启动时检查并修复历史订单的 buyerId
 * 
 * 在应用启动时自动执行，修复所有 buyerId 缺失的订单
 */
function fixHistoricalOrders() {
  logger.info('开始检查历史订单数据完整性...')
  
  const userId = getCurrentUserId()
  if (!userId) {
    logger.info('用户未登录，跳过历史订单修复')
    return
  }
  
  const orders = wx.getStorageSync('orders') || []
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  
  let fixedCount = 0
  
  const needsFix = (order) => {
    if (!order) return false
    const buyerKey = order.buyerId != null ? String(order.buyerId).trim() : ''
    if (!buyerKey || buyerKey === 'undefined' || buyerKey === 'null') return true
    if (buyerKey.startsWith('guest_')) return true
    return false
  }

  const normalizeBuyer = (order) => {
    if (!order) return order
    const patched = { ...order }

    if (needsFix(patched)) {
      fixedCount++
      logger.debug(`修复订单 ${patched.id} 的 buyerId`, { oldBuyerId: patched.buyerId, newBuyerId: userId })
      patched.buyerId = userId
    }

    if (!patched.buyerName) {
      patched.buyerName = currentUser?.nickName || `用户_${String(userId).slice(-4)}`
    }

    if (!patched.buyerAvatar || patched.buyerAvatar === 'undefined' || patched.buyerAvatar.startsWith('http://tmp/')) {
      patched.buyerAvatar = currentUser?.avatarUrl || ''
    }

    return patched
  }

  const fixedOrders = orders.map(normalizeBuyer)
  const fixedPendingOrders = pendingOrders.map(normalizeBuyer)
  
  if (fixedCount > 0) {
    wx.setStorageSync('orders', fixedOrders)
    wx.setStorageSync('pending_orders', fixedPendingOrders)
    logger.info(`成功修复 ${fixedCount} 个历史订单的 buyerId`)
  } else {
    logger.info('历史订单数据完整，无需修复')
  }
}

module.exports = {
  getCurrentUserId,
  ensureUserLogin,
  getOrCreateUserId,
  syncUserInfo,
  migrateGuestOrders,
  fixHistoricalOrders,
  logUserError
}
