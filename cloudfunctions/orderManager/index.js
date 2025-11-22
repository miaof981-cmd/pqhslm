// 云函数：orderManager - 订单管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 订单管理云函数
 * 支持操作：create, getList, getDetail, updateStatus, updateInfo
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'create':
        return await createOrder(openid, event)
      case 'getList':
        return await getOrderList(openid, event)
      case 'getDetail':
        return await getOrderDetail(openid, event)
      case 'updateStatus':
        return await updateOrderStatus(openid, event)
      case 'updateInfo':
        return await updateOrderInfo(openid, event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('订单管理错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 创建订单
 */
async function createOrder(openid, event) {
  const {
    productId,
    productName,
    productImage,
    spec,
    specs,
    quantity,
    price,
    totalAmount,
    deadline,
    deliveryDays,
    artistId,
    artistName,
    artistAvatar,
    notes,
    clientOrderNo
  } = event

  // 获取当前用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在，请先登录' }
  }

  const user = userRes.data[0]
  
  // 生成订单号
  const orderId = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // 分配客服（简化版，后续可优化）
  const serviceRes = await db.collection('users')
    .where({ role: 'service' })
    .limit(1)
    .get()

  let serviceInfo = {}
  if (serviceRes.data.length > 0) {
    const service = serviceRes.data[0]
    serviceInfo = {
      serviceId: service.userId,
      serviceName: service.nickName,
      serviceAvatar: service.avatarUrl,
      serviceStatus: 'assigned'
    }
  }

  // 创建订单
  const order = {
    id: orderId,
    orderNumber: orderId,
    clientOrderNo: clientOrderNo || '',
    
    // 商品信息
    productId,
    productName,
    productImage,
    spec: spec || '',
    specs: specs || [],
    quantity: parseInt(quantity),
    price: String(price),
    totalAmount: parseFloat(totalAmount),
    
    // 时间信息
    createTime: now,
    startDate: now,
    createdAt: now,
    deadline: deadline || '',
    deliveryDays: parseInt(deliveryDays) || 7,
    
    // 买家信息
    buyerId: user.userId,
    buyerName: user.nickName,
    buyerAvatar: user.avatarUrl,
    buyerPhone: user.phone || '',
    buyerOpenId: openid,
    
    // 画师信息
    artistId,
    artistName,
    artistAvatar: artistAvatar || '',
    
    // 客服信息
    ...serviceInfo,
    
    // 订单状态
    status: 'unpaid',
    visualStatus: 'unpaid',
    paymentStatus: 'unpaid',
    
    // 其他信息
    notes: notes || '',
    refundReason: '',
    images: [],
    descImages: []
  }

  await db.collection('orders').add({
    data: order
  })

  // 更新商品销量
  await db.collection('products')
    .where({ productId })
    .update({
      data: {
        sales: _.inc(parseInt(quantity))
      }
    })

  return {
    success: true,
    data: { orderId, clientOrderNo: clientOrderNo || '' },
    message: '订单创建成功'
  }
}

/**
 * 获取订单列表（支持多角色）
 */
async function getOrderList(openid, event) {
  const {
    page = 1,
    pageSize = 10,
    status,
    role // buyer, artist, service, admin
  } = event

  // 获取当前用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const user = userRes.data[0]
  const userId = user.userId

  // 检查是否为管理员
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()
  const isAdmin = adminRes.data.length > 0

  // 构建查询条件
  let query = db.collection('orders')
  const where = {}

  // 根据角色筛选
  if (isAdmin) {
    // 管理员可查看所有订单
  } else if (role === 'artist') {
    where.artistId = userId
  } else if (role === 'service') {
    where.serviceId = userId
  } else {
    // 默认为买家
    where.buyerId = userId
  }

  // 状态筛选
  if (status) {
    where.status = status
  }

  // 应用查询条件
  if (Object.keys(where).length > 0) {
    query = query.where(where)
  }

  // 获取总数
  const countRes = await query.count()
  const total = countRes.total

  // 分页查询
  query = query
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  const res = await query.get()

  return {
    success: true,
    data: {
      list: res.data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

/**
 * 获取订单详情
 */
async function getOrderDetail(openid, event) {
  const { orderId } = event

  if (!orderId) {
    return { success: false, message: '订单ID不能为空' }
  }

  // 获取订单
  const orderRes = await db.collection('orders')
    .where({ id: orderId })
    .get()

  if (orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' }
  }

  const order = orderRes.data[0]

  // 验证权限
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const userId = userRes.data[0].userId

  // 检查是否为管理员
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()
  const isAdmin = adminRes.data.length > 0

  // 检查权限：买家、画师、客服、管理员
  const hasPermission = isAdmin ||
    order.buyerId === userId ||
    order.artistId === userId ||
    order.serviceId === userId

  if (!hasPermission) {
    return { success: false, message: '无权限查看此订单' }
  }

  return {
    success: true,
    data: order
  }
}

/**
 * 更新订单状态
 */
async function updateOrderStatus(openid, event) {
  const { orderId, status, visualStatus } = event

  if (!orderId || !status) {
    return { success: false, message: '订单ID和状态不能为空' }
  }

  // 验证权限
  const hasPermission = await checkOrderPermission(openid, orderId)
  if (!hasPermission) {
    return { success: false, message: '无权限操作' }
  }

  const updateData = {
    status,
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
  }

  if (visualStatus) {
    updateData.visualStatus = visualStatus
  }

  // 如果状态为已完成，记录完成时间
  if (status === 'completed') {
    updateData.completedAt = updateData.updatedAt
  }

  const res = await db.collection('orders')
    .where({ id: orderId })
    .update({
      data: updateData
    })

  if (res.stats.updated === 0) {
    return { success: false, message: '更新失败' }
  }

  return {
    success: true,
    message: '状态更新成功'
  }
}

/**
 * 更新订单信息
 */
async function updateOrderInfo(openid, event) {
  const { orderId, ...updateData } = event

  if (!orderId) {
    return { success: false, message: '订单ID不能为空' }
  }

  // 验证权限
  const hasPermission = await checkOrderPermission(openid, orderId)
  if (!hasPermission) {
    return { success: false, message: '无权限操作' }
  }

  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const res = await db.collection('orders')
    .where({ id: orderId })
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
 * 检查订单操作权限
 */
async function checkOrderPermission(openid, orderId) {
  // 检查是否为管理员
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length > 0) {
    return true
  }

  // 获取用户信息
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return false
  }

  const userId = userRes.data[0].userId

  // 获取订单信息
  const orderRes = await db.collection('orders')
    .where({ id: orderId })
    .get()

  if (orderRes.data.length === 0) {
    return false
  }

  const order = orderRes.data[0]

  // 检查是否为订单相关人员
  return order.buyerId === userId ||
    order.artistId === userId ||
    order.serviceId === userId
}

