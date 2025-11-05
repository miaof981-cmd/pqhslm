/**
 * 测试商品管理脚本
 * 在微信开发者工具控制台中复制粘贴以下代码
 */

// ==================== 创建测试商品 ====================

const DEFAULT_ARTIST_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlLs8L3RleHQ+PC9zdmc+'

function resolveArtistContext() {
  const normalize = (value) => {
    if (value == null) return ''
    const str = String(value).trim()
    if (!str) return ''
    const lower = str.toLowerCase()
    if (lower === 'undefined' || lower === 'null') return ''
    return str
  }
  
  const applications = wx.getStorageSync('artist_applications') || []
  const approved = applications.find(app => app && app.status === 'approved')
  if (approved) {
    const avatarFromApp = approved.avatarUrl || approved.avatar
    return {
      artistId: normalize(approved.userId) || `artist_${Date.now()}`,
      artistName: normalize(approved.name) || normalize(approved.realName) || '测试画师',
      artistAvatar: avatarFromApp || DEFAULT_ARTIST_AVATAR,
      source: 'artist_applications'
    }
  }
  
  const mockUsers = wx.getStorageSync('mock_users') || []
  const artistUser = mockUsers.find(user => {
    if (!user) return false
    const roles = Array.isArray(user.roles) ? user.roles : []
    return roles.includes('artist')
  })
  if (artistUser) {
    const avatarFromUser = artistUser.avatar || artistUser.avatarUrl
    return {
      artistId: normalize(artistUser.userId) || `artist_${Date.now()}`,
      artistName: normalize(artistUser.nickname || artistUser.nickName || artistUser.name) || '测试画师',
      artistAvatar: avatarFromUser || DEFAULT_ARTIST_AVATAR,
      source: 'mock_users'
    }
  }
  
  const userId = normalize(wx.getStorageSync('userId')) || `artist_${Date.now()}`
  const userInfo = wx.getStorageSync('userInfo') || {}
  const avatarFromWx = normalize(userInfo.avatarUrl || userInfo.avatar)
  
  return {
    artistId: userId,
    artistName: normalize(userInfo.nickName || userInfo.nickname) || '测试画师',
    artistAvatar: avatarFromWx || DEFAULT_ARTIST_AVATAR,
    source: 'currentUser'
  }
}

// 1. 创建8天出稿商品
function create8DayProduct() {
  const products = wx.getStorageSync('mock_products') || []
  const artist = resolveArtistContext()
  console.log(`🎯 使用画师数据来源: ${artist.source} (ID: ${artist.artistId})`)
  
  const product = {
    id: `test_8day_${Date.now()}`,
    name: '精美插画定制（8天）',
    images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0ZGRUNCMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+OOWkqeWHuueovzwvdGV4dD48L3N2Zz4='],
    price: 188,
    basePrice: 188,
    category: 'illustration',
    deliveryDays: 8,
    summary: '精心打磨的插画作品，8天交付',
    specs: [],
    tags: [],
    isOnSale: true,
    artistName: artist.artistName,
    artistId: artist.artistId,
    artistAvatar: artist.artistAvatar,
    createTime: Date.now(),
    updateTime: Date.now()
  }
  
  products.unshift(product)
  wx.setStorageSync('mock_products', products)
  
  console.log('✅ 已创建8天出稿商品:')
  console.log('- ID:', product.id)
  console.log('- 名称:', product.name)
  console.log('- 价格: ¥', product.price)
  console.log('- 出稿天数:', product.deliveryDays)
  console.log('- 颜色分级: 慢速（灰色）')
  
  return product.id
}

// 2. 创建20天出稿商品
function create20DayProduct() {
  const products = wx.getStorageSync('mock_products') || []
  const artist = resolveArtistContext()
  console.log(`🎯 使用画师数据来源: ${artist.source} (ID: ${artist.artistId})`)
  
  const product = {
    id: `test_20day_${Date.now()}`,
    name: '精修大图插画（20天）',
    images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0UwRTBFMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+MjDlpKnlh7rnoL88L3RleHQ+PC9zdmc+'],
    price: 388,
    basePrice: 388,
    category: 'illustration',
    deliveryDays: 20,
    summary: '高质量精修插画，值得等待20天',
    specs: [],
    tags: [],
    isOnSale: true,
    artistName: artist.artistName,
    artistId: artist.artistId,
    artistAvatar: artist.artistAvatar,
    createTime: Date.now(),
    updateTime: Date.now()
  }
  
  products.unshift(product)
  wx.setStorageSync('mock_products', products)
  
  console.log('✅ 已创建20天出稿商品:')
  console.log('- ID:', product.id)
  console.log('- 名称:', product.name)
  console.log('- 价格: ¥', product.price)
  console.log('- 出稿天数:', product.deliveryDays)
  console.log('- 颜色分级: 慢速（灰色）')
  
  return product.id
}

