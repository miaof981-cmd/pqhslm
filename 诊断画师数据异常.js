// =========================================
// 🔍 诊断画师数据异常问题
// =========================================
// 在小程序控制台运行此脚本

(function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 开始诊断画师数据')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  
  // === 1. 检查画师申请数据 ===
  const applications = wx.getStorageSync('artist_applications') || []
  const approved = applications.filter(app => app.status === 'approved')
  
  console.log('📋 画师申请数据:')
  console.log(`  - 总申请数: ${applications.length}`)
  console.log(`  - 已通过数: ${approved.length}`)
  
  if (approved.length > 0) {
    approved.forEach((app, index) => {
      console.log(`  ${index + 1}. ${app.name} (userId: ${app.userId})`)
    })
  }
  console.log('')
  
  // === 2. 检查商品数据 ===
  const products = wx.getStorageSync('mock_products') || []
  console.log('📦 商品数据:')
  console.log(`  - 总商品数: ${products.length}`)
  
  const productsWithArtist = products.filter(p => p.artistId)
  const productsWithoutArtist = products.filter(p => !p.artistId)
  
  console.log(`  - 有artistId: ${productsWithArtist.length}`)
  console.log(`  - 缺artistId: ${productsWithoutArtist.length}`)
  
  if (productsWithoutArtist.length > 0) {
    console.log('  ⚠️ 以下商品缺少artistId:')
    productsWithoutArtist.forEach((p, i) => {
      console.log(`     ${i + 1}. ${p.name} (id: ${p.id})`)
    })
  }
  console.log('')
  
  // === 3. 检查订单数据 ===
  const orders = wx.getStorageSync('orders') || []
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  const completedOrders = wx.getStorageSync('completed_orders') || []
  
  const allOrders = [...orders, ...pendingOrders, ...completedOrders]
  
  console.log('📝 订单数据:')
  console.log(`  - orders: ${orders.length}`)
  console.log(`  - pending_orders: ${pendingOrders.length}`)
  console.log(`  - completed_orders: ${completedOrders.length}`)
  console.log(`  - 总订单数: ${allOrders.length}`)
  
  const ordersWithArtist = allOrders.filter(o => o.artistId)
  const ordersWithoutArtist = allOrders.filter(o => !o.artistId)
  
  console.log(`  - 有artistId: ${ordersWithArtist.length}`)
  console.log(`  - 缺artistId: ${ordersWithoutArtist.length}`)
  
  if (ordersWithoutArtist.length > 0) {
    console.log('  ⚠️ 以下订单缺少artistId:')
    ordersWithoutArtist.slice(0, 5).forEach((o, i) => {
      console.log(`     ${i + 1}. 订单${o.id} - ${o.productName}`)
    })
  }
  console.log('')
  
  // === 4. 按画师统计订单 ===
  if (approved.length > 0) {
    console.log('📊 画师订单统计:')
    approved.forEach(app => {
      const artistOrders = allOrders.filter(o => 
        String(o.artistId) === String(app.userId)
      )
      const completed = artistOrders.filter(o => o.status === 'completed')
      
      console.log(`  - ${app.name} (${app.userId}):`)
      console.log(`    订单数: ${artistOrders.length}`)
      console.log(`    已完成: ${completed.length}`)
      
      if (artistOrders.length > 0) {
        console.log(`    订单列表:`)
        artistOrders.slice(0, 3).forEach(o => {
          console.log(`      · ${o.id} - ${o.status}`)
        })
      }
    })
  }
  console.log('')
  
  // === 5. 提供修复建议 ===
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💡 修复建议:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (productsWithoutArtist.length > 0) {
    console.log('⚠️ 发现商品缺少artistId')
    console.log('   → 需要为商品补充artistId字段')
  }
  
  if (ordersWithoutArtist.length > 0) {
    console.log('⚠️ 发现订单缺少artistId')
    console.log('   → 需要从商品数据补充订单的artistId')
  }
  
  if (productsWithArtist.length > 0 && ordersWithArtist.length === 0) {
    console.log('⚠️ 商品有artistId但订单没有')
    console.log('   → 订单可能是在商品更新前创建的')
  }
  
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})()


