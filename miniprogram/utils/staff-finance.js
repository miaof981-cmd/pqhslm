const SAFE_WX = typeof wx !== 'undefined' ? wx : null

const STAFF_LIST_KEY = 'admin_staff_list'
const STAFF_LEDGER_KEY = 'staff_finance_records'

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

function normalizeStaff(staff = {}, previous = {}) {
  const now = new Date().toISOString()
  const normalized = {
    _id: staff._id ? String(staff._id) : (previous._id ? String(previous._id) : ''),
    name: staff.name != null ? String(staff.name).trim() : (previous.name || ''),
    roleType: staff.roleType != null ? String(staff.roleType).trim() : (previous.roleType || ''),
    userId: staff.userId != null ? String(staff.userId).trim() : (previous.userId || ''),
    enableShare: staff.enableShare != null ? !!staff.enableShare : (previous.enableShare !== false),
    shareAmount: toCurrencyNumber(
      staff.shareAmount != null ? staff.shareAmount : previous.shareAmount,
      0
    ),
    description: staff.description != null ? String(staff.description).trim() : (previous.description || ''),
    isActive: staff.isActive != null ? !!staff.isActive : previous.isActive !== false,
    createdAt: previous.createdAt || staff.createdAt || now,
    updatedAt: now
  }

  if (!normalized._id) {
    normalized._id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  return normalized
}

function getStaffList() {
  const list = readStorage(STAFF_LIST_KEY)
  return list.map(item => normalizeStaff(item, item))
}

function saveStaffList(list = []) {
  const normalized = Array.isArray(list) ? list.map((item, index) => normalizeStaff(item, list[index])) : []
  writeStorage(STAFF_LIST_KEY, normalized)
  return normalized
}

function upsertStaff(staff) {
  const list = getStaffList()
  const index = list.findIndex(item => item._id === staff._id)
  const normalized = normalizeStaff(staff, index !== -1 ? list[index] : {})

  if (index === -1) {
    list.push(normalized)
  } else {
    list[index] = normalized
  }

  saveStaffList(list)
  return normalized
}

function removeStaff(staffId) {
  if (!staffId) return
  const list = getStaffList()
  const filtered = list.filter(item => item._id !== staffId)
  if (filtered.length !== list.length) {
    saveStaffList(filtered)
  }
}

function getLedger() {
  return readStorage(STAFF_LEDGER_KEY).map(entry => ({
    ...entry,
    amount: toCurrencyNumber(entry.amount, 0)
  }))
}

function saveLedger(entries = []) {
  writeStorage(STAFF_LEDGER_KEY, entries)
}

function buildLedgerKey(orderId, staffId) {
  return `${orderId || ''}__${staffId || ''}`
}

function recordOrderShare(order) {
  if (!order || !order.id) return

  // 🎯 只有同时满足三个条件才参与分成：
  // 1. isActive = true (在职/启用状态)
  // 2. enableShare = true (开启了订单分成功能)
  // 3. shareAmount > 0 (分成金额大于0)
  const staffList = getStaffList().filter(staff => 
    staff.isActive !== false && 
    staff.enableShare !== false && 
    staff.shareAmount > 0
  )
  
  if (staffList.length === 0) return

  const ledger = getLedger()
  const existingKeys = new Set(ledger.map(entry => buildLedgerKey(entry.orderId, entry.staffId)))

  let changed = false
  const baseTime = new Date().toISOString()
  const orderCompletedAt = order.completedAt || order.completeTime || order.finishTime || baseTime
  const orderNo = order.fullOrderNo || order.orderNumber || order.orderNo || order.id

  staffList.forEach(staff => {
    const key = buildLedgerKey(order.id, staff._id)
    if (existingKeys.has(key)) return

    const amount = toCurrencyNumber(staff.shareAmount, 0)
    if (amount <= 0) return

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderId: order.id,
      orderNo,
      staffId: staff._id,
      staffName: staff.name,
      userId: staff.userId,
      amount,
      type: 'order_share',
      createdAt: baseTime,
      orderCompletedAt,
      note: staff.roleType ? `${staff.roleType}分成` : '订单分成'
    }

    ledger.unshift(entry)
    existingKeys.add(key)
    changed = true
  })

  if (changed) {
    saveLedger(ledger)
    if (SAFE_WX && typeof SAFE_WX.showToast === 'function') {
      // eslint-disable-next-line no-console
      console.log('💰 已记录人员分成', {
        orderId: order.id,
        staffCount: staffList.length
      })
    }
  }
}

function getLedgerByUserId(userId) {
  const ledger = getLedger()
  if (!userId && userId !== 0) return ledger
  const key = String(userId)
  return ledger.filter(entry => entry.userId != null && String(entry.userId) === key)
}

function computeIncomeByUserId(userId) {
  const entries = getLedgerByUserId(userId)
  return entries.reduce((sum, entry) => sum + toCurrencyNumber(entry.amount, 0), 0)
}

module.exports = {
  STAFF_LIST_KEY,
  STAFF_LEDGER_KEY,
  getStaffList,
  saveStaffList,
  upsertStaff,
  removeStaff,
  recordOrderShare,
  getLedger,
  getLedgerByUserId,
  computeIncomeByUserId
}
