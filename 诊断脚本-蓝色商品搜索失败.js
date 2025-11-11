/**
 * 诊断脚本：为什么标题为"蓝色"的商品搜不到
 * 在微信开发者工具控制台运行
 */

console.log('========== 蓝色商品搜索失败诊断 ==========\n')

// 1. 读取所有商品
const allProducts = wx.getStorageSync('mock_products') || []
console.log('1️⃣ 总商品数:', allProducts.length)

// 2. 查找标题包含"蓝"的商品
const blueProducts = allProducts.filter(p => {
  const name = (p.name || '').toLowerCase()
  return name.includes('蓝')
})

console.log('2️⃣ 标题包含"蓝"的商品:', blueProducts.length, '个\n')

if (blueProducts.length === 0) {
  console.log('❌ 没有找到标题包含"蓝"的商品！')
  console.log('请检查商品是否已创建\n')
} else {
  blueProducts.forEach((p, idx) => {
    console.log(`\n━━━ 商品 ${idx + 1} ━━━`)
    console.log('标题:', p.name)
    console.log('ID:', p.id)
    console.log('isOnSale:', p.isOnSale, `(类型: ${typeof p.isOnSale})`)
    
    // 检查过滤条件
    const passFilter = p.isOnSale !== false
    console.log('通过isOnSale过滤:', passFilter ? '✅ 是' : '❌ 否')
    
    if (!passFilter) {
      console.log('⚠️ 问题原因: isOnSale = false，商品被搜索页过滤掉了')
      console.log('解决方案: 在管理后台将商品设为"已上架"状态')
    }
    
    // 检查searchTokens生成
    console.log('\n模拟searchTokens生成:')
    const nameToken = (p.name || '').toLowerCase()
    console.log('- 商品名token:', `"${nameToken}"`)
    console.log('- 搜索"蓝色":', nameToken.includes('蓝色') ? '✅ 能匹配' : '❌ 不匹配')
    console.log('- 搜索"蓝":', nameToken.includes('蓝') ? '✅ 能匹配' : '❌ 不匹配')
  })
}

console.log('\n\n========== 诊断完成 ==========')
console.log('请截图发给开发者')

