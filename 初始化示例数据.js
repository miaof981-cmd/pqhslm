/**
 * 🧩 初始化示例数据脚本（在微信开发者工具控制台执行）
 *
 * 功能：
 * 1. 如果没有客服数据，自动写入一条演示客服（含头像、二维码、在线状态）
 * 2. 如果没有审核通过的画师，自动写入一条演示画师申请数据
 * 3. 如果没有商品，则生成 1 个绑定演示画师的商品，包含图片、价格、标签
 *
 * 使用方式：
 * - 打开小程序 → 开发者工具 → 调试器 → Console，粘贴整段脚本回车
 * - 再次执行不会重复插入相同的演示数据（会自动跳过）
 */

(() => {
  const logTitle = (title) => {
    console.log('\n========================================')
    console.log(title)
    console.log('========================================\n')
  }

  const ensureArray = (data) => (Array.isArray(data) ? data : [])

  const SERVICE_ID = 'svc-demo-1001'
  const ARTIST_USER_ID = 'artist-demo-1001'
  const PRODUCT_ID = 'prod-demo-1001'

  // 1. 客服数据
  logTitle('📞 初始化客服数据')

  const demoService = {
    id: SERVICE_ID,
    userId: SERVICE_ID,
    serviceId: SERVICE_ID,
    name: '演示客服-小联',
    nickName: '演示客服-小联',
    avatar: 'https://dummyimage.com/200x200/48a999/ffffff.png&text=客服',
    avatarUrl: 'https://dummyimage.com/200x200/48a999/ffffff.png&text=客服',
    isActive: true,
    serviceNumber: 1,
    qrcodeUrl: 'https://dummyimage.com/400x400/1f8e70/ffffff.png&text=客服二维码',
    qrcodeNumber: 'CS-DEMO-001',
    createdAt: new Date().toISOString()
  }

  const updateServiceList = (key) => {
    const list = ensureArray(wx.getStorageSync(key))
    const exists = list.some(item => String(item.userId) === SERVICE_ID)
    if (!exists) {
      list.unshift(demoService)
      wx.setStorageSync(key, list)
      console.log(`✅ 已写入 ${key}，当前共 ${list.length} 条`)
    } else {
      console.log(`ℹ️ ${key} 已存在演示客服，跳过写入`)
    }
  }

  updateServiceList('customer_service_list')
  updateServiceList('service_list')

  // 2. 演示画师申请
  logTitle('🎨 初始化画师申请数据')

  const demoArtistApplication = {
    userId: ARTIST_USER_ID,
    name: '演示画师-妙妙',
    realName: '妙妙',
    artistNumber: 'A-DEMO-001',
    status: 'approved',
    permissionGranted: true,
    permissionGrantedTime: new Date().toISOString(),
    submitTime: new Date(Date.now() - 3600 * 1000).toISOString(),
    artistAvatar: 'https://dummyimage.com/200x200/f48fb1/ffffff.png&text=画师',
    avatarUrl: 'https://dummyimage.com/200x200/f48fb1/ffffff.png&text=画师',
    contact: {
      wechat: 'artist_demo',
      phone: '18800001111'
    },
    tags: ['插画', '头像'],
    styles: ['可爱风']
  }

  const applications = ensureArray(wx.getStorageSync('artist_applications'))
  if (!applications.some(app => String(app.userId) === ARTIST_USER_ID)) {
    applications.unshift(demoArtistApplication)
    wx.setStorageSync('artist_applications', applications)
    console.log(`✅ 已写入演示画师申请，当前申请总数 ${applications.length}`)
  } else {
    console.log('ℹ️ artist_applications 已存在演示画师，跳过写入')
  }

  // 同步 mock_users 中的画师资料（便于其他页面读取）
  const mockUsers = ensureArray(wx.getStorageSync('mock_users'))
  if (!mockUsers.some(user => String(user.userId) === ARTIST_USER_ID)) {
    mockUsers.unshift({
      userId: ARTIST_USER_ID,
      nickname: '演示画师-妙妙',
      avatar: demoArtistApplication.artistAvatar,
      roles: ['artist']
    })
    wx.setStorageSync('mock_users', mockUsers)
    console.log(`✅ 已在 mock_users 中补充演示画师，当前总数 ${mockUsers.length}`)
  } else {
    console.log('ℹ️ mock_users 已存在演示画师，跳过写入')
  }

  // 3. 演示商品
  logTitle('🛒 初始化商品数据')

  const now = new Date().toISOString()
  const demoProduct = {
    id: PRODUCT_ID,
    name: '演示商品 · 妙妙头像',
    summary: '这是一份演示商品，包含基础示例描述。',
    summaryImages: [
      'https://dummyimage.com/600x400/f48fb1/ffffff.png&text=示例图1',
      'https://dummyimage.com/600x400/ce93d8/ffffff.png&text=示例图2'
    ],
    images: [
      'https://dummyimage.com/800x800/ba68c8/ffffff.png&text=演示商品'
    ],
    price: 68,
    basePrice: 68,
    deliveryDays: 3,
    tags: ['示例', '演示', '头像'],
    isOnSale: true,
    artistId: ARTIST_USER_ID,
    artistName: demoArtistApplication.name,
    artistAvatar: demoArtistApplication.artistAvatar,
    createTime: now,
    updateTime: now,
    stock: 0,
    maxBuyCount: 0,
    summaryRichText: '',
    category: 'portrait',
    categoryName: '头像设计'
  }

  const products = ensureArray(wx.getStorageSync('mock_products'))
  if (!products.some(product => product.id === PRODUCT_ID)) {
    products.unshift(demoProduct)
    wx.setStorageSync('mock_products', products)
    console.log(`✅ 已写入演示商品，当前商品总数 ${products.length}`)
  } else {
    console.log('ℹ️ 已存在演示商品，跳过写入')
  }

  console.log('\n🎉 演示数据初始化完成！')
  console.log('   - 客服：', (wx.getStorageSync('customer_service_list') || []).length, '条')
  console.log('   - 演示画师：', ARTIST_USER_ID)
  console.log('   - 商品：', (wx.getStorageSync('mock_products') || []).length, '条')
  console.log('\n建议：刷新相关页面或重新进入小程序查看效果。\n')
})()
