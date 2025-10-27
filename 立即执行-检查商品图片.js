// 检查商品图片是否是 base64
// 请在控制台执行

console.log('========================================')
console.log('检查商品图片格式')
console.log('========================================')

const products = wx.getStorageSync('mock_products') || []

if (products.length > 0) {
  const product = products[0]
  console.log('\n商品:', product.name)
  console.log('商品ID:', product.id)
  
  if (product.images && product.images.length > 0) {
    const image = product.images[0]
    console.log('\n图片路径:', image.substring(0, 100))
    console.log('是否 base64:', image.startsWith('data:image'))
    console.log('是否临时路径:', image.includes('tmp'))
    
    if (image.includes('tmp')) {
      console.log('\n❌ 问题: 商品图片是临时路径')
      console.log('原因: 商品创建时没有转换为 base64')
      console.log('\n解决方案:')
      console.log('1. 清理旧商品: wx.removeStorageSync("mock_products")')
      console.log('2. 重新上传商品（会自动转换为 base64）')
    } else if (image.startsWith('data:image')) {
      console.log('\n✅ 商品图片格式正确（base64）')
    }
  } else {
    console.log('\n⚠️ 商品没有图片')
  }
} else {
  console.log('\n⚠️ 没有商品数据')
}

console.log('\n========================================')

