// 云函数：artistManager - 画师申请管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 画师申请管理云函数
 * 支持操作：apply, getStatus, approve, reject, getList, 
 *          createProfile, getProfile, updateProfile, 
 *          uploadQRCode, getQRCode, deleteQRCode
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      // 申请相关
      case 'apply':
        return await applyArtist(openid, event)
      case 'getStatus':
        return await getApplicationStatus(openid)
      case 'approve':
        return await approveApplication(openid, event)
      case 'reject':
        return await rejectApplication(openid, event)
      case 'getList':
        return await getApplicationList(openid, event)
      
      // 档案相关
      case 'createProfile':
        return await createProfile(openid, event)
      case 'getProfile':
        return await getProfile(openid, event)
      case 'updateProfile':
        return await updateProfile(openid, event)
      
      // 工作二维码相关
      case 'uploadQRCode':
        return await uploadQRCode(openid, event)
      case 'getQRCode':
        return await getQRCode(openid, event)
      case 'deleteQRCode':
        return await deleteQRCode(openid, event)
      
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('画师申请管理错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 提交画师申请
 */
async function applyArtist(openid, event) {
  const { artistName, portfolio, introduction } = event

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在，请先登录' }
  }

  const user = userRes.data[0]

  // 检查是否已有申请
  const existingRes = await db.collection('artist_applications')
    .where({ userId: user.userId })
    .get()

  if (existingRes.data.length > 0) {
    const app = existingRes.data[0]
    if (app.status === 'pending') {
      return { success: false, message: '已有申请正在审核中' }
    }
    if (app.status === 'approved') {
      return { success: false, message: '您已是认证画师' }
    }
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // 创建申请
  const application = {
    userId: user.userId,
    userName: user.nickName,
    userAvatar: user.avatarUrl,
    artistName,
    portfolio: portfolio || '',
    introduction: introduction || '',
    status: 'pending',
    createdAt: now,
    updatedAt: now
  }

  await db.collection('artist_applications').add({
    data: application
  })

  return {
    success: true,
    message: '申请已提交，等待审核'
  }
}

/**
 * 获取申请状态
 */
async function getApplicationStatus(openid) {
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const userId = userRes.data[0].userId

  const appRes = await db.collection('artist_applications')
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (appRes.data.length === 0) {
    return {
      success: true,
      data: { status: 'none' }
    }
  }

  return {
    success: true,
    data: appRes.data[0]
  }
}

/**
 * 批准申请（仅管理员）
 */
async function approveApplication(openid, event) {
  const { applicationId, userId } = event

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可操作' }
  }

  // 更新申请状态
  await db.collection('artist_applications')
    .where({ userId })
    .update({
      data: {
        status: 'approved',
        approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

  // 更新用户角色
  await db.collection('users')
    .where({ userId })
    .update({
      data: {
        role: 'artist'
      }
    })

  return {
    success: true,
    message: '申请已批准'
  }
}

/**
 * 拒绝申请（仅管理员）
 */
async function rejectApplication(openid, event) {
  const { userId, reason } = event

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可操作' }
  }

  // 更新申请状态
  await db.collection('artist_applications')
    .where({ userId })
    .update({
      data: {
        status: 'rejected',
        rejectReason: reason || '',
        rejectedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

  return {
    success: true,
    message: '申请已拒绝'
  }
}

/**
 * 获取申请列表（仅管理员）
 */
async function getApplicationList(openid, event) {
  const { page = 1, pageSize = 10, status } = event

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可查看' }
  }

  let query = db.collection('artist_applications')

  if (status) {
    query = query.where({ status })
  }

  // 获取总数
  const countRes = await query.count()
  const total = countRes.total

  // 分页查询
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

// ==================== 画师档案管理 ====================

/**
 * 创建画师档案
 */
async function createProfile(openid, event) {
  const { name, age, wechat, contact, idealPrice, minPrice, introduction, portfolio } = event

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const user = userRes.data[0]

  // 检查是否已有档案
  const existingRes = await db.collection('artist_profiles')
    .where({ userId: user.userId })
    .get()

  if (existingRes.data.length > 0) {
    return { success: false, message: '档案已存在，请使用更新功能' }
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const profile = {
    userId: user.userId,
    userName: user.nickName,
    userAvatar: user.avatarUrl,
    name: name || '',
    age: age || '',
    wechat: wechat || '',
    contact: contact || '',
    idealPrice: idealPrice || '',
    minPrice: minPrice || '',
    introduction: introduction || '',
    portfolio: portfolio || [],
    createdAt: now,
    updatedAt: now
  }

  await db.collection('artist_profiles').add({
    data: profile
  })

  return {
    success: true,
    message: '档案创建成功'
  }
}

/**
 * 获取画师档案
 */
async function getProfile(openid, event) {
  const { userId } = event

  // 获取当前用户
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const currentUserId = userRes.data[0].userId
  const targetUserId = userId || currentUserId

  // 查询档案
  const profileRes = await db.collection('artist_profiles')
    .where({ userId: targetUserId })
    .get()

  if (profileRes.data.length === 0) {
    return { success: false, message: '档案不存在' }
  }

  return {
    success: true,
    data: profileRes.data[0]
  }
}

/**
 * 更新画师档案
 */
async function updateProfile(openid, event) {
  const { userId, ...updateData } = event

  // 获取当前用户
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const currentUserId = userRes.data[0].userId

  // 检查权限：只能更新自己的档案或管理员
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()
  const isAdmin = adminRes.data.length > 0

  if (!isAdmin && userId && userId !== currentUserId) {
    return { success: false, message: '无权限更新他人档案' }
  }

  const targetUserId = userId || currentUserId
  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const res = await db.collection('artist_profiles')
    .where({ userId: targetUserId })
    .update({
      data: updateData
    })

  if (res.stats.updated === 0) {
    return { success: false, message: '更新失败，档案可能不存在' }
  }

  return {
    success: true,
    message: '档案更新成功'
  }
}

// ==================== 画师工作二维码管理 ====================

/**
 * 上传工作二维码
 */
async function uploadQRCode(openid, event) {
  const { qrcodeImage, description } = event

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const user = userRes.data[0]

  // 检查是否已有二维码
  const existingRes = await db.collection('artist_qrcodes')
    .where({ userId: user.userId })
    .get()

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const qrcodeData = {
    userId: user.userId,
    userName: user.nickName,
    qrcodeImage,
    description: description || '',
    updatedAt: now
  }

  if (existingRes.data.length > 0) {
    // 更新现有二维码
    await db.collection('artist_qrcodes')
      .where({ userId: user.userId })
      .update({
        data: qrcodeData
      })
  } else {
    // 创建新二维码
    qrcodeData.createdAt = now
    await db.collection('artist_qrcodes').add({
      data: qrcodeData
    })
  }

  return {
    success: true,
    message: '二维码上传成功'
  }
}

/**
 * 获取工作二维码
 */
async function getQRCode(openid, event) {
  const { userId } = event

  // 获取当前用户
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const currentUserId = userRes.data[0].userId
  const targetUserId = userId || currentUserId

  // 查询二维码
  const qrcodeRes = await db.collection('artist_qrcodes')
    .where({ userId: targetUserId })
    .get()

  if (qrcodeRes.data.length === 0) {
    return { success: false, message: '二维码不存在' }
  }

  return {
    success: true,
    data: qrcodeRes.data[0]
  }
}

/**
 * 删除工作二维码
 */
async function deleteQRCode(openid, event) {
  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const userId = userRes.data[0].userId

  const res = await db.collection('artist_qrcodes')
    .where({ userId })
    .remove()

  if (res.stats.removed === 0) {
    return { success: false, message: '删除失败，二维码可能不存在' }
  }

  return {
    success: true,
    message: '二维码已删除'
  }
}

