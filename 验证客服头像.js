// ========================================
// 👤 客服头像数据完整性检查脚本
// ========================================
// 复制到微信开发者工具控制台执行

console.log('\n========================================')
console.log('👤 客服头像数据完整性检查')
console.log('========================================\n')

// 1. 检查客服列表数据
const serviceList = wx.getStorageSync('customer_service_list') || []
console.log(`📋 客服列表: ${serviceList.length} 个\n`)

serviceList.forEach((service, index) => {
  console.log(`客服 ${index + 1}: ${service.name}`)
  console.log(`  - userId: ${service.userId}`)
  console.log(`  - avatar: ${service.avatar ? '✅ 有' : '❌ 无'}`)
  console.log(`  - avatarUrl: ${service.avatarUrl ? '✅ 有' : '❌ 无'}`)
  if (service.avatar) {
    const avatarType = service.avatar.substring(0, 30) + '...'
    console.log(`  - 头像数据: ${avatarType}`)
  }
  console.log('')
})

// 2. 检查订单中的客服头像
const orders = wx.getStorageSync('orders') || []
const pendingOrders = wx.getStorageSync('pending_orders') || []
const allOrders = [...orders, ...pendingOrders]

console.log(`📦 订单列表: ${allOrders.length} 个\n`)

let missingAvatarCount = 0
allOrders.forEach((order, index) => {
  if (order.serviceId) {
    const hasAvatar = order.serviceAvatar && order.serviceAvatar !== '/assets/default-avatar.png'
    if (!hasAvatar) {
      console.log(`❌ 订单 ${order.id} 客服头像缺失`)
      console.log(`   - serviceId: ${order.serviceId}`)
      console.log(`   - serviceName: ${order.serviceName || '无'}`)
      console.log(`   - serviceAvatar: ${order.serviceAvatar || '无'}`)
      
      // 尝试从客服列表查找
      const service = serviceList.find(s => s.userId === order.serviceId)
      if (service) {
        console.log(`   ℹ️ 在客服列表中找到: ${service.name}`)
        console.log(`   - service.avatar: ${service.avatar ? '有' : '无'}`)
      } else {
        console.log(`   ⚠️ 在客服列表中未找到`)
      }
      
      missingAvatarCount++
      console.log('')
    }
  }
})

if (missingAvatarCount > 0) {
  console.log(`⚠️ 发现 ${missingAvatarCount} 个订单的客服头像缺失`)
  console.log('建议：重新下单测试')
} else {
  console.log('✅ 所有订单客服头像完整\n')
}

// 3. 检查字段名一致性
console.log('========================================')
console.log('🔧 字段名一致性检查')
console.log('========================================\n')

const hasAvatarField = serviceList.some(s => s.avatar)
const hasAvatarUrlField = serviceList.some(s => s.avatarUrl)

console.log(`avatar 字段: ${hasAvatarField ? '✅ 使用中' : '❌ 未使用'}`)
console.log(`avatarUrl 字段: ${hasAvatarUrlField ? '⚠️ 混用' : '✅ 未使用'}`)

if (hasAvatarField && !hasAvatarUrlField) {
  console.log('\n✅ 字段命名一致')
} else if (hasAvatarField && hasAvatarUrlField) {
  console.log('\n⚠️ 字段命名混用，建议统一为 avatar')
} else {
  console.log('\n❌ 未找到头像字段')
}

// 4. 统计摘要
console.log('\n========================================')
console.log('📊 统计摘要')
console.log('========================================\n')

console.log(`客服总数: ${serviceList.length}`)
console.log(`有头像的客服: ${serviceList.filter(s => s.avatar || s.avatarUrl).length}`)
console.log(`订单总数: ${allOrders.length}`)
console.log(`有客服的订单: ${allOrders.filter(o => o.serviceId).length}`)
console.log(`客服头像缺失的订单: ${missingAvatarCount}`)

console.log('\n========================================\n')
