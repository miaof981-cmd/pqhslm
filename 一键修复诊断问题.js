// 一键修复诊断发现的问题
// 在小程序开发者工具的控制台执行此脚本

console.log('========================================')
console.log('🔧 开始修复诊断发现的问题')
console.log('========================================')

// 问题订单ID列表（从诊断结果中提取）
const problemOrderIds = [
  '202511021945117568',  // 测试橱窗1号 等2件商品 - 缺失画师ID
  '202511021950373573',  // 111 - 商品不存在
  '202511102126000729',  // 测试橱窗1号 - 客服未分配 + 缺失画师ID
  '202511111139246415'   // 测试橱窗1号 - 客服未分配 + 缺失画师ID
]

// 1️⃣ 获取所有订单
const allOrders = wx.getStorageSync('pending_orders') || []
console.log(`📦 总订单数: ${allOrders.length}`)

// 2️⃣ 获取商品表
const products = wx.getStorageSync('mock_products') || []
console.log(`🛍️ 商品总数: ${products.length}`)

// 3️⃣ 获取客服列表
const services = wx.getStorageSync('customer_service_list') || []
console.log(`👥 客服总数: ${services.length}`)

// 确保至少有一个在线客服
if (services.length === 0) {
  console.error('❌ 没有客服，无法修复')
} else {
  // 确保至少有一个客服在线
  const activeServices = services.filter(s => s.isActive)
  if (activeServices.length === 0) {
    console.log('⚠️ 所有客服离线，强制第一个客服上线')
    services[0].isActive = true
    wx.setStorageSync('customer_service_list', services)
    wx.setStorageSync('service_list', services)
  }
}

let fixedCount = 0
let deletedCount = 0

// 4️⃣ 遍历问题订单并修复
problemOrderIds.forEach(orderId => {
  const orderIndex = allOrders.findIndex(o => o.id === orderId)
  
  if (orderIndex === -1) {
    console.log(`⚠️ 订单 ${orderId} 不存在，跳过`)
    return
  }
  
  const order = allOrders[orderIndex]
  console.log(`\n🔍 检查订单: ${order.id}`)
  console.log(`   商品名: ${order.productName}`)
  console.log(`   商品ID: ${order.productId}`)
  
  // 🎯 检查商品是否存在
  const product = products.find(p => String(p.id) === String(order.productId))
  
  if (!product) {
    console.log(`   ❌ 商品不存在，删除订单`)
    allOrders.splice(orderIndex, 1)
    deletedCount++
    return
  }
  
  let modified = false
  
  // 🎯 修复画师信息
  if (!order.artistId || order.artistId === '缺失') {
    if (product.artistId) {
      order.artistId = product.artistId
      order.artistName = product.artistName || '画师'
      order.artistAvatar = product.artistAvatar || ''
      console.log(`   ✅ 修复画师ID: ${order.artistId}`)
      modified = true
    } else {
      console.log(`   ⚠️ 商品也没有画师ID，无法修复`)
    }
  }
  
  // 🎯 修复客服信息
  if (!order.serviceId || order.serviceName === '待分配' || order.serviceName === '客服未分配') {
    const activeServices = services.filter(s => s.isActive)
    if (activeServices.length > 0) {
      // Round-robin 分配
      const lastIndex = wx.getStorageSync('lastAssignedServiceIndex') || 0
      const nextIndex = (lastIndex + 1) % activeServices.length
      wx.setStorageSync('lastAssignedServiceIndex', nextIndex)
      
      const assignedService = activeServices[nextIndex]
      order.serviceId = assignedService.userId || assignedService.id
      order.serviceName = assignedService.name || assignedService.nickName || '在线客服'
      order.serviceAvatar = assignedService.avatar || assignedService.avatarUrl || ''
      order.serviceQrcodeUrl = assignedService.qrcodeUrl || ''
      order.serviceQrcodeNumber = assignedService.qrcodeNumber || null
      
      console.log(`   ✅ 分配客服: ${order.serviceName}`)
      modified = true
    } else {
      console.log(`   ⚠️ 没有在线客服，无法分配`)
    }
  }
  
  if (modified) {
    allOrders[orderIndex] = order
    fixedCount++
  }
})

// 5️⃣ 保存修复后的订单
if (fixedCount > 0 || deletedCount > 0) {
  wx.setStorageSync('pending_orders', allOrders)
  console.log('\n========================================')
  console.log('✅ 修复完成')
  console.log(`   修复订单数: ${fixedCount}`)
  console.log(`   删除订单数: ${deletedCount}`)
  console.log(`   剩余订单数: ${allOrders.length}`)
  console.log('========================================')
  console.log('💡 请刷新页面查看效果')
} else {
  console.log('\n========================================')
  console.log('ℹ️ 没有需要修复的订单')
  console.log('========================================')
}

// 6️⃣ 验证修复结果
console.log('\n🔍 验证修复结果:')
problemOrderIds.forEach(orderId => {
  const order = allOrders.find(o => o.id === orderId)
  if (!order) {
    console.log(`   ${orderId}: 已删除`)
  } else {
    const issues = []
    if (!order.artistId) issues.push('缺画师ID')
    if (!order.serviceId) issues.push('缺客服ID')
    if (issues.length === 0) {
      console.log(`   ${orderId}: ✅ 正常`)
    } else {
      console.log(`   ${orderId}: ⚠️ ${issues.join(', ')}`)
    }
  }
})

