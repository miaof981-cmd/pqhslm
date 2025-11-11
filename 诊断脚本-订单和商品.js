/**
 * 🔍 订单和商品诊断脚本
 * 在开发者工具控制台运行此脚本
 */

console.log('========================================')
console.log('🔍 开始诊断：订单显示不全 + 商品搜索缺失')
console.log('========================================')

// 1. 检查所有存储源的订单
const legacyOrders = wx.getStorageSync('mock_orders') || []
const orders = wx.getStorageSync('orders') || []
const pendingOrders = wx.getStorageSync('pending_orders') || []
const completedOrders = wx.getStorageSync('completed_orders') || []

console.log('\n📦 订单数据源统计:')
console.log('  mock_orders:', legacyOrders.length, '个')
console.log('  orders:', orders.length, '个')
console.log('  pending_orders:', pendingOrders.length, '个')
console.log('  completed_orders:', completedOrders.length, '个')
console.log('  总数:', legacyOrders.length + orders.length + pendingOrders.length + completedOrders.length)

// 2. 检查订单ID是否重复
const allOrdersRaw = [...legacyOrders, ...orders, ...pendingOrders, ...completedOrders]
const orderIdCount = {}
allOrdersRaw.forEach(order => {
  if (order && order.id) {
    orderIdCount[order.id] = (orderIdCount[order.id] || 0) + 1
  }
})

console.log('\n🔍 订单ID重复检查:')
const duplicateIds = Object.keys(orderIdCount).filter(id => orderIdCount[id] > 1)
if (duplicateIds.length > 0) {
  console.log('  ❌ 发现重复ID:', duplicateIds.length, '个')
  duplicateIds.forEach(id => {
    console.log('    - 订单', id, '出现', orderIdCount[id], '次')
    
    // 找出所有重复的订单
    const duplicates = allOrdersRaw.filter(o => o && o.id === id)
    duplicates.forEach((dup, index) => {
      console.log(`      [副本${index + 1}]`, {
        来源: dup._source || '未知',
        buyerId: dup.buyerId,
        artistId: dup.artistId,
        status: dup.status,
        productName: dup.productName
      })
    })
  })
} else {
  console.log('  ✅ 无重复ID')
}

// 3. 检查订单的buyerId和artistId
const userId = wx.getStorageSync('userId')
console.log('\n👤 当前用户信息:')
console.log('  userId:', userId, '(类型:', typeof userId, ')')

console.log('\n📋 订单详细信息:')
const uniqueOrders = [...new Map(allOrdersRaw.filter(o => o && o.id).map(o => [o.id, o])).values()]
uniqueOrders.forEach((order, index) => {
  const buyerMatch = String(order.buyerId) === String(userId)
  const artistMatch = String(order.artistId) === String(userId)
  
  console.log(`  [${index + 1}] 订单 ${order.id}:`)
  console.log('    - productName:', order.productName || '未知')
  console.log('    - buyerId:', order.buyerId, '(类型:', typeof order.buyerId, ') →', buyerMatch ? '✅匹配用户' : '❌不匹配')
  console.log('    - artistId:', order.artistId, '(类型:', typeof order.artistId, ') →', artistMatch ? '✅匹配用户' : '❌不匹配')
  console.log('    - status:', order.status)
})

// 4. 检查商品和画师编号映射
const products = wx.getStorageSync('mock_products') || []
const applications = wx.getStorageSync('artist_applications') || []

console.log('\n🎨 商品-画师编号映射检查:')
console.log('  商品总数:', products.length)
console.log('  画师申请总数:', applications.length)

products.forEach((product, index) => {
  const app = applications.find(a => String(a.userId) === String(product.artistId))
  const hasNumber = app && app.artistNumber
  
  console.log(`  [${index + 1}] ${product.name}:`)
  console.log('    - productId:', product.id)
  console.log('    - artistId:', product.artistId)
  console.log('    - 找到画师申请:', !!app ? '✅' : '❌')
  console.log('    - 画师编号:', hasNumber ? app.artistNumber : '❌ 缺失')
  
  if (!hasNumber) {
    console.log('    ⚠️ 此商品无法通过画师编号搜索！')
  }
})

// 5. 检查画师编号1的商品
console.log('\n🔎 画师编号"1"的商品:')
const artistNumber1Products = products.filter(p => {
  const app = applications.find(a => String(a.userId) === String(p.artistId))
  return app && String(app.artistNumber) === '1'
})

console.log('  找到', artistNumber1Products.length, '个商品')
artistNumber1Products.forEach(p => {
  console.log('    -', p.name, '(ID:', p.id, ')')
})

console.log('\n========================================')
console.log('✅ 诊断完成，请截图或复制以上信息')
console.log('========================================')

