// ═══════════════════════════════════════════════════════════
// 控制台脚本：查看和修复用户信息
// ═══════════════════════════════════════════════════════════

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📱 查看当前用户信息')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// 1. 查看用户信息
const userInfo = wx.getStorageSync('userInfo') || {}
console.log('用户信息 (userInfo):')
console.log('- 昵称:', userInfo.nickName || '❌ 未设置')
console.log('- 头像:', userInfo.avatarUrl || '❌ 未设置')
console.log('- openid:', userInfo.openid || '❌ 未设置')

// 2. 查看订单数据
const orders = wx.getStorageSync('pending_orders') || []
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📦 当前订单数量:', orders.length)

if (orders.length > 0) {
  console.log('\n订单详情:')
  orders.forEach((order, index) => {
    console.log(`\n订单 ${index + 1}:`)
    console.log('- 订单号:', order.id)
    console.log('- 商品名:', order.productName)
    console.log('- 买家昵称:', order.buyerName || '❌ 未设置')
    console.log('- 买家头像:', order.buyerAvatar ? '✅ 已设置' : '❌ 未设置')
    console.log('- 客服昵称:', order.serviceName || '❌ 未设置')
    console.log('- 客服头像:', order.serviceAvatar ? '✅ 已设置' : '❌ 未设置')
  })
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔧 修复方案')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// 方案1：如果用户信息为空
if (!userInfo.nickName) {
  console.log('\n❌ 问题: 用户信息未设置')
  console.log('✅ 解决: 请先登录小程序')
  console.log('   1. 点击"我的"页面')
  console.log('   2. 点击头像区域登录')
  console.log('   3. 授权昵称和头像')
  console.log('\n或者手动设置测试数据:')
  console.log(`
wx.setStorageSync('userInfo', {
  nickName: '妙妙',
  avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/...',  // 你的微信头像URL
  openid: 'test-openid-123'
})
console.log('✅ 用户信息已设置')
  `)
}

// 方案2：如果订单数据不完整
if (orders.length > 0 && !orders[0].buyerName) {
  console.log('\n❌ 问题: 旧订单缺少买家信息')
  console.log('✅ 解决方案1: 清理旧订单，重新下单')
  console.log(`
// 清理旧订单
wx.removeStorageSync('pending_orders')
wx.removeStorageSync('completed_orders')
console.log('✅ 旧订单已清理，请重新下单')
  `)
  
  console.log('\n✅ 解决方案2: 修复现有订单数据')
  console.log(`
// 修复现有订单
const userInfo = wx.getStorageSync('userInfo') || {}
let orders = wx.getStorageSync('pending_orders') || []

orders = orders.map(order => ({
  ...order,
  buyerName: userInfo.nickName || '妙妙',
  buyerAvatar: userInfo.avatarUrl || '/assets/default-avatar.png',
  buyerOpenId: userInfo.openid || '',
  serviceName: order.serviceName || '待分配',
  serviceAvatar: order.serviceAvatar || '/assets/default-avatar.png'
}))

wx.setStorageSync('pending_orders', orders)
console.log('✅ 订单数据已修复，数量:', orders.length)

// 刷新页面
wx.reLaunch({ url: '/pages/workspace/index' })
  `)
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✨ 推荐操作流程')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('1. 确保已登录（设置 userInfo）')
console.log('2. 清理旧订单（执行方案1）')
console.log('3. 重新下单（会自动带上用户信息）')
console.log('4. 刷新工作台页面')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

