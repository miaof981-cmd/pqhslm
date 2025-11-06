/**
 * 客服收入管理工具
 * 处理每单固定¥5的平台费用分配
 * - 客服：¥2
 * - 管理员A（特定角色）：¥2
 * - 管理员B（另一角色）：¥1
 */

const SAFE_WX = typeof wx !== 'undefined' ? wx : null

// 存储键
const SERVICE_INCOME_LEDGER_KEY = 'service_income_records'

// 固定金额配置
const SERVICE_SHARE = 2.00  // 客服固定分成
const ADMIN_A_SHARE = 2.00  // 管理员A分成
const ADMIN_B_SHARE = 1.00  // 管理员B分成
const TOTAL_DEDUCTION = 5.00  // 每单总扣除

function readStorage(key) {
  if (!SAFE_WX || typeof SAFE_WX.getStorageSync !== 'function') return []
  const result = SAFE_WX.getStorageSync(key)
  if (Array.isArray(result)) return result
  if (result && typeof result === 'object') return [result]
  return []
}

function writeStorage(key, value) {
  if (!SAFE_WX || typeof SAFE_WX.setStorageSync !== 'function') return
  SAFE_WX.setStorageSync(key, value)
}

function toCurrencyNumber(value, fallback = 0) {
  const num = parseFloat(value)
  if (Number.isNaN(num)) return fallback
  return Math.round(num * 100) / 100
}

/**
 * 获取客服收入账本
 */
function getLedger() {
  return readStorage(SERVICE_INCOME_LEDGER_KEY).map(entry => ({
    ...entry,
    amount: toCurrencyNumber(entry.amount, 0)
  }))
}

/**
 * 保存客服收入账本
 */
function saveLedger(entries = []) {
  writeStorage(SERVICE_INCOME_LEDGER_KEY, entries)
}

/**
 * 构建账本唯一键
 * @param {string} orderId - 订单ID
 * @param {string} recipientId - 收款人ID（客服ID或管理员ID）
 * @param {string} type - 收入类型
 */
function buildLedgerKey(orderId, recipientId, type) {
  return `${orderId || ''}__${recipientId || ''}__${type || ''}`
}

/**
 * 记录订单收入分配
 * @param {Object} order - 订单对象
 * @param {string} order.id - 订单ID
 * @param {string} order.serviceId - 客服ID
 * @param {string} order.serviceName - 客服姓名
 */
function recordOrderIncome(order) {
  if (!order || !order.id) {
    console.warn('❌ 订单信息无效，无法记录收入')
    return
  }

  // 检查订单价格是否足够扣除
  const orderPrice = toCurrencyNumber(order.price || order.finalPrice || order.totalPrice, 0)
  if (orderPrice < TOTAL_DEDUCTION) {
    console.warn(`❌ 订单价格 ¥${orderPrice} 低于最低扣除 ¥${TOTAL_DEDUCTION}`)
    return
  }

  const ledger = getLedger()
  const existingKeys = new Set(ledger.map(entry => 
    buildLedgerKey(entry.orderId, entry.recipientId, entry.incomeType)
  ))

  let changed = false
  const baseTime = new Date().toISOString()
  const orderCompletedAt = order.completedAt || order.completeTime || order.finishTime || baseTime
  const orderNo = order.fullOrderNo || order.orderNumber || order.orderNo || order.id

  // 1. 记录客服收入
  if (order.serviceId) {
    const key = buildLedgerKey(order.id, order.serviceId, 'service')
    if (!existingKeys.has(key)) {
      const entry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        orderId: order.id,
        orderNo,
        recipientId: order.serviceId,
        recipientName: order.serviceName || '客服',
        recipientType: 'service',
        userId: order.serviceId,  // 用于关联登录用户
        amount: SERVICE_SHARE,
        incomeType: 'service',
        createdAt: baseTime,
        orderCompletedAt,
        note: '客服订单分成'
      }
      ledger.unshift(entry)
      existingKeys.add(key)
      changed = true
      console.log(`💰 已记录客服收入: ${order.serviceName} +¥${SERVICE_SHARE}`)
    }
  }

  // 2. 记录管理员收入（从 staff-finance 中获取启用分成的管理员）
  try {
    const staffFinance = require('./staff-finance.js')
    const staffList = staffFinance.getStaffList().filter(staff => 
      staff.isActive !== false && 
      staff.enableShare !== false && 
      staff.shareAmount > 0
    )

    // 按 shareAmount 排序，分成金额高的优先（管理员A: ¥2, 管理员B: ¥1）
    staffList.sort((a, b) => (b.shareAmount || 0) - (a.shareAmount || 0))

    // 为每个管理员记录收入
    staffList.forEach(staff => {
      const key = buildLedgerKey(order.id, staff._id, 'admin_share')
      if (existingKeys.has(key)) return

      const amount = toCurrencyNumber(staff.shareAmount, 0)
      if (amount <= 0) return

      const entry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        orderId: order.id,
        orderNo,
        recipientId: staff._id,
        recipientName: staff.name,
        recipientType: 'admin',
        userId: staff.userId,
        amount,
        incomeType: 'admin_share',
        roleType: staff.roleType || '管理员',
        createdAt: baseTime,
        orderCompletedAt,
        note: `${staff.roleType || '管理员'}分成`
      }
      ledger.unshift(entry)
      existingKeys.add(key)
      changed = true
      console.log(`💰 已记录管理员收入: ${staff.name} (${staff.roleType || '管理员'}) +¥${amount}`)
    })

  } catch (error) {
    console.error('获取管理员列表失败', error)
  }

  if (changed) {
    saveLedger(ledger)
    if (SAFE_WX && typeof SAFE_WX.showToast === 'function') {
      console.log('💰 订单收入分配完成', {
        orderId: order.id,
        totalDeduction: TOTAL_DEDUCTION
      })
    }
  }
}

/**
 * 根据用户ID获取收入记录
 * @param {string|number} userId - 用户ID
 */
function getLedgerByUserId(userId) {
  const ledger = getLedger()
  if (!userId && userId !== 0) return ledger
  const key = String(userId)
  return ledger.filter(entry => entry.userId != null && String(entry.userId) === key)
}

/**
 * 计算用户总收入
 * @param {string|number} userId - 用户ID
 * @param {string} [type] - 可选，收入类型筛选 ('service' 或 'admin_share')
 */
function computeIncomeByUserId(userId, type = null) {
  let entries = getLedgerByUserId(userId)
  if (type) {
    entries = entries.filter(entry => entry.incomeType === type)
  }
  return entries.reduce((sum, entry) => sum + toCurrencyNumber(entry.amount, 0), 0)
}

/**
 * 获取用户的收入统计（按类型分组）
 * @param {string|number} userId - 用户ID
 */
function getIncomeSummaryByUserId(userId) {
  const entries = getLedgerByUserId(userId)
  
  const summary = {
    service: 0,    // 客服收入
    adminShare: 0, // 管理员分成
    total: 0       // 总收入
  }

  entries.forEach(entry => {
    const amount = toCurrencyNumber(entry.amount, 0)
    if (entry.incomeType === 'service') {
      summary.service += amount
    } else if (entry.incomeType === 'admin_share') {
      summary.adminShare += amount
    }
    summary.total += amount
  })

  return summary
}

module.exports = {
  SERVICE_INCOME_LEDGER_KEY,
  SERVICE_SHARE,
  ADMIN_A_SHARE,
  ADMIN_B_SHARE,
  TOTAL_DEDUCTION,
  getLedger,
  recordOrderIncome,
  getLedgerByUserId,
  computeIncomeByUserId,
  getIncomeSummaryByUserId
}

