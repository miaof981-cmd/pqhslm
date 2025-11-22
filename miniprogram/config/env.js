// 环境配置
const ENV = {
  // 开发环境（仅开发调试使用）
  dev: {
    cloudEnvId: 'cloud1-2gca1h9d11f4d9d2',
    useMockData: false,          // ❌ 已禁用Mock数据，统一使用云端
    enableCache: false,
    logLevel: 'debug',
    emergencyFallback: false
  },
  
  // 生产环境（正式运行）
  prod: {
    cloudEnvId: 'cloud1-2gca1h9d11f4d9d2',
    useMockData: false,          // ✅ 生产环境使用云数据库
    enableCache: true,
    logLevel: 'error',
    emergencyFallback: false
  }
}

// ✅ 当前环境：生产模式（已切换到云端数据库）
const currentEnv = 'prod'  // 'dev' | 'prod'

module.exports = {
  ...ENV[currentEnv],
  
  // 公共配置
  version: '1.0.0',
  timeout: 10000,
  
  // 云数据库集合名
  collections: {
    users: 'users',
    orders: 'orders',
    products: 'products',
    artists: 'artist_applications',
    categories: 'categories',
    notices: 'notices',
    banners: 'banners',
    incomes: 'income_ledger',
    withdraws: 'withdraw_records',
    rewards: 'reward_records',
    serviceQR: 'service_qrcodes',
    buyerShows: 'buyer_shows'
  }
}

