// 查看实际订单数据
// 请在控制台执行

console.log('========================================')
console.log('查看实际订单数据')
console.log('========================================')

const orders = wx.getStorageSync('pending_orders') || []
console.log('\n订单总数:', orders.length)

if (orders.length > 0) {
  orders.forEach((order, index) => {
    console.log(`\n【订单 ${index + 1}】`)
    console.log('订单ID:', order.id)
    console.log('商品名称:', order.productName)
    console.log('创建时间:', order.createTime)
    console.log('截稿时间:', order.deadline)
    console.log('\n图片信息:')
    console.log('  字段存在:', order.productImage ? '是' : '否')
    console.log('  图片类型:', typeof order.productImage)
    
    if (order.productImage) {
      console.log('  图片长度:', order.productImage.length)
      
      if (order.productImage.includes('tmp')) {
        console.log('  ❌ 临时路径（已失效）')
        console.log('  路径:', order.productImage)
      } else if (order.productImage.includes('/assets/')) {
        console.log('  ❌ 不存在的默认图片')
        console.log('  路径:', order.productImage)
      } else if (order.productImage.startsWith('data:image')) {
        console.log('  ✅ base64 格式（正确）')
        console.log('  前100字符:', order.productImage.substring(0, 100))
      } else if (order.productImage === '') {
        console.log('  ⚠️ 空字符串')
      } else {
        console.log('  ⚠️ 未知格式')
        console.log('  值:', order.productImage)
      }
    } else {
      console.log('  ❌ 图片字段为空或不存在')
    }
  })
  
  console.log('\n========================================')
  console.log('诊断结果')
  console.log('========================================')
  
  const hasOldOrder = orders.some(o => 
    !o.productImage || 
    o.productImage.includes('tmp') || 
    o.productImage.includes('/assets/')
  )
  
  if (hasOldOrder) {
    console.log('\n❌ 检测到问题订单（临时路径或默认图片）')
    console.log('\n✅ 解决方案: 清理旧订单')
    console.log('\n执行以下命令:')
    console.log('wx.removeStorageSync("pending_orders")')
    console.log('wx.removeStorageSync("completed_orders")')
    console.log('console.log("✅ 已清理")')
  } else {
    console.log('\n✅ 订单数据看起来正常')
    console.log('如果页面仍显示"暂无图片"，可能是渲染问题')
  }
  
} else {
  console.log('\n⚠️ 没有订单数据')
}

console.log('\n========================================')

