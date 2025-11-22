// 云函数：serviceManager - 客服管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 客服管理云函数
 * 支持操作：addService, getServiceList, updateService, toggleServiceStatus, deleteService
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'addService':
        return await addService(openid, event)
      case 'getServiceList':
        return await getServiceList(openid, event)
      case 'updateService':
        return await updateService(openid, event)
      case 'toggleServiceStatus':
        return await toggleServiceStatus(openid, event)
      case 'deleteService':
        return await deleteService(openid, event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('客服管理错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 添加客服
 */
async function addService(openid, event) {
  const { userId, name, wechatId, qrcodeUrl, avatarUrl } = event

  // 验证必填字段
  if (!name || !name.trim()) {
    return { success: false, message: '客服名称不能为空' }
  }

  // 检查是否已存在
  const existingUser = await db.collection('users')
    .where({
      _openid: openid,
      userId: String(userId)
    })
    .get()

  if (existingUser.data.length > 0) {
    // 用户已存在，更新角色为客服
    await db.collection('users')
      .where({
        _openid: openid,
        userId: String(userId)
      })
      .update({
        data: {
          role: 'service',
          serviceName: name.trim(),
          wechatId: wechatId || '',
          qrcodeUrl: qrcodeUrl || '',
          avatarUrl: avatarUrl || '',
          isActive: true,
          updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      })

    return {
      success: true,
      message: '客服添加成功',
      data: {
        userId: String(userId),
        name: name.trim(),
        wechatId: wechatId || '',
        qrcodeUrl: qrcodeUrl || '',
        avatarUrl: avatarUrl || '',
        isActive: true
      }
    }
  }

  // 用户不存在，创建新客服用户
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  
  const newService = {
    _openid: openid,
    userId: String(userId),
    role: 'service',
    nickName: name.trim(),
    serviceName: name.trim(),
    wechatId: wechatId || '',
    qrcodeUrl: qrcodeUrl || '',
    avatarUrl: avatarUrl || '',
    isActive: true,
    memberLevel: '普通会员',
    balance: 0,
    createTime: now,
    updateTime: now
  }

  const addRes = await db.collection('users').add({
    data: newService
  })

  return {
    success: true,
    message: '客服添加成功',
    data: {
      _id: addRes._id,
      userId: String(userId),
      name: name.trim(),
      wechatId: wechatId || '',
      qrcodeUrl: qrcodeUrl || '',
      avatarUrl: avatarUrl || '',
      isActive: true
    }
  }
}

/**
 * 获取客服列表
 */
async function getServiceList(openid, event) {
  const { isActiveOnly = false } = event

  const where = { role: 'service' }
  if (isActiveOnly) {
    where.isActive = true
  }

  const serviceRes = await db.collection('users')
    .where(where)
    .orderBy('createTime', 'desc')
    .get()

  const services = serviceRes.data.map(s => ({
    _id: s._id,
    userId: s.userId,
    name: s.serviceName || s.nickName || '',
    nickName: s.nickName || '',
    wechatId: s.wechatId || '',
    qrcodeUrl: s.qrcodeUrl || '',
    avatarUrl: s.avatarUrl || '',
    isActive: s.isActive !== false,
    createTime: s.createTime,
    updateTime: s.updateTime
  }))

  return {
    success: true,
    data: services,
    total: services.length
  }
}

/**
 * 更新客服信息
 */
async function updateService(openid, event) {
  const { userId, name, wechatId, qrcodeUrl, avatarUrl } = event

  if (!userId) {
    return { success: false, message: '客服ID不能为空' }
  }

  const updateData = {
    updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
  }

  if (name !== undefined) updateData.serviceName = name.trim()
  if (name !== undefined) updateData.nickName = name.trim()
  if (wechatId !== undefined) updateData.wechatId = wechatId
  if (qrcodeUrl !== undefined) updateData.qrcodeUrl = qrcodeUrl
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

  const updateRes = await db.collection('users')
    .where({
      userId: String(userId),
      role: 'service'
    })
    .update({
      data: updateData
    })

  if (updateRes.stats.updated === 0) {
    return { success: false, message: '客服不存在或更新失败' }
  }

  return {
    success: true,
    message: '客服信息更新成功',
    data: { updated: updateRes.stats.updated }
  }
}

/**
 * 切换客服在线状态
 */
async function toggleServiceStatus(openid, event) {
  const { userId, isActive } = event

  if (!userId) {
    return { success: false, message: '客服ID不能为空' }
  }

  // 如果要下线，检查是否是最后一个在线客服
  if (isActive === false) {
    const activeServices = await db.collection('users')
      .where({
        role: 'service',
        isActive: true
      })
      .count()

    if (activeServices.total <= 1) {
      return {
        success: false,
        message: '当前只有一个在线客服，无法下线'
      }
    }
  }

  const updateRes = await db.collection('users')
    .where({
      userId: String(userId),
      role: 'service'
    })
    .update({
      data: {
        isActive: isActive !== false,
        updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

  if (updateRes.stats.updated === 0) {
    return { success: false, message: '客服不存在或状态更新失败' }
  }

  return {
    success: true,
    message: isActive ? '客服已上线' : '客服已下线',
    data: { updated: updateRes.stats.updated }
  }
}

/**
 * 删除客服
 */
async function deleteService(openid, event) {
  const { userId } = event

  if (!userId) {
    return { success: false, message: '客服ID不能为空' }
  }

  // 检查是否是最后一个客服
  const serviceCount = await db.collection('users')
    .where({ role: 'service' })
    .count()

  if (serviceCount.total <= 1) {
    return {
      success: false,
      message: '至少需要保留一个客服'
    }
  }

  // 删除客服（实际上是将角色改为普通用户）
  const updateRes = await db.collection('users')
    .where({
      userId: String(userId),
      role: 'service'
    })
    .update({
      data: {
        role: 'user',
        isActive: false,
        updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

  if (updateRes.stats.updated === 0) {
    return { success: false, message: '客服不存在或删除失败' }
  }

  return {
    success: true,
    message: '客服删除成功',
    data: { updated: updateRes.stats.updated }
  }
}

