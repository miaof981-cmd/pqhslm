/**
 * 🔍 检查订单鎏金高亮问题
 * 
 * 问题：画师标记订单完成后，单主的订单列表没有显示鎏金高亮
 * 预期：status === 'waitingConfirm' 的订单应该有鎏金高亮效果
 */

console.log('\n\n═══════════════════════════════════════════')
console.log('✨ 检查订单鎏金高亮问题')
console.log('═══════════════════════════════════════════\n')

const currentUserId = wx.getStorageSync('userId')
const orders = wx.getStorageSync('orders') || []
const pendingOrders = wx.getStorageSync('pending_orders') || []

console.log('当前用户ID:', currentUserId)
console.log('orders 数量:', orders.length)
console.log('pending_orders 数量:', pendingOrders.length)
console.log('')

// 查找所有待确认订单
console.log('【查找 waitingConfirm 订单】')

const waitingInOrders = orders.filter(o => o.status === 'waitingConfirm' && o.buyerId === currentUserId)
const waitingInPending = pendingOrders.filter(o => o.status === 'waitingConfirm' && o.buyerId === currentUserId)

console.log(`orders 中的 waitingConfirm: ${waitingInOrders.length} 个`)
console.log(`pending_orders 中的 waitingConfirm: ${waitingInPending.length} 个`)
console.log('')

if (waitingInOrders.length > 0) {
  console.log('✅ orders 中找到待确认订单:')
  waitingInOrders.forEach(order => {
    console.log(`  - ID: ${order.id}`)
    console.log(`    商品: ${order.productName}`)
    console.log(`    状态: ${order.status}`)
    console.log(`    buyerId: ${order.buyerId}`)
    console.log('')
  })
}

if (waitingInPending.length > 0) {
  console.log('✅ pending_orders 中找到待确认订单:')
  waitingInPending.forEach(order => {
    console.log(`  - ID: ${order.id}`)
    console.log(`    商品: ${order.productName}`)
    console.log(`    状态: ${order.status}`)
    console.log(`    buyerId: ${order.buyerId}`)
    console.log('')
  })
}

if (waitingInOrders.length === 0 && waitingInPending.length === 0) {
  console.log('⚠️  没有找到 waitingConfirm 订单！')
  console.log('')
  console.log('检查其他状态的订单:')
  
  const allOrders = [...orders, ...pendingOrders].filter(o => o.buyerId === currentUserId)
  const statusCounts = {}
  
  allOrders.forEach(order => {
    const status = order.status || 'unknown'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })
  
  console.log('当前用户的订单状态分布:')
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} 个`)
  })
  console.log('')
  
  // 详细显示每个订单
  console.log('所有订单详情:')
  allOrders.forEach((order, index) => {
    console.log(`\n  订单 ${index + 1}:`)
    console.log(`    ID: ${order.id}`)
    console.log(`    商品: ${order.productName}`)
    console.log(`    状态: ${order.status}`)
    console.log(`    buyerId: ${order.buyerId}`)
  })
}

console.log('\n═══════════════════════════════════════════')
console.log('✅ 检查完成')
console.log('═══════════════════════════════════════════\n\n')

console.log('💡 说明:')
console.log('如果找到了 waitingConfirm 订单，但页面没有高亮：')
console.log('  1. 检查 WXML 中的 class 绑定是否正确')
console.log('  2. 检查 CSS 样式是否正确加载')
console.log('  3. 检查订单列表渲染逻辑')
console.log('')
