/**
 * 快速迁移测试脚本
 * 在开发者工具控制台执行，测试双模式切换
 */

// ========== 测试1: 测试环境配置 ==========
async function testConfig() {
  const config = require('./miniprogram/config/env.js')
  console.log('📋 环境配置:', config)
  console.log('  - 云环境ID:', config.cloudEnvId)
  console.log('  - 使用Mock数据:', config.useMockData)
  console.log('  - 紧急降级:', config.emergencyFallback)
  console.log('  - 集合列表:', Object.keys(config.collections).length, '个')
}

// ========== 测试2: 测试API调用（Mock模式） ==========
async function testApiMockMode() {
  const api = require('./miniprogram/utils/api.js')
  
  console.log('\n📦 测试API调用（Mock模式）...')
  
  // 测试获取订单列表
  try {
    const orders = await api.getOrderList()
    console.log('✅ 获取订单列表成功:', orders.length, '个订单')
  } catch (error) {
    console.error('❌ 获取订单列表失败:', error)
  }
  
  // 测试获取商品列表
  try {
    const products = await api.getProductList()
    console.log('✅ 获取商品列表成功:', products.length, '个商品')
  } catch (error) {
    console.error('❌ 获取商品列表失败:', error)
  }
  
  // 测试获取用户信息
  try {
    const userId = wx.getStorageSync('userId')
    const userInfo = await api.getUserInfo(userId)
    console.log('✅ 获取用户信息成功:', userInfo ? userInfo.nickName : '未找到')
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error)
  }
}

// ========== 测试3: 测试时间格式化 ==========
function testDateFormatter() {
  const formatter = require('./miniprogram/utils/date-formatter.js')
  
  console.log('\n⏰ 测试时间格式化...')
  
  const testDate = '2025-11-12 10:30:00'
  
  // 测试iOS兼容解析
  const parsed = formatter.parseDate(testDate)
  console.log('  parseDate:', parsed)
  
  // 测试展示格式
  const display = formatter.formatDateToDisplay(testDate)
  console.log('  formatDateToDisplay:', display)
  
  // 测试短格式
  const short = formatter.formatDateToShort(testDate)
  console.log('  formatDateToShort:', short)
  
  // 测试相对时间
  const relative = formatter.formatRelativeTime(testDate)
  console.log('  formatRelativeTime:', relative)
  
  // 测试剩余时间
  const future = '2025-11-15 10:30:00'
  const timeLeft = formatter.calculateTimeLeft(future)
  console.log('  calculateTimeLeft:', timeLeft)
  
  // 测试订单号生成
  const orderId = formatter.generateOrderId()
  console.log('  generateOrderId:', orderId)
}

// ========== 测试4: 测试缓存管理器 ==========
function testCacheManager() {
  const cache = require('./miniprogram/utils/cache-manager.js')
  
  console.log('\n💾 测试缓存管理器...')
  
  // 测试内存缓存
  cache.setMemory('test_key', { data: 'test_value' }, 1000)
  const cached = cache.getMemory('test_key')
  console.log('  内存缓存:', cached)
  
  // 测试Storage缓存
  cache.setStorage('test_storage', { data: 'storage_value' }, 5000)
  const storageCached = cache.getStorage('test_storage')
  console.log('  Storage缓存:', storageCached)
  
  // 测试缓存统计
  const stats = cache.getStats()
  console.log('  缓存统计:', stats)
  
  // 清理测试缓存
  cache.clear('test_key')
  cache.clear('test_storage')
  console.log('  ✅ 测试缓存已清理')
}

// ========== 测试5: 统计本地数据 ==========
function statsLocalData() {
  console.log('\n📊 统计本地数据...')
  
  const users = wx.getStorageSync('users') || []
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  const completedOrders = wx.getStorageSync('completed_orders') || []
  const products = wx.getStorageSync('mock_products') || []
  const applications = wx.getStorageSync('artist_applications') || []
  const categories = wx.getStorageSync('categories') || []
  const notices = wx.getStorageSync('notices') || []
  
  console.log('  - 用户:', users.length, '个')
  console.log('  - 待处理订单:', pendingOrders.length, '个')
  console.log('  - 已完成订单:', completedOrders.length, '个')
  console.log('  - 商品:', products.length, '个')
  console.log('  - 画师申请:', applications.length, '个')
  console.log('  - 分类:', categories.length, '个')
  console.log('  - 公告:', notices.length, '个')
  
  const total = users.length + pendingOrders.length + completedOrders.length + 
                products.length + applications.length + categories.length + notices.length
  
  console.log('  📦 总计:', total, '条数据')
  
  return {
    users: users.length,
    orders: pendingOrders.length + completedOrders.length,
    products: products.length,
    applications: applications.length,
    categories: categories.length,
    notices: notices.length,
    total
  }
}

// ========== 一键执行所有测试 ==========
async function runAllTests() {
  console.log('🚀 开始执行所有测试...\n')
  console.log('='.repeat(50))
  
  testConfig()
  console.log('\n' + '='.repeat(50))
  
  await testApiMockMode()
  console.log('\n' + '='.repeat(50))
  
  testDateFormatter()
  console.log('\n' + '='.repeat(50))
  
  testCacheManager()
  console.log('\n' + '='.repeat(50))
  
  const stats = statsLocalData()
  console.log('\n' + '='.repeat(50))
  
  console.log('\n✅ 所有测试完成！')
  console.log('📊 数据统计:', stats)
  
  return stats
}

// 导出测试函数
module.exports = {
  testConfig,
  testApiMockMode,
  testDateFormatter,
  testCacheManager,
  statsLocalData,
  runAllTests
}

// 使用说明
console.log(`
========================================
快速测试脚本使用说明
========================================

在开发者工具控制台执行：

1. 加载脚本
   const test = require('./快速迁移测试脚本.js')

2. 运行所有测试
   test.runAllTests()

3. 单独测试
   test.testConfig()          // 测试环境配置
   test.testApiMockMode()     // 测试API调用
   test.testDateFormatter()   // 测试时间格式化
   test.testCacheManager()    // 测试缓存管理
   test.statsLocalData()      // 统计本地数据

========================================
`)