// 3. 一键创建所有测试商品（覆盖所有颜色分级）
function createAllTestProducts() {
  const products = wx.getStorageSync('mock_products') || []
  const artist = resolveArtistContext()
  console.log(`🎯 使用画师数据来源: ${artist.source} (ID: ${artist.artistId})`)
  
  const testProducts = [
    {
      name: '急速头像定制（1天）',
      deliveryDays: 1,
      price: 88,
      bgColor: '#F0F8FF'
    },
    {
      name: '快速Q版定制（3天）',
      deliveryDays: 3,
      price: 128,
      bgColor: '#F4F9F4'
    },
    {
      name: '标准插画定制（7天）',
      deliveryDays: 7,
      price: 168,
      bgColor: '#FFFCF5'
    },
    {
      name: '精美插画定制（8天）',
      deliveryDays: 8,
      price: 188,
      bgColor: '#FAFAFA'
    },
    {
      name: '精修大图插画（20天）',
      deliveryDays: 20,
      price: 388,
      bgColor: '#FAFAFA'
    }
  ]
  
  const createdIds = []
  
  testProducts.forEach(test => {
    const product = {
      id: `test_${test.deliveryDays}day_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: test.name,
      images: [`data:image/svg+xml;base64,${btoa(`<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="${test.bgColor}"/><text x="50%" y="50%" font-size="24" fill="#666" text-anchor="middle" dy=".3em">${test.deliveryDays}天出稿</text></svg>`)}`],
      price: test.price,
      basePrice: test.price,
      category: 'illustration',
      deliveryDays: test.deliveryDays,
      summary: `测试商品 - ${test.deliveryDays}天出稿`,
      specs: [],
      tags: [],
      isOnSale: true,
      artistName: artist.artistName,
      artistId: artist.artistId,
      artistAvatar: artist.artistAvatar,
      createTime: Date.now(),
      updateTime: Date.now()
    }
    
    products.unshift(product)
    createdIds.push(product.id)
  })
  
  wx.setStorageSync('mock_products', products)
  
  console.log(`✅ 已创建 ${testProducts.length} 个测试商品（覆盖所有颜色分级）:`)
  testProducts.forEach(test => {
    console.log(`- ${test.name} - ¥${test.price} - ${test.deliveryDays}天`)
  })
  
  return createdIds
}

// ==================== 删除测试商品 ====================

// 4. 删除指定ID的商品
function deleteProductById(productId) {
  let products = wx.getStorageSync('mock_products') || []
  const beforeCount = products.length
  
  products = products.filter(p => p.id !== productId)
  wx.setStorageSync('mock_products', products)
  
  const deleted = beforeCount - products.length
  
  if (deleted > 0) {
    console.log(`✅ 已删除商品: ${productId}`)
    console.log(`- 删除前: ${beforeCount} 个`)
    console.log(`- 删除后: ${products.length} 个`)
  } else {
    console.log(`⚠️ 未找到商品: ${productId}`)
  }
  
  return deleted > 0
}

// 5. 删除所有测试商品（ID包含"test_"）
function deleteAllTestProducts() {
  let products = wx.getStorageSync('mock_products') || []
  const beforeCount = products.length
  
  products = products.filter(p => !p.id.includes('test_'))
  wx.setStorageSync('mock_products', products)
  
  const deleted = beforeCount - products.length
  
  console.log(`✅ 已删除所有测试商品:`)
  console.log(`- 删除前: ${beforeCount} 个`)
  console.log(`- 删除后: ${products.length} 个`)
  console.log(`- 共删除: ${deleted} 个`)
  
  return deleted
}

// 6. 删除所有商品
function deleteAllProducts() {
  const products = wx.getStorageSync('mock_products') || []
  const count = products.length
  
  wx.setStorageSync('mock_products', [])
  
  console.log(`⚠️ 已删除全部商品: ${count} 个`)
  
  return count
}

// ==================== 查询商品 ====================

// 7. 查看所有商品列表
function listAllProducts() {
  const products = wx.getStorageSync('mock_products') || []
  
  console.log(`\n📦 当前商品列表 (共 ${products.length} 个):`)
  console.log('─'.repeat(80))
  
  if (products.length === 0) {
    console.log('暂无商品')
  } else {
    products.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name}`)
      console.log(`   ID: ${p.id}`)
      console.log(`   价格: ¥${p.price}`)
      console.log(`   出稿天数: ${p.deliveryDays}天`)
      console.log(`   画师: ${p.artistName || '未知'}`)
      console.log('─'.repeat(80))
    })
  }
  
  return products
}

// 8. 按出稿天数查询商品
function findProductsByDeliveryDays(days) {
  const products = wx.getStorageSync('mock_products') || []
  const filtered = products.filter(p => p.deliveryDays === days)
  
  console.log(`\n🔍 出稿天数为 ${days} 天的商品 (共 ${filtered.length} 个):`)
  filtered.forEach(p => {
    console.log(`- ${p.name} (¥${p.price})`)
  })
  
  return filtered
}

// ==================== 快捷命令 ====================

console.log(`
╔════════════════════════════════════════════════════════════╗
║              📦 测试商品管理工具 v1.0                       ║
╠════════════════════════════════════════════════════════════╣
║  创建商品:                                                  ║
║    create8DayProduct()       - 创建8天出稿商品             ║
║    create20DayProduct()      - 创建20天出稿商品            ║
║    createAllTestProducts()   - 创建全部测试商品(1/3/7/8/20天) ║
║                                                             ║
║  删除商品:                                                  ║
║    deleteProductById('id')   - 删除指定ID商品              ║
║    deleteAllTestProducts()   - 删除所有测试商品            ║
║    deleteAllProducts()       - 删除全部商品(⚠️谨慎)         ║
║                                                             ║
║  查询商品:                                                  ║
║    listAllProducts()         - 查看所有商品                ║
║    findProductsByDeliveryDays(8)  - 查找8天出稿的商品      ║
╚════════════════════════════════════════════════════════════╝

💡 使用示例:
  1. 创建测试商品: createAllTestProducts()
  2. 查看商品列表: listAllProducts()
  3. 删除测试商品: deleteAllTestProducts()
`)

// 导出所有函数（方便直接调用）
window.testProduct = {
  create8DayProduct,
  create20DayProduct,
  createAllTestProducts,
  deleteProductById,
  deleteAllTestProducts,
  deleteAllProducts,
  listAllProducts,
  findProductsByDeliveryDays
}

console.log('✅ 工具已加载！可以直接调用函数或使用 testProduct.xxx() 调用')
