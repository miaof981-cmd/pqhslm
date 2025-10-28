/**
 * 📋 订单数据完整性检查脚本
 * 
 * 用途：诊断为什么某些订单不显示
 * 在微信开发者工具控制台执行
 */

console.log('\n\n═══════════════════════════════════════════')
console.log('🔍 订单数据完整性检查')
console.log('═══════════════════════════════════════════\n')

// 1. 获取当前用户信息
const userId = wx.getStorageSync('userId')
const userInfo = wx.getStorageSync('userInfo')

console.log('【1】当前用户信息')
console.log(`用户ID: ${userId}`)
console.log(`昵称: ${userInfo?.nickName || '未知'}`)
console.log('')

// 2. 获取所有存储源的订单
const orders = wx.getStorageSync('orders') || []
const pendingOrders = wx.getStorageSync('pending_orders') || []
const completedOrders = wx.getStorageSync('completed_orders') || []

console.log('【2】订单存储源统计')
console.log(`orders: ${orders.length} 个`)
console.log(`pending_orders: ${pendingOrders.length} 个`)
console.log(`completed_orders: ${completedOrders.length} 个`)
console.log(`总计: ${orders.length + pendingOrders.length + completedOrders.length} 个`)
console.log('')

// 3. 合并所有订单
const allOrdersArray = [...orders, ...pendingOrders, ...completedOrders]

// 4. 检查每个订单的关键字段
console.log('【3】订单详细信息')
allOrdersArray.forEach((order, index) => {
  console.log(`\n--- 订单 ${index + 1} ---`)
  console.log(`订单ID: ${order.id}`)
  console.log(`商品名: ${order.productName}`)
  console.log(`状态: ${order.status}`)
  console.log(`buyerId: ${order.buyerId}`)
  console.log(`artistId: ${order.artistId || '未分配'}`)
  console.log(`serviceId: ${order.serviceId || '未分配'}`)
  
  // 🔍 关键检查：buyerId 是否匹配
  const isMatchingBuyer = order.buyerId === userId
  console.log(`✅ buyerId匹配: ${isMatchingBuyer ? '是' : '❌ 否'}`)
  
  // 检查可能的问题
  const issues = []
  if (!order.buyerId) issues.push('缺少 buyerId')
  if (!order.status) issues.push('缺少 status')
  if (order.buyerId && order.buyerId !== userId) {
    issues.push(`buyerId不匹配（期望:${userId}, 实际:${order.buyerId}）`)
  }
  
  if (issues.length > 0) {
    console.log(`⚠️  问题: ${issues.join(', ')}`)
  }
})

// 5. 应用相同的过滤逻辑
console.log('\n\n【4】过滤结果模拟')
const filteredOrders = allOrdersArray.filter(o => o.buyerId === userId)
console.log(`过滤前: ${allOrdersArray.length} 个订单`)
console.log(`过滤后: ${filteredOrders.length} 个订单`)
console.log(`被过滤掉: ${allOrdersArray.length - filteredOrders.length} 个`)

if (allOrdersArray.length > filteredOrders.length) {
  console.log('\n被过滤掉的订单:')
  allOrdersArray.forEach((order, index) => {
    if (order.buyerId !== userId) {
      console.log(`  - 订单${index + 1}: ${order.productName} (buyerId: ${order.buyerId})`)
    }
  })
}

// 6. 按状态分组
console.log('\n\n【5】订单状态分组')
const statusGroups = {}
filteredOrders.forEach(order => {
  const status = order.status || 'unknown'
  if (!statusGroups[status]) {
    statusGroups[status] = []
  }
  statusGroups[status].push(order.productName)
})

Object.entries(statusGroups).forEach(([status, orders]) => {
  console.log(`${status}: ${orders.length} 个`)
  orders.forEach(name => console.log(`  - ${name}`))
})

// 7. 检查待确认订单
console.log('\n\n【6】待确认订单检查')
const waitingConfirmOrders = filteredOrders.filter(o => o.status === 'waitingConfirm')
console.log(`待确认订单数量: ${waitingConfirmOrders.length}`)

if (waitingConfirmOrders.length > 0) {
  waitingConfirmOrders.forEach(order => {
    console.log(`  ✅ 找到: ${order.productName}`)
  })
} else {
  console.log('  ⚠️  没有找到 status === "waitingConfirm" 的订单')
  
  // 检查是否有其他类似状态
  const similarStatuses = filteredOrders.filter(o => 
    o.status && (
      o.status.includes('waiting') || 
      o.status.includes('confirm') ||
      o.status === 'completed' ||
      o.status === 'processing'
    )
  )
  
  if (similarStatuses.length > 0) {
    console.log('  💡 找到类似状态的订单:')
    similarStatuses.forEach(order => {
      console.log(`    - ${order.productName}: ${order.status}`)
    })
  }
}

console.log('\n\n═══════════════════════════════════════════')
console.log('✅ 检查完成')
console.log('═══════════════════════════════════════════\n\n')

// 8. 输出诊断建议
console.log('💡 诊断建议:')
console.log('')

if (allOrdersArray.length > filteredOrders.length) {
  console.log('⚠️  有订单被过滤掉了！')
  console.log('原因: buyerId 不匹配当前用户ID')
  console.log('解决: 检查订单创建时是否正确设置了 buyerId')
  console.log('')
}

if (filteredOrders.length === 0) {
  console.log('⚠️  过滤后没有任何订单！')
  console.log('可能原因:')
  console.log('  1. 所有订单的 buyerId 都不是当前用户')
  console.log('  2. userId 获取错误')
  console.log('  3. 订单数据损坏')
  console.log('')
}

if (waitingConfirmOrders.length === 0 && filteredOrders.length > 0) {
  console.log('💡 没有待确认订单，可能原因:')
  console.log('  1. 订单状态不是 "waitingConfirm"')
  console.log('  2. 状态已经变更为其他值')
  console.log('  3. 检查订单创建/更新逻辑')
  console.log('')
}

console.log('🔧 建议操作:')
console.log('  1. 检查订单创建时的 buyerId 设置')
console.log('  2. 检查订单状态更新逻辑')
console.log('  3. 确认 userId 是否正确')
console.log('  4. 查看控制台输出的详细订单信息')

