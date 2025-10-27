/**
 * ⚡ 快速测试 - 出稿时间颜色分级
 * 复制以下代码到控制台，一键创建/删除测试商品
 */

// ================== 一键创建所有颜色分级的测试商品 ==================
(function() {
  const products = wx.getStorageSync('mock_products') || []
  const userInfo = wx.getStorageSync('userInfo') || {}
  const userId = wx.getStorageSync('userId') || 'test_artist'
  
  const testData = [
    { name: '急速头像（1天）', days: 1, price: 88, color: '浅蓝色', bg: '#F0F8FF', text: '#7BA3CC' },
    { name: '快速Q版（3天）', days: 3, price: 128, color: '浅绿色', bg: '#F4F9F4', text: '#81B589' },
    { name: '标准插画（7天）', days: 7, price: 168, color: '浅黄色', bg: '#FFFCF5', text: '#C9A872' },
    { name: '精美插画（8天）', days: 8, price: 188, color: '浅灰色', bg: '#FAFAFA', text: '#B0B0B0' },
    { name: '精修大图（20天）', days: 20, price: 388, color: '浅灰色', bg: '#FAFAFA', text: '#B0B0B0' }
  ]
  
  testData.forEach(item => {
    // 生成SVG图片（显示出稿天数）
    const svg = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="300" fill="${item.bg}"/>
      <text x="150" y="140" font-size="48" fill="${item.text}" text-anchor="middle" font-weight="bold">${item.days}天</text>
      <text x="150" y="180" font-size="20" fill="${item.text}" text-anchor="middle">出稿</text>
    </svg>`
    
    const product = {
      id: `test_${item.days}day_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: item.name,
      images: [`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`],
      price: item.price,
      basePrice: item.price,
      category: 'illustration',
      deliveryDays: item.days,
      summary: `测试商品 - ${item.days}天出稿 - 颜色: ${item.color}`,
      specs: [],
      tags: item.days === 1 ? ['推荐', '热销'] : [],
      isOnSale: true,
      artistName: userInfo.nickName || '测试画师',
      artistId: userId,
      artistAvatar: userInfo.avatarUrl || '/assets/default-avatar.png',
      createTime: Date.now(),
      updateTime: Date.now()
    }
    
    products.unshift(product)
  })
  
  wx.setStorageSync('mock_products', products)
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║       ✅ 已创建 ${testData.length} 个测试商品（覆盖所有颜色分级）          ║
╠════════════════════════════════════════════════════════════╣
║  1. ${testData[0].name.padEnd(20)} ${testData[0].color}  ║
║  2. ${testData[1].name.padEnd(20)} ${testData[1].color}  ║
║  3. ${testData[2].name.padEnd(20)} ${testData[2].color}  ║
║  4. ${testData[3].name.padEnd(20)} ${testData[3].color}  ║
║  5. ${testData[4].name.padEnd(20)} ${testData[4].color}  ║
╠════════════════════════════════════════════════════════════╣
║  💡 现在刷新首页，可以看到不同颜色的出稿时间标签           ║
╚════════════════════════════════════════════════════════════╝
  `)
})()

// ================== 删除所有测试商品 ==================
// 如果要删除，复制下面这段代码到控制台
/*
(function() {
  let products = wx.getStorageSync('mock_products') || []
  const before = products.length
  
  products = products.filter(p => !p.id.includes('test_'))
  wx.setStorageSync('mock_products', products)
  
  const deleted = before - products.length
  
  console.log(`✅ 已删除测试商品: ${deleted} 个`)
  console.log(`   删除前: ${before} 个`)
  console.log(`   删除后: ${products.length} 个`)
})()
*/

