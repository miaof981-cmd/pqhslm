// ═══════════════════════════════════════════════════════════
// 订单消失问题诊断脚本
// ═══════════════════════════════════════════════════════════

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔍 订单消失问题诊断')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// 1. 检查当前用户信息
const currentUserId = wx.getStorageSync('userId')
const userInfo = wx.getStorageSync('userInfo') || {}
const userRoles = wx.getStorageSync('userRoles') || []

console.log('\n📱 当前用户信息:')
console.log('- 用户ID:', currentUserId)
console.log('- 昵称:', userInfo.nickName)
console.log('- 角色:', userRoles)

// 2. 检查所有订单
const allOrders = wx.getStorageSync('pending_orders') || []
console.log('\n📦 本地存储订单总数:', allOrders.length)

if (allOrders.length === 0) {
  console.log('❌ 本地存储中没有任何订单！')
  console.log('\n可能原因:')
  console.log('1. 订单数据被清空')
  console.log('2. 订单保存失败')
  console.log('3. 存储被重置')
} else {
  console.log('\n✅ 本地存储有订单，详细信息:')
  
  allOrders.forEach((order, index) => {
    console.log(`\n订单 ${index + 1}:`)
    console.log('- 订单号:', order.id)
    console.log('- 商品名:', order.productName)
    console.log('- buyerId:', order.buyerId || '❌ 缺失')
    console.log('- artistId:', order.artistId || '❌ 缺失')
    console.log('- serviceId:', order.serviceId || '(空)')
    console.log('- 买家昵称:', order.buyerName)
    console.log('- 画师昵称:', order.artistName)
  })
  
  // 3. 诊断筛选问题
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔬 筛选逻辑诊断')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  // 假设用户是画师
  const artistOrders = allOrders.filter(o => o.artistId === currentUserId)
  console.log('\n画师订单筛选结果:')
  console.log('- 筛选条件: artistId ===', currentUserId)
  console.log('- 筛选结果:', artistOrders.length, '个订单')
  
  if (artistOrders.length === 0 && allOrders.length > 0) {
    console.log('\n❌ 问题发现: 订单存在但筛选后为空！')
    console.log('\n原因分析:')
    
    // 检查是否所有订单都缺少 artistId
    const missingArtistId = allOrders.filter(o => !o.artistId)
    if (missingArtistId.length > 0) {
      console.log(`❌ 有 ${missingArtistId.length} 个订单缺少 artistId`)
      console.log('这些订单是旧数据，需要修复或重新创建')
    }
    
    // 检查 artistId 是否匹配
    const uniqueArtistIds = [...new Set(allOrders.map(o => o.artistId).filter(Boolean))]
    console.log('\n订单中存在的 artistId:', uniqueArtistIds)
    console.log('当前用户 userId:', currentUserId)
    
    if (!uniqueArtistIds.includes(currentUserId)) {
      console.log('❌ 当前用户ID不在订单的 artistId 列表中')
      console.log('可能原因: 这些订单不属于当前用户')
    }
  } else if (artistOrders.length > 0) {
    console.log('\n✅ 筛选正常，找到', artistOrders.length, '个订单')
  }
}

// 4. 提供解决方案
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔧 解决方案')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

if (allOrders.length === 0) {
  console.log('\n方案1: 恢复订单数据')
  console.log('如果有备份，请恢复；否则需要重新下单')
  
} else {
  const missingArtistId = allOrders.filter(o => !o.artistId)
  
  if (missingArtistId.length > 0) {
    console.log('\n方案2: 修复旧订单数据（添加 artistId）')
    console.log('执行以下代码:')
    console.log(`
// 修复订单数据
const currentUserId = wx.getStorageSync('userId')
let orders = wx.getStorageSync('pending_orders') || []

console.log('修复前:', orders.length, '个订单')

// 为缺少 artistId 的订单添加当前用户ID
orders = orders.map(order => {
  if (!order.artistId) {
    console.log('修复订单:', order.id)
    return {
      ...order,
      artistId: currentUserId,  // 假设是当前用户的订单
      artistAvatar: order.artistAvatar || '/assets/default-avatar.png'
    }
  }
  return order
})

wx.setStorageSync('pending_orders', orders)
console.log('✅ 修复完成，请刷新工作台页面')

// 刷新页面
wx.reLaunch({ url: '/pages/workspace/index' })
    `)
  }
  
  console.log('\n方案3: 临时禁用筛选（查看所有订单）')
  console.log('如果需要紧急查看所有订单，可以修改代码:')
  console.log('将 myOrders = allOrders.filter(...) 改为 myOrders = allOrders')
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📞 诊断完成')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

