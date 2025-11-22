// =========================================
// 🔧 修复订单的artistId字段
// =========================================
// 在小程序控制台运行此脚本

(function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 开始修复订单artistId')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  
  const products = wx.getStorageSync('mock_products') || []
  const productMap = new Map(products.map(p => [String(p.id), p]))
  
  let totalFixed = 0
  let totalOrders = 0
  
  // 修复函数
  function fixOrders(storageKey) {
    const orders = wx.getStorageSync(storageKey) || []
    totalOrders += orders.length
    
    if (orders.length === 0) return 0
    
    let fixed = 0
    const updatedOrders = orders.map(order => {
      // 如果订单已有artistId，跳过
      if (order.artistId) return order
      
      // 尝试从商品中获取artistId
      if (order.productId) {
        const product = productMap.get(String(order.productId))
        if (product && product.artistId) {
          console.log(`  ✓ 订单 ${order.id}: 从商品获取artistId = ${product.artistId}`)
          fixed++
          return {
            ...order,
            artistId: product.artistId,
            artistName: product.artistName || order.artistName,
            artistAvatar: product.artistAvatar || order.artistAvatar
          }
        }
      }
      
      // 无法修复
      console.log(`  ⚠️ 订单 ${order.id}: 无法获取artistId (商品ID: ${order.productId})`)
      return order
    })
    
    if (fixed > 0) {
      wx.setStorageSync(storageKey, updatedOrders)
      console.log(`  → 已保存 ${fixed} 个修复`)
    }
    
    return fixed
  }
  
  // 修复三个存储位置的订单
  console.log('📝 修复 orders:')
  totalFixed += fixOrders('orders')
  console.log('')
  
  console.log('📝 修复 pending_orders:')
  totalFixed += fixOrders('pending_orders')
  console.log('')
  
  console.log('📝 修复 completed_orders:')
  totalFixed += fixOrders('completed_orders')
  console.log('')
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 修复完成')
  console.log(`  - 总订单数: ${totalOrders}`)
  console.log(`  - 已修复: ${totalFixed}`)
  console.log(`  - 无需修复: ${totalOrders - totalFixed}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('💡 提示: 请返回管理后台页面，数据会自动刷新')
})()


