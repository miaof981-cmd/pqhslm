const products = wx.getStorageSync('mock_products') || []
console.log('=== 商品数据检查 ===')
console.log('商品数量:', products.length)
if (products.length > 0) {
  const product = products[0]
  console.log('\n第一个商品:')
  console.log('- ID:', product.id)
  console.log('- 名称:', product.name)
  console.log('- images数组长度:', product.images ? product.images.length : 0)
  console.log('- 第一张图片前50字符:', product.images && product.images[0] ? product.images[0].substring(0, 50) : '无')
  console.log('- productImage:', product.productImage ? product.productImage.substring(0, 50) : '无')
}
