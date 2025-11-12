// 云函数：contentManager - 内容管理（轮播图、公告、客服二维码、买家秀）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 内容管理云函数
 * 支持操作：banners, notices, serviceQRCodes, buyerShows
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { module, action } = event

  try {
    // 路由到不同模块
    switch (module) {
      case 'banner':
        return await handleBanner(openid, action, event)
      case 'notice':
        return await handleNotice(openid, action, event)
      case 'serviceQRCode':
        return await handleServiceQRCode(openid, action, event)
      case 'buyerShow':
        return await handleBuyerShow(openid, action, event)
      case 'category':
        return await handleCategory(openid, action, event)
      default:
        return { success: false, message: '未知模块' }
    }
  } catch (error) {
    console.error('内容管理错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

// ==================== 轮播图管理 ====================

async function handleBanner(openid, action, event) {
  switch (action) {
    case 'getList':
      return await getBannerList()
    case 'create':
      return await createBanner(openid, event)
    case 'update':
      return await updateBanner(openid, event)
    case 'delete':
      return await deleteBanner(openid, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getBannerList() {
  const res = await db.collection('banners')
    .where({ status: 'enabled' })
    .orderBy('sort', 'asc')
    .get()

  return {
    success: true,
    data: res.data
  }
}

async function createBanner(openid, event) {
  // 检查管理员权限
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { image, link, title, sort } = event
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('banners').add({
    data: {
      image,
      link: link || '',
      title: title || '',
      sort: sort || 0,
      status: 'enabled',
      createdAt: now
    }
  })

  return { success: true, message: '创建成功' }
}

async function updateBanner(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { bannerId, ...updateData } = event
  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('banners')
    .doc(bannerId)
    .update({ data: updateData })

  return { success: true, message: '更新成功' }
}

async function deleteBanner(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { bannerId } = event
  await db.collection('banners').doc(bannerId).remove()

  return { success: true, message: '删除成功' }
}

// ==================== 公告管理 ====================

async function handleNotice(openid, action, event) {
  switch (action) {
    case 'getList':
      return await getNoticeList()
    case 'getDetail':
      return await getNoticeDetail(event)
    case 'create':
      return await createNotice(openid, event)
    case 'update':
      return await updateNotice(openid, event)
    case 'delete':
      return await deleteNotice(openid, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getNoticeList() {
  const res = await db.collection('notices')
    .where({ status: 'enabled' })
    .orderBy('sort', 'asc')
    .orderBy('createdAt', 'desc')
    .get()

  return {
    success: true,
    data: res.data
  }
}

async function getNoticeDetail(event) {
  const { noticeId } = event
  const res = await db.collection('notices').doc(noticeId).get()

  if (!res.data) {
    return { success: false, message: '公告不存在' }
  }

  return {
    success: true,
    data: res.data
  }
}

async function createNotice(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { title, content, sort } = event
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('notices').add({
    data: {
      title,
      content,
      sort: sort || 0,
      status: 'enabled',
      createdAt: now
    }
  })

  return { success: true, message: '创建成功' }
}

async function updateNotice(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { noticeId, ...updateData } = event
  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('notices')
    .doc(noticeId)
    .update({ data: updateData })

  return { success: true, message: '更新成功' }
}

async function deleteNotice(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { noticeId } = event
  await db.collection('notices').doc(noticeId).remove()

  return { success: true, message: '删除成功' }
}

// ==================== 客服二维码管理 ====================

async function handleServiceQRCode(openid, action, event) {
  switch (action) {
    case 'getList':
      return await getServiceQRCodeList()
    case 'getRandom':
      return await getRandomServiceQRCode()
    case 'create':
      return await createServiceQRCode(openid, event)
    case 'update':
      return await updateServiceQRCode(openid, event)
    case 'delete':
      return await deleteServiceQRCode(openid, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getServiceQRCodeList() {
  const res = await db.collection('service_qrcodes')
    .where({ status: 'enabled' })
    .orderBy('sort', 'asc')
    .get()

  return {
    success: true,
    data: res.data
  }
}

async function getRandomServiceQRCode() {
  const res = await db.collection('service_qrcodes')
    .where({ status: 'enabled' })
    .get()

  if (res.data.length === 0) {
    return { success: false, message: '暂无可用客服二维码' }
  }

  // 随机选择一个
  const randomIndex = Math.floor(Math.random() * res.data.length)
  return {
    success: true,
    data: res.data[randomIndex]
  }
}

async function createServiceQRCode(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { name, image, sort } = event
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('service_qrcodes').add({
    data: {
      name,
      image,
      sort: sort || 0,
      status: 'enabled',
      createdAt: now
    }
  })

  return { success: true, message: '创建成功' }
}

async function updateServiceQRCode(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { qrcodeId, ...updateData } = event
  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('service_qrcodes')
    .doc(qrcodeId)
    .update({ data: updateData })

  return { success: true, message: '更新成功' }
}

async function deleteServiceQRCode(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { qrcodeId } = event
  await db.collection('service_qrcodes').doc(qrcodeId).remove()

  return { success: true, message: '删除成功' }
}

// ==================== 买家秀管理 ====================

async function handleBuyerShow(openid, action, event) {
  switch (action) {
    case 'getList':
      return await getBuyerShowList(event)
    case 'create':
      return await createBuyerShow(openid, event)
    case 'delete':
      return await deleteBuyerShow(openid, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getBuyerShowList(event) {
  const { page = 1, pageSize = 10 } = event

  const query = db.collection('buyer_shows')
    .where({ status: 'enabled' })
    .orderBy('createdAt', 'desc')

  const countRes = await query.count()
  const total = countRes.total

  const res = await query
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

async function createBuyerShow(openid, event) {
  const { orderId, images, content } = event

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const user = userRes.data[0]
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('buyer_shows').add({
    data: {
      orderId,
      userId: user.userId,
      userName: user.nickName,
      userAvatar: user.avatarUrl,
      images: images || [],
      content: content || '',
      status: 'enabled',
      createdAt: now
    }
  })

  return { success: true, message: '发布成功' }
}

async function deleteBuyerShow(openid, event) {
  const { showId } = event

  // 获取买家秀信息
  const showRes = await db.collection('buyer_shows').doc(showId).get()
  if (!showRes.data) {
    return { success: false, message: '买家秀不存在' }
  }

  // 检查权限：管理员或创建者
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const userId = userRes.data[0].userId
  const isAdmin = await checkAdmin(openid)

  if (!isAdmin && showRes.data.userId !== userId) {
    return { success: false, message: '无权限删除' }
  }

  await db.collection('buyer_shows').doc(showId).remove()

  return { success: true, message: '删除成功' }
}

// ==================== 分类管理 ====================

async function handleCategory(openid, action, event) {
  switch (action) {
    case 'getList':
      return await getCategoryList()
    case 'create':
      return await createCategory(openid, event)
    case 'update':
      return await updateCategory(openid, event)
    case 'delete':
      return await deleteCategory(openid, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getCategoryList() {
  const res = await db.collection('categories')
    .orderBy('sort', 'asc')
    .get()

  return {
    success: true,
    data: res.data
  }
}

async function createCategory(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { name, icon, sort } = event
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('categories').add({
    data: {
      name,
      icon: icon || '',
      sort: sort || 0,
      createdAt: now
    }
  })

  return { success: true, message: '创建成功' }
}

async function updateCategory(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { categoryId, ...updateData } = event
  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  await db.collection('categories')
    .doc(categoryId)
    .update({ data: updateData })

  return { success: true, message: '更新成功' }
}

async function deleteCategory(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { categoryId } = event
  await db.collection('categories').doc(categoryId).remove()

  return { success: true, message: '删除成功' }
}

// ==================== 工具函数 ====================

async function checkAdmin(openid) {
  const res = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  return res.data.length > 0
}

