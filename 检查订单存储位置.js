/**
 * 🔍 检查订单存储在哪里
 */

console.log('\n\n═══════════════════════════════════════════')
console.log('🔍 检查订单存储位置')
console.log('═══════════════════════════════════════════\n')

const ordersData = wx.getStorageSync('orders') || []
const pendingData = wx.getStorageSync('pending_orders') || []
const completedData = wx.getStorageSync('completed_orders') || []

console.log('orders 数量:', ordersData.length)
console.log('pending_orders 数量:', pendingData.length)
console.log('completed_orders 数量:', completedData.length)
console.log('')

// 查找订单 202555845 开头的订单
const targetOrders = [
  ...ordersData.filter(o => o.id && o.id.toString().startsWith('202555845')),
  ...pendingData.filter(o => o.id && o.id.toString().startsWith('202555845')),
  ...completedData.filter(o => o.id && o.id.toString().startsWith('202555845'))
]

console.log('找到目标订单:', targetOrders.length, '个')
targetOrders.forEach((order, index) => {
  console.log(`\n订单 ${index + 1}:`)
  console.log('  ID:', order.id)
  console.log('  商品:', order.productName)
  console.log('  状态:', order.status)
  console.log('  workCompleted:', order.workCompleted ? '是' : '否')
  console.log('  存储位置:', ordersData.find(o => o.id === order.id) ? 'orders' : 
                           pendingData.find(o => o.id === order.id) ? 'pending_orders' :
                           'completed_orders')
})

console.log('\n═══════════════════════════════════════════\n')
