// 云函数：statsManager - 统计数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 统计数据云函数
 * 支持操作：dashboard, artistPerformance, orderStats
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'dashboard':
        return await getDashboard(openid)
      case 'artistPerformance':
        return await getArtistPerformance(openid, event)
      case 'orderStats':
        return await getOrderStats(openid, event)
      case 'userStats':
        return await getUserStats(openid)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('统计数据错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 仪表盘数据（管理员）
 */
async function getDashboard(openid) {
  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可查看' }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = today.toISOString().replace('T', ' ').substring(0, 19)
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().replace('T', ' ').substring(0, 19)

  // 获取所有订单
  const allOrders = await db.collection('orders').get()
  const orders = allOrders.data

  // 今日订单
  const todayOrders = orders.filter(o => o.createTime >= todayStr)
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  // 本月订单
  const monthOrders = orders.filter(o => o.createTime >= monthStartStr)
  const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  // 总订单
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  // 待处理订单
  const pendingOrders = orders.filter(o => o.status === 'unpaid').length
  const processingOrders = orders.filter(o => o.status === 'inProgress').length
  const refundOrders = orders.filter(o => o.status === 'refunded').length

  // 用户统计
  const usersRes = await db.collection('users').get()
  const totalUsers = usersRes.data.length
  const newUsers = usersRes.data.filter(u => u.createdAt >= todayStr).length

  return {
    success: true,
    data: {
      todayOrders: todayOrders.length,
      todayRevenue: todayRevenue.toFixed(2),
      monthOrders: monthOrders.length,
      monthRevenue: monthRevenue.toFixed(2),
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      activeUsers: totalUsers,
      newUsers,
      pendingOrders,
      processingOrders,
      refundOrders
    }
  }
}

/**
 * 画师业绩统计
 */
async function getArtistPerformance(openid, event) {
  const { artistId, startDate, endDate } = event

  // 获取当前用户
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' }
  }

  const currentUserId = userRes.data[0].userId

  // 检查权限：管理员或本人
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()
  const isAdmin = adminRes.data.length > 0

  const targetArtistId = artistId || currentUserId

  if (!isAdmin && targetArtistId !== currentUserId) {
    return { success: false, message: '无权限查看' }
  }

  // 获取画师订单
  const ordersRes = await db.collection('orders')
    .where({ artistId: targetArtistId })
    .get()

  const orders = ordersRes.data

  // 时间筛选
  let filteredOrders = orders
  if (startDate) {
    filteredOrders = filteredOrders.filter(o => o.createTime >= startDate)
  }
  if (endDate) {
    filteredOrders = filteredOrders.filter(o => o.createTime <= endDate)
  }

  // 统计数据
  const totalOrders = filteredOrders.length
  const completedOrders = filteredOrders.filter(o => o.status === 'completed')
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const completeRate = totalOrders > 0 ? ((completedOrders.length / totalOrders) * 100).toFixed(2) : 0

  // 本月订单
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().replace('T', ' ').substring(0, 19)
  const monthOrders = filteredOrders.filter(o => o.createTime >= monthStartStr)
  const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  return {
    success: true,
    data: {
      totalOrders,
      completedOrders: completedOrders.length,
      totalRevenue: totalRevenue.toFixed(2),
      completeRate,
      monthOrders: monthOrders.length,
      monthRevenue: monthRevenue.toFixed(2),
      averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'
    }
  }
}

/**
 * 订单统计（管理员）
 */
async function getOrderStats(openid, event) {
  const { startDate, endDate, groupBy = 'day' } = event

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可查看' }
  }

  // 获取订单
  let query = db.collection('orders')
  const where = {}

  if (startDate) {
    where.createTime = _.gte(startDate)
  }
  if (endDate) {
    if (where.createTime) {
      where.createTime = _.and(_.gte(startDate), _.lte(endDate))
    } else {
      where.createTime = _.lte(endDate)
    }
  }

  if (Object.keys(where).length > 0) {
    query = query.where(where)
  }

  const res = await query.get()
  const orders = res.data

  // 按状态分组
  const statusGroups = {}
  orders.forEach(order => {
    const status = order.status || 'unknown'
    if (!statusGroups[status]) {
      statusGroups[status] = []
    }
    statusGroups[status].push(order)
  })

  const statusStats = Object.keys(statusGroups).map(status => ({
    status,
    count: statusGroups[status].length,
    revenue: statusGroups[status].reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)
  }))

  // 按时间分组（简化版）
  const timeStats = []
  if (groupBy === 'day') {
    const dateGroups = {}
    orders.forEach(order => {
      const date = order.createTime.substring(0, 10)
      if (!dateGroups[date]) {
        dateGroups[date] = []
      }
      dateGroups[date].push(order)
    })

    Object.keys(dateGroups).sort().forEach(date => {
      timeStats.push({
        date,
        count: dateGroups[date].length,
        revenue: dateGroups[date].reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)
      })
    })
  }

  return {
    success: true,
    data: {
      total: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2),
      statusStats,
      timeStats
    }
  }
}

/**
 * 用户统计
 */
async function getUserStats(openid) {
  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可查看' }
  }

  const usersRes = await db.collection('users').get()
  const users = usersRes.data

  const totalUsers = users.length
  const artistCount = users.filter(u => u.role === 'artist').length
  const serviceCount = users.filter(u => u.role === 'service').length
  const customerCount = users.filter(u => u.role === 'customer' || !u.role).length

  // 今日新增
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = today.toISOString().replace('T', ' ').substring(0, 19)
  const newUsersToday = users.filter(u => u.createdAt >= todayStr).length

  // 本月新增
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().replace('T', ' ').substring(0, 19)
  const newUsersMonth = users.filter(u => u.createdAt >= monthStartStr).length

  return {
    success: true,
    data: {
      totalUsers,
      artistCount,
      serviceCount,
      customerCount,
      newUsersToday,
      newUsersMonth
    }
  }
}

