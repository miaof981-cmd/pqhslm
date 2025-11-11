// 诊断脚本：查找"蓝色"相关商品
const products = wx.getStorageSync('mock_products') || []

console.log('======== 蓝色商品诊断 ========')
console.log('总商品数:', products.length)

// 查找所有包含"蓝色"的商品
const blueProducts = products.filter(p => {
  const name = (p.name || '').toLowerCase()
  const hasBlueInName = name.includes('蓝色') || name.includes('蓝') || name.includes('blue')
  
  // 检查specs
  let hasBlueInSpecs = false
  if (Array.isArray(p.specs) && p.specs.length > 0) {
    hasBlueInSpecs = p.specs.some(spec => {
      const specName = String(spec.name || '').toLowerCase()
      return specName.includes('蓝色') || specName.includes('蓝') || specName.includes('blue')
    })
  }
  
  return hasBlueInName || hasBlueInSpecs
})

console.log('\n找到', blueProducts.length, '个包含"蓝色"的商品:')
blueProducts.forEach((p, idx) => {
  console.log(`\n--- 商品 ${idx + 1} ---`)
  console.log('ID:', p.id)
  console.log('名称:', p.name)
  console.log('上架状态:', p.isOnSale !== false ? '✅ 已上架' : '❌ 已下架')
  console.log('规格数:', Array.isArray(p.specs) ? p.specs.length : 0)
  
  if (Array.isArray(p.specs) && p.specs.length > 0) {
    console.log('规格详情:')
    p.specs.forEach((spec, i) => {
      console.log(`  [${i}] name: "${spec.name}", price: ${spec.price}`)
    })
  }
  
  console.log('完整specs结构:', JSON.stringify(p.specs, null, 2))
})

console.log('\n======== 诊断完成 ========')
