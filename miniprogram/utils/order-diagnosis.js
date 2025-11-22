/**
 * 订单诊断工具
 * 用于排查订单统计不一致问题
 * ✅ 已云端化：基于云端订单数据
 */

const orderHelper = require('./order-helper.js')

/**
 * 诊断订单统计差异
 * @returns {Object} 诊断报告
 */
function diagnoseOrderCounts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 订单统计诊断（云端版）')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  // 获取所有订单（从云端或本地helper）
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
      const orderId = order._id || order.id
      const productName = order.productName || order.product_name || '未知'
      const buyerInfo = order.buyerName || order.buyer_name || order.buyerId || order.buyer_id
      console.log(`    - ID: ${orderId}, 商品: ${productName}, 买家: ${buyerInfo}`)
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
  const adminPendingIds = new Set(adminPendingOrders.map(o => o._id || o.id))
  const userProcessingIds = new Set(userProcessingOrders.map(o => o._id || o.id))
  
  const extraInAdmin = allOrders.filter(o => {
    const orderId = o._id || o.id
    return adminPendingIds.has(orderId) && !userProcessingIds.has(orderId)
  })
  const extraInUser = allOrders.filter(o => {
    const orderId = o._id || o.id
    return !adminPendingIds.has(orderId) && userProcessingIds.has(orderId)
  })
  
  if (extraInAdmin.length > 0) {
    console.log('⚠️ 仅在管理后台统计的订单（通常是待支付订单）:')
    extraInAdmin.forEach(order => {
      const orderId = order._id || order.id
      const productName = order.productName || order.product_name || '未知'
      const buyerInfo = order.buyerName || order.buyer_name || order.buyerId || order.buyer_id
      const price = order.totalPrice || order.total_price || order.price || 0
      const createTime = order.createTime || order.create_time || '未知'
      
      console.log(`  - ID: ${orderId}`)
      console.log(`    状态: ${order.status} (${order.statusText || order.status_text || ''})`)
      console.log(`    商品: ${productName}`)
      console.log(`    买家: ${buyerInfo}`)
      console.log(`    金额: ¥${price}`)
      console.log(`    创建时间: ${createTime}`)
    })
    console.log('')
  }
  
  if (extraInUser.length > 0) {
    console.log('⚠️ 仅在用户端统计的订单（通常是脱稿订单）:')
    extraInUser.forEach(order => {
      const orderId = order._id || order.id
      const productName = order.productName || order.product_name || '未知'
      
      console.log(`  - ID: ${orderId}`)
      console.log(`    状态: ${order.status} (${order.statusText || order.status_text || ''})`)
      console.log(`    商品: ${productName}`)
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
  
  console.log('')
  console.log('🚨 请检查以下差异订单:')
  if (report.extraInAdmin.length > 0) {
    report.extraInAdmin.forEach(o => {
      const orderId = o._id || o.id
      const productName = o.productName || o.product_name
      const buyerInfo = o.buyerName || o.buyer_name || o.buyerId || o.buyer_id
      const artistId = o.artistId || o.artist_id
      const createTime = o.createTime || o.create_time
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`订单ID: ${orderId}`)
      console.log(`状态: ${o.status}`)
      console.log(`商品: ${productName}`)
      console.log(`买家: ${buyerInfo}`)
      console.log(`画师ID: ${artistId}`)
      console.log(`创建时间: ${createTime}`)
    })
  }
  
  // 返回简要信息
  return {
    summary: `管理后台${report.adminPending}个 vs 用户端${report.userProcessing}个 (差异${report.difference}个)`,
    extraOrders: report.extraInAdmin.map(o => ({
      id: o._id || o.id,
      status: o.status,
      product: o.productName || o.product_name,
      buyer: o.buyerName || o.buyer_name || o.buyerId || o.buyer_id,
      artistId: o.artistId || o.artist_id
    }))
  }
}

/**
 * 检查订单是否重复（在多个数据源中）
 * ❌ 已废弃：云端化后不再有多个本地数据源
 */
function checkDuplicates() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 检查订单数据源重复（云端版）')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('ℹ️ 云端化后，所有订单统一存储在云端数据库')
  console.log('ℹ️ 不再存在 orders/pending_orders/mock_orders 分离问题')
  console.log('✅ 无需检查重复')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return []  // 返回空数组
}

module.exports = {
  diagnoseOrderCounts,
  quickDiagnose,
  checkDuplicates
}
