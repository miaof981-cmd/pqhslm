// 云函数：userManager - 用户管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 用户管理云函数
 * 支持操作：login, getUserInfo, updateUserInfo, checkAdmin
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'login':
        return await login(openid, event)
      case 'getUserInfo':
        return await getUserInfo(openid, event)
      case 'updateUserInfo':
        return await updateUserInfo(openid, event)
      case 'checkAdmin':
        return await checkAdmin(openid)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('用户管理错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 用户登录/注册
 * 如果用户不存在则自动创建
 */
async function login(openid, event) {
  const { nickName, avatarUrl } = event

  // 检查用户是否存在
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  // 用户已存在，返回用户信息
  if (userRes.data.length > 0) {
    const user = userRes.data[0]
    
    // 更新最后登录时间
    await db.collection('users')
      .doc(user._id)
      .update({
        data: {
          lastLoginTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      })

    return {
      success: true,
      data: {
        userId: user.userId,
        openid: user._openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        phone: user.phone || '',
        memberLevel: user.memberLevel || '普通会员',
        memberExpireTime: user.memberExpireTime || '',
        role: user.role || 'customer',
        isNewUser: false
      }
    }
  }

  // 用户不存在，创建新用户
  // ✅ 使用序列表生成唯一userId（避免并发冲突）
  const sequenceCollection = db.collection('sequences')
  
  let newUserId = '1001'
  try {
    // 原子性操作：查找并更新序列值
    const seqRes = await sequenceCollection
      .where({ _id: 'userId' })
      .get()
    
    if (seqRes.data.length > 0) {
      // 序列存在，原子性递增
      const currentValue = seqRes.data[0].value
      await sequenceCollection.doc('userId').update({
        data: {
          value: _.inc(1)  // 原子性递增
        }
      })
      newUserId = String(currentValue + 1)
    } else {
      // 序列不存在，初始化
      await sequenceCollection.add({
        data: {
          _id: 'userId',
          value: 1001,
          description: 'User ID sequence'
        }
      })
      newUserId = '1001'
    }
  } catch (seqError) {
    console.error('序列表操作失败，降级为查询最大值:', seqError)
    // 降级方案：查询最大userId
    const allUsers = await db.collection('users')
      .orderBy('userId', 'desc')
      .limit(1)
      .get()
    
    if (allUsers.data.length > 0) {
      const maxUserId = parseInt(allUsers.data[0].userId)
      newUserId = String(maxUserId + 1)
    }
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  
  // 创建新用户
  const newUser = {
    _openid: openid,
    userId: newUserId,
    nickName: nickName || '用户' + newUserId,
    avatarUrl: avatarUrl || '',
    phone: '',
    memberLevel: '普通会员',
    memberExpireTime: '',
    role: 'customer',
    createdAt: now,
    lastLoginTime: now
  }

  await db.collection('users').add({
    data: newUser
  })

  return {
    success: true,
    data: {
      userId: newUser.userId,
      openid: openid,
      nickName: newUser.nickName,
      avatarUrl: newUser.avatarUrl,
      phone: newUser.phone,
      memberLevel: newUser.memberLevel,
      memberExpireTime: newUser.memberExpireTime,
      role: newUser.role,
      isNewUser: true
    }
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(openid, event) {
  const { userId } = event

  // 如果指定了userId，按userId查询（管理员查询其他用户）
  if (userId) {
    // 检查是否为管理员
    const isAdmin = await checkAdmin(openid)
    if (!isAdmin.data.isAdmin) {
      return { success: false, message: '无权限查询其他用户信息' }
    }

    const userRes = await db.collection('users')
      .where({ userId })
      .get()

    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    return {
      success: true,
      data: userRes.data[0]
    }
  }

  // 查询当前用户自己的信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在，请先登录' }
  }

  return {
    success: true,
    data: userRes.data[0]
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(openid, event) {
  const { nickName, avatarUrl, phone } = event

  const updateData = {}
  if (nickName) updateData.nickName = nickName
  if (avatarUrl) updateData.avatarUrl = avatarUrl
  if (phone !== undefined) updateData.phone = phone

  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const res = await db.collection('users')
    .where({ _openid: openid })
    .update({
      data: updateData
    })

  if (res.stats.updated === 0) {
    return { success: false, message: '更新失败' }
  }

  return {
    success: true,
    message: '更新成功'
  }
}

/**
 * 检查是否为管理员
 */
async function checkAdmin(openid) {
  const res = await db.collection('system_admin')
    .where({
      _openid: openid,
      isAdmin: true
    })
    .get()

  return {
    success: true,
    data: {
      isAdmin: res.data.length > 0,
      adminLevel: res.data.length > 0 ? res.data[0].adminLevel : null
    }
  }
}

