/**
 * 订单诊断工具
 * 用于排查订单统计不一致问题
 */

const orderHelper = require('./order-helper.js')

/**
 * 诊断订单统计差异
 * @returns {Object} 诊断报告
 */
function diagnoseOrderCounts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 订单统计诊断')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  // 获取所有订单
  const allOrders = orderHelper.getAllOrders()
  console.log('📦 订单总数:', allOrders.length)
  console.log('')
  
  // 按状态分组
  const statusGroups = {}
  allOrders.forEach(order => {
    const status = order.status || 'unknown'
    if (!statusGroups[status]) {
      statusGroups[status] = []
    }
    statusGroups[status].push(order)
  })
  
  console.log('📊 订单状态分布:')
  Object.keys(statusGroups).sort().forEach(status => {
    const orders = statusGroups[status]
    console.log(`  ${status}: ${orders.length}个`)
    orders.forEach(order => {
      console.log(`    - ID: ${order.id}, 商品: ${order.productName || '未知'}, 买家: ${order.buyerName || order.buyerId}`)
    })
  })
  console.log('')
  
  // 管理后台"待处理"统计（包含 unpaid）
  const adminPendingStatuses = new Set(['unpaid', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline'])
  const adminPendingOrders = allOrders.filter(o => adminPendingStatuses.has(o.status))
  
  // 用户端"制作中"统计（不包含 unpaid）
  const userProcessingStatuses = new Set(['processing', 'inProgress', 'paid', 'waitingConfirm', 'nearDeadline', 'overdue'])
  const userProcessingOrders = allOrders.filter(o => userProcessingStatuses.has(o.status))
  
  console.log('🎯 对比分析:')
  console.log(`  管理后台"待处理": ${adminPendingOrders.length}个`)
  console.log(`  用户端"制作中": ${userProcessingOrders.length}个`)
  console.log(`  差异: ${adminPendingOrders.length - userProcessingOrders.length}个`)
  console.log('')
  
  // 找出差异订单
  const adminPendingIds = new Set(adminPendingOrders.map(o => o.id))
  const userProcessingIds = new Set(userProcessingOrders.map(o => o.id))
  
  const extraInAdmin = allOrders.filter(o => adminPendingIds.has(o.id) && !userProcessingIds.has(o.id))
  const extraInUser = allOrders.filter(o => !adminPendingIds.has(o.id) && userProcessingIds.has(o.id))
  
  if (extraInAdmin.length > 0) {
    console.log('⚠️ 仅在管理后台统计的订单（通常是待支付订单）:')
    extraInAdmin.forEach(order => {
      console.log(`  - ID: ${order.id}`)
      console.log(`    状态: ${order.status} (${order.statusText || ''})`)
      console.log(`    商品: ${order.productName || '未知'}`)
      console.log(`    买家: ${order.buyerName || order.buyerId}`)
      console.log(`    金额: ¥${order.totalPrice || order.price || 0}`)
      console.log(`    创建时间: ${order.createTime || '未知'}`)
    })
    console.log('')
  }
  
  if (extraInUser.length > 0) {
    console.log('⚠️ 仅在用户端统计的订单（通常是脱稿订单）:')
    extraInUser.forEach(order => {
      console.log(`  - ID: ${order.id}`)
      console.log(`    状态: ${order.status} (${order.statusText || ''})`)
      console.log(`    商品: ${order.productName || '未知'}`)
    })
    console.log('')
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💡 解释:')
  console.log('  - 管理后台"待处理"包含所有未完成的订单（含待支付）')
  console.log('  - 用户/画师端"制作中"只包含已支付的订单')
  console.log('  - 差异订单通常是待支付状态，买家还未完成支付')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return {
    totalOrders: allOrders.length,
    adminPending: adminPendingOrders.length,
    userProcessing: userProcessingOrders.length,
    difference: adminPendingOrders.length - userProcessingOrders.length,
    extraInAdmin: extraInAdmin,
    extraInUser: extraInUser,
    statusGroups: statusGroups
  }
}

/**
 * 快速诊断（用于开发者工具控制台）
 */
function quickDiagnose() {
  const report = diagnoseOrderCounts()
  
  // 返回简要信息
  return {
    summary: `管理后台${report.adminPending}个 vs 用户端${report.userProcessing}个 (差异${report.difference}个)`,
    extraOrders: report.extraInAdmin.map(o => ({
      id: o.id,
      status: o.status,
      product: o.productName,
      buyer: o.buyerName || o.buyerId
    }))
  }
}

module.exports = {
  diagnoseOrderCounts,
  quickDiagnose
}

