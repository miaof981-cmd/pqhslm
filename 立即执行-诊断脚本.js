// 订单图片显示问题 - 诊断脚本
// 请在微信开发者工具的控制台中执行

console.log('========================================')
console.log('订单图片显示问题 - 完整诊断')
console.log('========================================')

// 1. 检查商品数据
const products = wx.getStorageSync('mock_products') || []
console.log('\n【1. 商品数据】')
console.log('商品数量:', products.length)
if (products.length > 0) {
  const product = products.find(p => p.name === '222') || products[0]
  console.log('商品名称:', product.name)
  console.log('商品ID:', product.id)
  console.log('图片数量:', product.images?.length)
  console.log('图片类型:', typeof product.images?.[0])
  console.log('是否 base64:', product.images?.[0]?.startsWith('data:image'))
  console.log('是否临时路径:', product.images?.[0]?.includes('tmp'))
  console.log('图片前100字符:', product.images?.[0]?.substring(0, 100))
}

// 2. 检查购物车数据
const cart = wx.getStorageSync('cart_items') || []
console.log('\n【2. 购物车数据】')
console.log('购物车商品数:', cart.length)
if (cart.length > 0) {
  cart.forEach((item, index) => {
    console.log(`\n购物车商品 ${index + 1}:`)
    console.log('  商品名称:', item.productName)
    console.log('  商品ID:', item.productId)
    console.log('  图片字段:', item.productImage ? '存在' : '不存在')
    console.log('  图片类型:', typeof item.productImage)
    console.log('  是否 base64:', item.productImage?.startsWith('data:image'))
    console.log('  是否临时路径:', item.productImage?.includes('tmp'))
    console.log('  图片前100字符:', item.productImage?.substring(0, 100))
  })
}

// 3. 检查订单数据
const orders = wx.getStorageSync('pending_orders') || []
console.log('\n【3. 订单数据】')
console.log('订单数量:', orders.length)
if (orders.length > 0) {
  orders.forEach((order, index) => {
    console.log(`\n订单 ${index + 1}:`)
    console.log('  订单ID:', order.id)
    console.log('  商品名称:', order.productName)
    console.log('  创建时间:', order.createTime)
    console.log('  图片字段:', order.productImage ? '存在' : '不存在')
    console.log('  图片类型:', typeof order.productImage)
    console.log('  图片值:', order.productImage === '' ? '空字符串' : order.productImage === undefined ? 'undefined' : '有值')
    console.log('  是否 base64:', order.productImage?.startsWith('data:image'))
    console.log('  是否临时路径:', order.productImage?.includes('tmp'))
    
    if (order.productImage && order.productImage.length > 0) {
      console.log('  图片前100字符:', order.productImage.substring(0, 100))
    }
  })
}

// 4. 关键诊断
console.log('\n【4. 关键诊断】')
const targetOrder = orders.find(o => o.id === '20251027144552647')
if (targetOrder) {
  console.log('找到目标订单:', targetOrder.id)
  console.log('商品名称:', targetOrder.productName)
  console.log('图片情况:')
  
  if (!targetOrder.productImage) {
    console.log('  ❌ 图片字段不存在或为空')
    console.log('  原因: 订单创建时图片路径未传递')
  } else if (targetOrder.productImage.includes('tmp')) {
    console.log('  ❌ 图片是临时路径（已失效）')
    console.log('  路径:', targetOrder.productImage)
    console.log('  原因: 这是旧订单，使用的是临时路径')
  } else if (targetOrder.productImage.includes('/assets/default-product.png')) {
    console.log('  ❌ 图片是不存在的默认图片')
    console.log('  路径:', targetOrder.productImage)
    console.log('  原因: 购物车中图片为空，使用了默认值')
  } else if (targetOrder.productImage.startsWith('data:image')) {
    console.log('  ✅ 图片是 base64 格式（正确）')
    console.log('  但页面显示"暂无图片"，可能是渲染问题')
  } else {
    console.log('  ⚠️ 图片格式未知')
    console.log('  值:', targetOrder.productImage)
  }
} else {
  console.log('⚠️ 未找到订单 20251027144552647')
}

// 5. 修复建议
console.log('\n【5. 修复建议】')
if (orders.length > 0) {
  const hasOldOrder = orders.some(o => 
    !o.productImage || 
    o.productImage.includes('tmp') || 
    o.productImage.includes('/assets/default-product.png')
  )
  
  if (hasOldOrder) {
    console.log('检测到旧订单数据，建议执行以下操作：')
    console.log('')
    console.log('// 清理旧订单')
    console.log('wx.removeStorageSync("pending_orders")')
    console.log('wx.removeStorageSync("completed_orders")')
    console.log('console.log("✅ 已清理旧订单")')
    console.log('')
    console.log('然后重新下单测试')
  } else {
    console.log('订单数据看起来正常，可能是渲染问题')
    console.log('请检查 order-list/index.wxml 的条件判断')
  }
}

console.log('\n========================================')
console.log('诊断完成')
console.log('========================================')

