// ========================================
// 创建测试订单 - 控制台脚本
// ========================================

// 获取当前用户信息
const userInfo = wx.getStorageSync('userInfo') || { nickName: '测试用户', avatarUrl: '/assets/default-avatar.png' }
const userId = wx.getStorageSync('userId') || 1001

// 获取现有订单
let pendingOrders = wx.getStorageSync('pending_orders') || []

// 辅助函数：生成订单号
function generateOrderId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${year}${month}${day}${hour}${minute}${second}${random}`
}

// 辅助函数：格式化日期
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

// 辅助函数：计算日期
function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

console.log('========================================')
console.log('开始创建测试订单')
console.log('========================================')

// 订单1：已经脱稿（超期2天）
const order1CreateTime = addDays(new Date(), -9) // 9天前下单
const order1Deadline = addDays(new Date(), -2)   // 2天前截稿（7天出稿）
const order1 = {
  id: generateOrderId(),
  productId: 'test-001',
  productName: '【已脱稿测试】赛博朋克风格头像',
  productImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  price: 88,
  quantity: 1,
  spec: '全身 / 1920x1080',
  deliveryDays: 7,
  createTime: formatDate(order1CreateTime),
  deadline: formatDate(order1Deadline),
  status: 'overdue',
  statusText: '已拖稿',
  buyerId: userId,
  buyerName: userInfo.nickName,
  buyerAvatar: userInfo.avatarUrl,
  buyerOpenId: 'test-openid-buyer',
  artistId: userId,
  artistName: userInfo.nickName,
  artistAvatar: userInfo.avatarUrl,
  serviceId: null,
  serviceName: '待分配',
  serviceAvatar: '/assets/default-avatar.png',
  workCompleted: false
}

// 订单2：临近截稿（还有12小时）
const order2CreateTime = addDays(new Date(), -6.5) // 6.5天前下单
const order2Deadline = addDays(new Date(), 0.5)     // 12小时后截稿（7天出稿）
const order2 = {
  id: generateOrderId(),
  productId: 'test-002',
  productName: '【临近截稿测试】动漫风格插画',
  productImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  price: 168,
  quantity: 1,
  spec: '半身 / 竖屏',
  deliveryDays: 7,
  createTime: formatDate(order2CreateTime),
  deadline: formatDate(order2Deadline),
  status: 'nearDeadline',
  statusText: '临近截稿',
  buyerId: userId,
  buyerName: userInfo.nickName,
  buyerAvatar: userInfo.avatarUrl,
  buyerOpenId: 'test-openid-buyer',
  artistId: userId,
  artistName: userInfo.nickName,
  artistAvatar: userInfo.avatarUrl,
  serviceId: null,
  serviceName: '待分配',
  serviceAvatar: '/assets/default-avatar.png',
  workCompleted: false
}

// 添加到订单列表
pendingOrders.push(order1, order2)

// 保存到本地存储
wx.setStorageSync('pending_orders', pendingOrders)

console.log('✅ 成功创建 2 个测试订单')
console.log('')
console.log('📦 订单1（已脱稿）:')
console.log('  - 订单号:', order1.id)
console.log('  - 商品名:', order1.productName)
console.log('  - 下单时间:', order1.createTime)
console.log('  - 截稿时间:', order1.deadline)
console.log('  - 状态:', order1.statusText, '🔴')
console.log('  - 脱稿天数: 2天')
console.log('')
console.log('📦 订单2（临近截稿）:')
console.log('  - 订单号:', order2.id)
console.log('  - 商品名:', order2.productName)
console.log('  - 下单时间:', order2.createTime)
console.log('  - 截稿时间:', order2.deadline)
console.log('  - 状态:', order2.statusText, '🟡')
console.log('  - 剩余时间: 约12小时')
console.log('')
console.log('========================================')
console.log('请刷新工作台页面查看效果')
console.log('或执行: wx.reLaunch({ url: \'/pages/workspace/index\' })')
console.log('========================================')

// 自动刷新工作台
wx.reLaunch({ url: '/pages/workspace/index' })

