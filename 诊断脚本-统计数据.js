// 诊断仪表盘统计数据问题
// 在小程序开发者工具的控制台执行

console.log('========================================')
console.log('📊 诊断仪表盘统计数据')
console.log('========================================')

// 1️⃣ 获取所有订单
const allOrders = wx.getStorageSync('pending_orders') || []
console.log(`\n📦 总订单数: ${allOrders.length}`)

// 2️⃣ 统计订单状态分布
const statusCount = {}
allOrders.forEach(order => {
  const status = order.status || '未知'
  statusCount[status] = (statusCount[status] || 0) + 1
})

console.log('\n📊 订单状态分布:')
Object.keys(statusCount).sort().forEach(status => {
  console.log(`   ${status}: ${statusCount[status]}个`)
})

// 3️⃣ 检查已完成订单
const completedOrders = allOrders.filter(o => o.status === 'completed')
console.log(`\n✅ 已完成订单: ${completedOrders.length}个`)

if (completedOrders.length > 0) {
  console.log('\n已完成订单详情:')
  completedOrders.forEach((order, index) => {
    console.log(`   ${index + 1}. ${order.productName}`)
    console.log(`      订单ID: ${order.id}`)
    console.log(`      画师ID: ${order.artistId || '❌ 缺失'}`)
    console.log(`      画师名: ${order.artistName || '❌ 缺失'}`)
    console.log(`      金额: ${order.price || order.totalAmount || '❌ 缺失'}`)
  })
}

// 4️⃣ 获取画师申请
const applications = wx.getStorageSync('artist_applications') || []
const approvedArtists = applications.filter(app => app.status === 'approved')
console.log(`\n👨‍🎨 已通过画师: ${approvedArtists.length}位`)

// 5️⃣ 统计每个画师的订单
console.log('\n📊 画师订单统计:')
const products = wx.getStorageSync('mock_products') || []

approvedArtists.forEach(artist => {
  // 多重匹配策略
  const artistOrders = allOrders.filter(o => {
    // 策略1: 直接匹配 artistId
    if (o.artistId && String(o.artistId) === String(artist.userId)) {
      return true
    }
    
    // 策略2: 通过商品ID查找
    if (o.productId) {
      const orderProduct = products.find(p => String(p.id) === String(o.productId))
      if (orderProduct && String(orderProduct.artistId) === String(artist.userId)) {
        return true
      }
    }
    
    // 策略3: 通过画师姓名匹配
    if (o.artistName && o.artistName === artist.name) {
      return true
    }
    
    return false
  })
  
  const completed = artistOrders.filter(o => o.status === 'completed')
  const totalRevenue = completed.reduce((sum, order) => {
    const amount = parseFloat(order.price || order.totalAmount || order.totalPrice || 0)
    return sum + amount
  }, 0)
  
  console.log(`\n   ${artist.name} (userId: ${artist.userId}):`)
  console.log(`      总订单: ${artistOrders.length}个`)
  console.log(`      已完成: ${completed.length}个`)
  console.log(`      总收入: ¥${totalRevenue.toFixed(2)}`)
  
  if (artistOrders.length > 0) {
    console.log(`      订单状态分布:`)
    const artistStatusCount = {}
    artistOrders.forEach(o => {
      const status = o.status || '未知'
      artistStatusCount[status] = (artistStatusCount[status] || 0) + 1
    })
    Object.keys(artistStatusCount).forEach(status => {
      console.log(`         ${status}: ${artistStatusCount[status]}个`)
    })
  }
})

// 6️⃣ 检查待处理订单计数
const pendingStatuses = ['unpaid', 'paid', 'processing', 'inProgress', 'waitingConfirm', 'nearDeadline']
const pendingOrders = allOrders.filter(o => pendingStatuses.includes(o.status))
console.log(`\n⏳ 待处理订单: ${pendingOrders.length}个`)
console.log('   包含状态:', pendingStatuses.join(', '))

// 7️⃣ 检查是否有重复订单
const orderIds = allOrders.map(o => o.id)
const uniqueIds = new Set(orderIds)
if (orderIds.length !== uniqueIds.size) {
  console.log(`\n⚠️ 发现重复订单: ${orderIds.length - uniqueIds.size}个`)
  const duplicates = orderIds.filter((id, index) => orderIds.indexOf(id) !== index)
  console.log('   重复的订单ID:', [...new Set(duplicates)])
} else {
  console.log(`\n✅ 没有重复订单`)
}

// 8️⃣ 总结
console.log('\n========================================')
console.log('📋 诊断总结')
console.log('========================================')
console.log(`总订单数: ${allOrders.length}`)
console.log(`待处理订单: ${pendingOrders.length}`)
console.log(`已完成订单: ${completedOrders.length}`)
console.log(`画师数: ${approvedArtists.length}`)
console.log(`\n💡 如果画师排行榜为0，可能原因:`)
console.log(`   1. 没有已完成订单（收入统计只计算已完成订单）`)
console.log(`   2. 订单的 artistId 与画师的 userId 不匹配`)
console.log(`   3. 订单的 status 不是 'completed'`)
console.log(`   4. 订单的 price/totalAmount 字段缺失或为0`)

