// ========================================
// 🧪 一键添加测试客服数据
// ========================================
// 复制到微信开发者工具控制台执行

const testService = {
  userId: 'svc-10001',
  id: 'svc-10001',
  serviceId: 'svc-10001',
  name: '联小客服',
  nickName: '联小客服',
  avatar: 'https://dummyimage.com/200x200/42a5f5/ffffff.png&text=Service',
  avatarUrl: 'https://dummyimage.com/200x200/42a5f5/ffffff.png&text=Service',
  isActive: true,
  serviceNumber: 1,
  qrcodeUrl: 'https://dummyimage.com/400x400/0d47a1/ffffff.png&text=Service+QR',
  qrcodeNumber: 'LXL-001'
}

console.log('\n========================================')
console.log('📦 添加测试客服数据')
console.log('========================================\n')

console.log('客服信息:')
console.log(`  - userId: ${testService.userId}`)
console.log(`  - name: ${testService.name}`)
console.log(`  - avatar: ${testService.avatar ? '✅ 有' : '❌ 无'}`)
console.log(`  - isActive: ${testService.isActive ? '在线' : '离线'}`)
console.log('')

wx.setStorageSync('customer_service_list', [testService])
wx.setStorageSync('service_list', [testService])

console.log('✅ 测试客服数据已添加')
console.log('🔄 请刷新"我的订单"页面查看效果')
console.log('')

// 验证
const savedList = wx.getStorageSync('customer_service_list') || []
console.log(`📊 验证: customer_service_list 有 ${savedList.length} 个客服`)

if (savedList.length > 0) {
  console.log('✅ 数据保存成功！')
  console.log('')
  console.log('💡 下一步:')
  console.log('1. 刷新"我的订单"页面')
  console.log('2. 客服头像应该会显示了')
  console.log('3. 如果还是不显示，可能是订单数据中没有保存 serviceAvatar')
  console.log('4. 可以重新下单测试')
} else {
  console.log('❌ 数据保存失败')
}

console.log('\n========================================\n')
