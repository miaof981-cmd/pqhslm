// 诊断搜索功能问题
// 在小程序开发者工具的控制台执行

console.log('========================================')
console.log('🔍 诊断搜索功能')
console.log('========================================')

// 1️⃣ 获取所有商品
const products = wx.getStorageSync('mock_products') || []
console.log(`\n📦 商品总数: ${products.length}`)

// 2️⃣ 检查商品上架状态
const onSaleProducts = products.filter(p => p.isOnSale === true || p.isOnSale === 'true')
const offSaleProducts = products.filter(p => !p.isOnSale || p.isOnSale === false || p.isOnSale === 'false')

console.log(`\n📊 商品上架状态:`)
console.log(`   已上架: ${onSaleProducts.length}个`)
console.log(`   未上架: ${offSaleProducts.length}个`)

// 3️⃣ 检查画师信息
console.log(`\n👨‍🎨 画师信息检查:`)
products.forEach((product, index) => {
  console.log(`\n   ${index + 1}. ${product.name}`)
  console.log(`      商品ID: ${product.id}`)
  console.log(`      画师ID: ${product.artistId || '❌ 缺失'}`)
  console.log(`      画师名: ${product.artistName || '❌ 缺失'}`)
  console.log(`      画师编号: ${product.artistNumber || '未设置'}`)
  console.log(`      上架状态: ${product.isOnSale ? '✅ 已上架' : '❌ 未上架'}`)
  console.log(`      分类: ${product.categoryName || product.category || '未分类'}`)
})

// 4️⃣ 获取画师申请
const applications = wx.getStorageSync('artist_applications') || []
const approvedArtists = applications.filter(app => app.status === 'approved')

console.log(`\n👥 已通过画师: ${approvedArtists.length}位`)
approvedArtists.forEach(artist => {
  console.log(`   - ${artist.name} (userId: ${artist.userId}, 编号: ${artist.artistNumber || '未设置'})`)
})

// 5️⃣ 测试搜索关键词
const testKeywords = ['1画师', '画师1', '001', '1', '妙妙', '测试']

console.log(`\n🔍 测试搜索关键词:`)
testKeywords.forEach(keyword => {
  const lowerKeyword = keyword.toLowerCase()
  
  // 模拟搜索逻辑
  const matchedProducts = products.filter(product => {
    // 检查是否上架
    if (!product.isOnSale) return false
    
    // 搜索商品名
    if (product.name && product.name.toLowerCase().includes(lowerKeyword)) return true
    
    // 搜索画师名
    if (product.artistName && product.artistName.toLowerCase().includes(lowerKeyword)) return true
    
    // 搜索画师编号
    if (product.artistNumber && String(product.artistNumber).toLowerCase().includes(lowerKeyword)) return true
    
    // 搜索分类名
    if (product.categoryName && product.categoryName.toLowerCase().includes(lowerKeyword)) return true
    
    return false
  })
  
  console.log(`\n   关键词 "${keyword}":`)
  console.log(`      匹配商品: ${matchedProducts.length}个`)
  if (matchedProducts.length > 0) {
    matchedProducts.forEach(p => {
      console.log(`         - ${p.name} (画师: ${p.artistName}, 编号: ${p.artistNumber || '无'})`)
    })
  }
})

// 6️⃣ 检查特定画师的商品
console.log(`\n🎯 按画师统计商品:`)
const artistProductMap = {}

products.forEach(product => {
  const artistKey = product.artistName || product.artistId || '未知画师'
  if (!artistProductMap[artistKey]) {
    artistProductMap[artistKey] = {
      total: 0,
      onSale: 0,
      offSale: 0,
      products: []
    }
  }
  
  artistProductMap[artistKey].total++
  if (product.isOnSale) {
    artistProductMap[artistKey].onSale++
  } else {
    artistProductMap[artistKey].offSale++
  }
  artistProductMap[artistKey].products.push(product.name)
})

Object.keys(artistProductMap).forEach(artistKey => {
  const stats = artistProductMap[artistKey]
  console.log(`\n   ${artistKey}:`)
  console.log(`      总商品: ${stats.total}个`)
  console.log(`      已上架: ${stats.onSale}个`)
  console.log(`      未上架: ${stats.offSale}个`)
  console.log(`      商品列表: ${stats.products.join(', ')}`)
})

// 7️⃣ 总结
console.log(`\n========================================`)
console.log(`📋 诊断总结`)
console.log(`========================================`)
console.log(`商品总数: ${products.length}`)
console.log(`已上架: ${onSaleProducts.length}`)
console.log(`未上架: ${offSaleProducts.length}`)
console.log(`画师数: ${approvedArtists.length}`)

console.log(`\n💡 如果搜索不到商品，可能原因:`)
console.log(`   1. 商品 isOnSale 状态为 false`)
console.log(`   2. 搜索关键词与商品名/画师名/画师编号不匹配`)
console.log(`   3. 商品的 artistName 或 artistNumber 字段缺失`)
console.log(`   4. 搜索逻辑未包含画师编号匹配`)

