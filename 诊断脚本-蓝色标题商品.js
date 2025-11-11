// 诊断：为什么标题为"蓝色"的商品搜不到
const products = wx.getStorageSync('mock_products') || []

console.log('======== 搜索"蓝色"标题商品诊断 ========')
console.log('总商品数:', products.length)

// 1. 查找标题包含"蓝色"的商品
const blueProducts = products.filter(p => {
  const name = (p.name || '').toLowerCase()
  return name.includes('蓝') || name.includes('蓝色')
})

console.log('\n找到', blueProducts.length, '个标题包含"蓝色"的商品')

blueProducts.forEach((p, idx) => {
  console.log(`\n=== 商品 ${idx + 1} ===`)
  console.log('ID:', p.id)
  console.log('标题:', p.name)
  console.log('上架状态 isOnSale:', p.isOnSale)
  console.log('上架判断:', p.isOnSale !== false ? '✅ 已上架' : '❌ 已下架')
  console.log('画师ID:', p.artistId)
  console.log('画师名:', p.artistName)
  
  // 检查完整对象
  console.log('\n完整商品数据:')
  console.log(JSON.stringify(p, null, 2))
})

// 2. 模拟搜索页的过滤逻辑
console.log('\n\n======== 模拟搜索页过滤逻辑 ========')
const filteredProducts = products.filter(p => p.isOnSale !== false)
console.log('过滤后商品数:', filteredProducts.length)

const blueInFiltered = filteredProducts.filter(p => {
  const name = (p.name || '').toLowerCase()
  return name.includes('蓝') || name.includes('蓝色')
})
console.log('过滤后仍包含"蓝色":', blueInFiltered.length, '个')

if (blueInFiltered.length === 0 && blueProducts.length > 0) {
  console.log('⚠️ 问题：商品存在但被 isOnSale !== false 过滤掉了！')
  console.log('原因：isOnSale的值是:', blueProducts[0].isOnSale)
}

console.log('\n======== 诊断完成 ========')
