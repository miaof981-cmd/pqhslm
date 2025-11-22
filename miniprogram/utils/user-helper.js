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
  // ✅ 统一从 app.globalData 获取
  try {
    const app = getApp()
    const userId = app?.globalData?.userId
    
    if (userId) {
      return userId
    }
  } catch (e) {
    logUserError('getApp() 失败，可能应用尚未初始化', { error: e.message })
  }
  
  // 如果没有，记录警告并返回 null
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
  
  // ✅ 已废弃：游客订单应通过云函数记录
  // 记录游客订单以便后续追踪
  const guestOrders = []
  guestOrders.push({
    guestId: guestId,
    timestamp: new Date().toISOString(),
    deviceInfo: wx.getSystemInfoSync()
  })
  // ✅ 不再保存到本地
  
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
  // ✅ 已废弃：游客订单迁移应通过云函数处理
  logger.info('[DEPRECATED] migrateGuestOrders 已废弃，应调用云函数处理')
  
  wx.showToast({
    title: '游客订单迁移功能已迁移到云端',
    icon: 'none'
  })
}

/**
 * 🔍 启动时检查并修复历史订单的 buyerId
 * 
 * 在应用启动时自动执行，修复所有 buyerId 缺失的订单
 */
function fixHistoricalOrders() {
  // ✅ 已废弃：历史订单修复应通过云函数处理
  logger.info('[DEPRECATED] fixHistoricalOrders 已废弃，订单数据应从云端读取')
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
