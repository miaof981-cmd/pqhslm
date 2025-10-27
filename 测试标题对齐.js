/**
 * 测试商品标题对齐效果
 * 创建不同长度的标题，验证是否会导致不对齐
 */

(function() {
  const products = wx.getStorageSync('mock_products') || []
  const userInfo = wx.getStorageSync('userInfo') || {}
  const userId = wx.getStorageSync('userId') || 'test_artist'
  
  // 不同长度的标题测试
  const testTitles = [
    {
      name: '短标题',
      desc: '1个字',
      lines: 1
    },
    {
      name: 'Q版头像定制',
      desc: '6个字',
      lines: 1
    },
    {
      name: '精美插画作品定制服务包邮',
      desc: '12个字，恰好两行',
      lines: 2
    },
    {
      name: '超长标题测试精美Q版头像定制服务加急单特惠活动现在下单立减50元',
      desc: '超过两行，显示省略号',
      lines: 2
    },
    {
      name: '测试',
      desc: '2个字',
      lines: 1
    },
    {
      name: '高质量精修插画大图',
      desc: '9个字',
      lines: 1
    }
  ]
  
  console.log('━'.repeat(70))
  console.log('📋 创建测试商品 - 验证标题对齐效果')
  console.log('━'.repeat(70))
  
  testTitles.forEach((item, index) => {
    const product = {
      id: 'test_title_' + Date.now() + '_' + index,
      name: item.name,
      images: ['https://via.placeholder.com/300x300/F5F5F5/999?text=' + encodeURIComponent('标题' + (index + 1))],
      price: 88 + index * 20,
      basePrice: 88 + index * 20,
      category: 'illustration',
      deliveryDays: 3,
      summary: '测试标题对齐 - ' + item.desc,
      specs: [],
      tags: [],
      isOnSale: true,
      artistName: userInfo.nickName || '测试画师',
      artistId: userId,
      artistAvatar: userInfo.avatarUrl || '/assets/default-avatar.png',
      createTime: Date.now(),
      updateTime: Date.now()
    }
    
    products.unshift(product)
    
    console.log((index + 1) + '. ' + item.name)
    console.log('   描述: ' + item.desc)
    console.log('   预期行数: ' + item.lines + '行')
    console.log('   价格: ¥' + product.price)
  })
  
  wx.setStorageSync('mock_products', products)
  
  console.log('━'.repeat(70))
  console.log('✅ 已创建 ' + testTitles.length + ' 个测试商品')
  console.log('')
  console.log('🔍 现在请观察首页效果：')
  console.log('   1. 标题是否对齐？')
  console.log('   2. 一行标题和两行标题的卡片高度是否一致？')
  console.log('   3. 价格区域是否对齐？')
  console.log('')
  console.log('❓ 如果发现不对齐问题：')
  console.log('   方案A: 强制所有标题占用两行高度（添加 min-height）')
  console.log('   方案B: 使用 CSS Grid 或 Flexbox 统一卡片高度')
  console.log('')
  console.log('━'.repeat(70))
})()

// ==================== 清理测试商品 ====================
/*
(function() {
  let products = wx.getStorageSync('mock_products') || []
  const before = products.length
  
  products = products.filter(p => !p.id.includes('test_title_'))
  wx.setStorageSync('mock_products', products)
  
  console.log('✅ 已删除标题测试商品: ' + (before - products.length) + ' 个')
})()
*/

