/**
 * 云数据库初始化脚本
 * 使用方法：在微信开发者工具的云开发控制台中执行
 */

// ========== 创建集合 ==========
const collections = [
  'users',              // 用户表
  'orders',             // 订单表
  'products',           // 商品表
  'artist_applications', // 画师申请表
  'categories',         // 分类表
  'notices',            // 公告表
  'banners',            // 轮播图表
  'income_ledger',      // 收入账本
  'withdraw_records',   // 提现记录
  'reward_records',     // 打赏记录
  'service_qrcodes',    // 客服二维码
  'buyer_shows'         // 买家秀
]

// ========== 索引配置 ==========
const indexes = {
  // users表索引
  users: [
    { keys: { userId: 1 }, unique: true },
    { keys: { openid: 1 }, unique: true }
  ],
  
  // orders表索引（⚠️ 重要）
  orders: [
    { keys: { orderId: 1 }, unique: true },
    { keys: { buyerId: 1 } },
    { keys: { artistId: 1 } },
    { keys: { serviceId: 1 } },
    { keys: { status: 1 } },
    { keys: { createTime: -1 } },
    { keys: { deadline: 1 } },
    // 复合索引（常用组合查询）
    { keys: { status: 1, createTime: -1 } },
    { keys: { buyerId: 1, status: 1 } },
    { keys: { artistId: 1, status: 1 } }
  ],
  
  // products表索引
  products: [
    { keys: { productId: 1 }, unique: true },
    { keys: { artistId: 1 } },
    { keys: { categoryId: 1 } },
    { keys: { status: 1 } }
  ],
  
  // artist_applications表索引
  artist_applications: [
    { keys: { userId: 1 }, unique: true },
    { keys: { artistNumber: 1 }, unique: true },
    { keys: { status: 1 } }
  ],
  
  // income_ledger表索引
  income_ledger: [
    { keys: { userId: 1 } },
    { keys: { orderId: 1 } },
    { keys: { incomeType: 1 } },
    { keys: { createTime: -1 } }
  ],
  
  // withdraw_records表索引
  withdraw_records: [
    { keys: { userId: 1 } },
    { keys: { status: 1 } },
    { keys: { time: -1 } }
  ]
}

// ========== 执行函数 ==========

/**
 * 步骤1: 创建集合
 * 在云开发控制台 → 数据库 → 手动创建上述集合
 * 或使用云函数自动创建（需要管理员权限）
 */
async function createCollections() {
  const db = wx.cloud.database()
  
  for (const collectionName of collections) {
    try {
      // 尝试获取集合（如果不存在会报错）
      await db.collection(collectionName).limit(1).get()
      console.log(`✅ 集合 ${collectionName} 已存在`)
    } catch (error) {
      // 集合不存在，创建它
      console.log(`📦 正在创建集合 ${collectionName}...`)
      // 注意：小程序端无法直接创建集合，需要在云开发控制台手动创建
      // 或使用云函数 + 管理端API创建
      console.log(`⚠️ 请在云开发控制台手动创建集合: ${collectionName}`)
    }
  }
}

/**
 * 步骤2: 创建索引
 * 在云开发控制台 → 数据库 → 选择集合 → 索引管理 → 添加索引
 */
function printIndexCommands() {
  console.log('\n========== 索引创建命令 ==========\n')
  console.log('请在云开发控制台的数据库 → 索引管理中手动创建以下索引：\n')
  
  Object.entries(indexes).forEach(([collection, indexList]) => {
    console.log(`\n【${collection}】集合索引：`)
    indexList.forEach((index, i) => {
      const keysStr = JSON.stringify(index.keys)
      const uniqueStr = index.unique ? ', unique: true' : ''
      console.log(`  ${i + 1}. db.collection('${collection}').createIndex(${keysStr}${uniqueStr})`)
    })
  })
  
  console.log('\n========================================\n')
}

/**
 * 步骤3: 迁移本地数据到云数据库
 * 将Storage中的数据批量上传到云数据库
 */
async function migrateLocalData() {
  const db = wx.cloud.database()
  
  console.log('📦 开始迁移本地数据...')
  
  // 迁移用户
  const users = wx.getStorageSync('users') || []
  if (users.length > 0) {
    console.log(`正在迁移 ${users.length} 个用户...`)
    for (const user of users) {
      try {
        await db.collection('users').add({ data: user })
        console.log(`✅ 用户 ${user.userId} 已迁移`)
      } catch (error) {
        console.error(`❌ 用户 ${user.userId} 迁移失败:`, error)
      }
    }
  }
  
  // 迁移订单
  const pendingOrders = wx.getStorageSync('pending_orders') || []
  const completedOrders = wx.getStorageSync('completed_orders') || []
  const allOrders = [...pendingOrders, ...completedOrders]
  
  if (allOrders.length > 0) {
    console.log(`正在迁移 ${allOrders.length} 个订单...`)
    for (const order of allOrders) {
      try {
        await db.collection('orders').add({ data: order })
        console.log(`✅ 订单 ${order.id} 已迁移`)
      } catch (error) {
        console.error(`❌ 订单 ${order.id} 迁移失败:`, error)
      }
    }
  }
  
  // 迁移商品
  const products = wx.getStorageSync('mock_products') || []
  if (products.length > 0) {
    console.log(`正在迁移 ${products.length} 个商品...`)
    for (const product of products) {
      try {
        await db.collection('products').add({ data: product })
        console.log(`✅ 商品 ${product.id} 已迁移`)
      } catch (error) {
        console.error(`❌ 商品 ${product.id} 迁移失败:`, error)
      }
    }
  }
  
  // 迁移画师申请
  const applications = wx.getStorageSync('artist_applications') || []
  if (applications.length > 0) {
    console.log(`正在迁移 ${applications.length} 个画师申请...`)
    for (const app of applications) {
      try {
        await db.collection('artist_applications').add({ data: app })
        console.log(`✅ 申请 ${app.id} 已迁移`)
      } catch (error) {
        console.error(`❌ 申请 ${app.id} 迁移失败:`, error)
      }
    }
  }
  
  console.log('✅ 数据迁移完成！')
}

// ========== 使用说明 ==========
console.log(`
========================================
云数据库初始化指南
========================================

步骤1: 手动创建集合
  在云开发控制台 → 数据库 → 创建集合
  需要创建以下${collections.length}个集合：
  ${collections.map(c => `- ${c}`).join('\n  ')}

步骤2: 创建索引
  执行: printIndexCommands()
  然后在云开发控制台手动创建索引

步骤3: 迁移数据（可选）
  执行: migrateLocalData()
  将本地Storage数据迁移到云数据库

步骤4: 切换环境
  修改 config/env.js 中的 useMockData 为 false

========================================
`)

// 导出函数供控制台调用
module.exports = {
  createCollections,
  printIndexCommands,
  migrateLocalData,
  collections,
  indexes
}

