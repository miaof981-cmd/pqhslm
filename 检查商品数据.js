// 在微信开发者工具控制台运行，检查最近的商品

console.log('=== 检查商品数据 ===')

try {
  const products = wx.getStorageSync('mock_products') || []
  
  console.log('商品总数:', products.length)
  
  if (products.length === 0) {
    console.log('❌ 没有任何商品')
  } else {
    console.log('\n最近的 3 个商品:')
    products.slice(0, 3).forEach((p, i) => {
      const createTime = new Date(p.createTime || p.updateTime)
      const timeAgo = ((Date.now() - createTime.getTime()) / 1000 / 60).toFixed(1)
      
      console.log(`\n${i + 1}. ${p.name || '(未命名)'}`)
      console.log('   ID:', p.id)
      console.log('   创建时间:', createTime.toLocaleString(), `(${timeAgo}分钟前)`)
      console.log('   图片数:', p.images?.length || 0)
      console.log('   价格:', p.price || p.basePrice)
      console.log('   画师:', p.artistName || '未知')
    })
    
    // 检查是否有刚刚创建的商品（5分钟内）
    const recentProducts = products.filter(p => {
      const createTime = p.createTime || p.updateTime
      return Date.now() - createTime < 5 * 60 * 1000
    })
    
    if (recentProducts.length > 0) {
      console.log('\n✅ 发现最近 5 分钟内创建的商品:', recentProducts.length, '个')
      console.log('这可能就是你刚才保存的！')
    } else {
      console.log('\n⚠️ 没有最近 5 分钟内创建的商品')
    }
  }
  
  // 检查存储使用情况
  const storageInfo = wx.getStorageInfoSync()
  console.log('\n=== 存储使用情况 ===')
  console.log('已用空间:', (storageInfo.currentSize / 1024).toFixed(2), 'MB')
  console.log('存储上限:', (storageInfo.limitSize / 1024).toFixed(2), 'MB')
  console.log('使用率:', ((storageInfo.currentSize / storageInfo.limitSize) * 100).toFixed(1), '%')
  
  if (storageInfo.currentSize / storageInfo.limitSize > 0.9) {
    console.log('⚠️ 警告：存储空间使用超过 90%')
  }
  
} catch (error) {
  console.error('❌ 检查失败:', error)
}
