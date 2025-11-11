/**
 * 🧹 清除重复订单验证脚本
 * 在开发者工具控制台运行此脚本
 */

console.log('========================================')
console.log('🧹 开始清理重复订单')
console.log('========================================')

// 1. 读取所有订单
const orders = wx.getStorageSync('orders') || []
const pendingOrders = wx.getStorageSync('pending_orders') || []
const completedOrders = wx.getStorageSync('completed_orders') || []

console.log('\n📦 清理前统计:')
console.log('  orders:', orders.length)
console.log('  pending_orders:', pendingOrders.length)
console.log('  completed_orders:', completedOrders.length)

// 2. 找出重复的订单ID
const allOrders = [...orders, ...pendingOrders, ...completedOrders]
const orderIdCount = {}
allOrders.forEach(o => {
  if (o && o.id) {
    orderIdCount[o.id] = (orderIdCount[o.id] || 0) + 1
  }
})

const duplicateIds = Object.keys(orderIdCount).filter(id => orderIdCount[id] > 1)
console.log('\n🔍 重复订单:', duplicateIds.length, '个')
duplicateIds.forEach(id => {
  console.log('  - 订单', id, '重复', orderIdCount[id], '次')
})

// 3. 清理策略：
// - 将所有订单按ID去重
// - inProgress/pending → pending_orders
// - completed → completed_orders
// - 清空orders（新逻辑不再使用这个存储）

const uniqueOrders = new Map()
allOrders.forEach(o => {
  if (o && o.id) {
    if (!uniqueOrders.has(o.id)) {
      uniqueOrders.set(o.id, o)
    }
  }
})

const cleanPending = []
const cleanCompleted = []

uniqueOrders.forEach(order => {
  if (order.status === 'completed') {
    cleanCompleted.push(order)
  } else {
    cleanPending.push(order)
  }
})

console.log('\n🧹 清理后统计:')
console.log('  pending_orders:', cleanPending.length)
console.log('  completed_orders:', cleanCompleted.length)
console.log('  orders: 0 (已清空)')

// 4. 保存清理后的数据
wx.setStorageSync('pending_orders', cleanPending)
wx.setStorageSync('completed_orders', cleanCompleted)
wx.setStorageSync('orders', [])  // 清空orders

console.log('\n✅ 清理完成！')
console.log('\n========================================')
console.log('📝 下一步验证：')
console.log('1. 重新加载小程序（编译）')
console.log('2. 下一个新订单')
console.log('3. 检查订单是否只在pending_orders中出现1次')
console.log('4. 检查用户中心/画师工作台能否看到订单')
console.log('========================================')

