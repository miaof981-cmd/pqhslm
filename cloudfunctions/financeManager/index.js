// 云函数：financeManager - 财务管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 财务管理云函数
 * 支持操作：getIncome, createWithdraw, getWithdrawList, approveWithdraw, rejectWithdraw, getRewardList
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'getIncome':
        return await getIncome(openid, event)
      case 'createWithdraw':
        return await createWithdraw(openid, event)
      case 'getWithdrawList':
        return await getWithdrawList(openid, event)
      case 'approveWithdraw':
        return await approveWithdraw(openid, event)
      case 'rejectWithdraw':
        return await rejectWithdraw(openid, event)
      case 'getRewardList':
        return await getRewardList(openid, event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('财务管理错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 获取收入明细
 */
async function getIncome(openid, event) {
  const { userId, page = 1, pageSize = 10 } = event

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const currentUserId = userRes.data[0].userId

  // 检查管理员权限（查询其他用户）
  if (userId && userId !== currentUserId) {
    const adminRes = await db.collection('system_admin')
      .where({ _openid: openid, isAdmin: true })
      .get()

    if (adminRes.data.length === 0) {
      return { success: false, message: '无权限查询' }
    }
  }

  const targetUserId = userId || currentUserId

  // 查询收入记录
  const query = db.collection('income_ledger')
    .where({ userId: targetUserId })

  const countRes = await query.count()
  const total = countRes.total

  const res = await query
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 计算总收入
  const allIncomeRes = await db.collection('income_ledger')
    .where({ userId: targetUserId })
    .get()

  const totalIncome = allIncomeRes.data.reduce((sum, item) => {
    return sum + (item.amount || 0)
  }, 0)

  return {
    success: true,
    data: {
      list: res.data,
      total,
      totalIncome,
      page,
      pageSize
    }
  }
}

/**
 * 创建提现申请
 */
async function createWithdraw(openid, event) {
  const { amount, accountInfo } = event

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const user = userRes.data[0]

  // 检查余额
  const incomeRes = await db.collection('income_ledger')
    .where({ userId: user.userId })
    .get()

  const totalIncome = incomeRes.data.reduce((sum, item) => sum + (item.amount || 0), 0)

  const withdrawRes = await db.collection('withdraw_records')
    .where({ userId: user.userId, status: 'approved' })
    .get()

  const totalWithdrawn = withdrawRes.data.reduce((sum, item) => sum + (item.amount || 0), 0)

  const balance = totalIncome - totalWithdrawn

  if (balance < amount) {
    return { success: false, message: '余额不足' }
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // 创建提现记录
  const withdraw = {
    userId: user.userId,
    userName: user.nickName,
    amount: parseFloat(amount),
    accountInfo: accountInfo || {},
    status: 'pending',
    createdAt: now,
    updatedAt: now
  }

  await db.collection('withdraw_records').add({
    data: withdraw
  })

  return {
    success: true,
    message: '提现申请已提交'
  }
}

/**
 * 获取提现列表
 */
async function getWithdrawList(openid, event) {
  const { page = 1, pageSize = 10, userId, status } = event

  // 获取当前用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const currentUserId = userRes.data[0].userId

  // 检查权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()
  const isAdmin = adminRes.data.length > 0

  let query = db.collection('withdraw_records')
  const where = {}

  // 非管理员只能查看自己的
  if (!isAdmin) {
    where.userId = currentUserId
  } else if (userId) {
    where.userId = userId
  }

  if (status) {
    where.status = status
  }

  if (Object.keys(where).length > 0) {
    query = query.where(where)
  }

  const countRes = await query.count()
  const total = countRes.total

  const res = await query
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: res.data,
      total,
      page,
      pageSize
    }
  }
}

/**
 * 批准提现（仅管理员）
 */
async function approveWithdraw(openid, event) {
  const { withdrawId } = event

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可操作' }
  }

  const res = await db.collection('withdraw_records')
    .doc(withdrawId)
    .update({
      data: {
        status: 'approved',
        approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

  if (res.stats.updated === 0) {
    return { success: false, message: '更新失败' }
  }

  return {
    success: true,
    message: '提现已批准'
  }
}

/**
 * 拒绝提现（仅管理员）
 */
async function rejectWithdraw(openid, event) {
  const { withdrawId, reason } = event

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可操作' }
  }

  const res = await db.collection('withdraw_records')
    .doc(withdrawId)
    .update({
      data: {
        status: 'rejected',
        rejectReason: reason || '',
        rejectedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

  if (res.stats.updated === 0) {
    return { success: false, message: '更新失败' }
  }

  return {
    success: true,
    message: '提现已拒绝'
  }
}

/**
 * 获取打赏记录
 */
async function getRewardList(openid, event) {
  const { page = 1, pageSize = 10, userId } = event

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const currentUserId = userRes.data[0].userId

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()
  const isAdmin = adminRes.data.length > 0

  let query = db.collection('reward_records')
  const where = {}

  // 非管理员只能查看自己相关的
  if (!isAdmin) {
    where[_.or] = [
      { fromUserId: currentUserId },
      { toUserId: currentUserId }
    ]
  } else if (userId) {
    where[_.or] = [
      { fromUserId: userId },
      { toUserId: userId }
    ]
  }

  if (Object.keys(where).length > 0) {
    query = query.where(where)
  }

  const countRes = await query.count()
  const total = countRes.total

  const res = await query
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: res.data,
      total,
      page,
      pageSize
    }
  }
}

