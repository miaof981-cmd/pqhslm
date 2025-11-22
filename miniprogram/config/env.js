// 环境配置
const ENV = {
  // 开发环境
  dev: {
    cloudEnvId: 'cloud1-2gca1h9d11f4d9d2',
    useMockData: true,           // ✅ 开关：是否使用mock数据
    enableCache: false,
    logLevel: 'debug',
    emergencyFallback: false     // 紧急降级开关
  },
  
  // 生产环境
  prod: {
    cloudEnvId: 'cloud1-2gca1h9d11f4d9d2',
    useMockData: false,          // 生产环境使用云数据库
    enableCache: true,
    logLevel: 'error',
    emergencyFallback: false
  }
}

// 当前环境（手动切换）
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

