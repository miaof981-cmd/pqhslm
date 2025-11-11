/**
 * 完整诊断：为什么"蓝色"商品在搜索页看不到
 * 在微信开发者工具控制台运行
 */

console.log('========== 完整诊断开始 ==========\n')

// 1. 读取原始数据
const rawProducts = wx.getStorageSync('mock_products') || []
const users = wx.getStorageSync('users') || []
const artistApplications = wx.getStorageSync('artist_applications') || []

console.log('1️⃣ 总商品数:', rawProducts.length)

// 2. 查找"蓝色"商品
const blueProduct = rawProducts.find(p => (p.name || '').includes('蓝'))

if (!blueProduct) {
  console.log('❌ 没有找到包含"蓝"的商品！')
} else {
  console.log('2️⃣ 找到"蓝色"商品:\n')
  console.log('完整数据:', JSON.stringify(blueProduct, null, 2))
  
  console.log('\n3️⃣ 关键字段检查:')
  console.log('- name:', blueProduct.name)
  console.log('- id:', blueProduct.id)
  console.log('- price:', blueProduct.price)
  console.log('- basePrice:', blueProduct.basePrice)
  console.log('- isOnSale:', blueProduct.isOnSale)
  console.log('- status:', blueProduct.status)
  console.log('- artistId:', blueProduct.artistId)
  
  // 4. 模拟第一个filter（上架状态检查）
  console.log('\n4️⃣ 上架状态检查:')
  const isOnSale = blueProduct.isOnSale
  const status = blueProduct.status
  
  const shouldShow = 
    isOnSale === true || 
    isOnSale === undefined || 
    isOnSale === null ||
    isOnSale === '上架' ||
    isOnSale === '已上架' ||
    isOnSale === 'onSale' ||
    status === 'active' ||
    status === 'online' ||
    status === '上架' ||
    status === '已上架' ||
    status === 'onSale'
  
  console.log('通过上架检查:', shouldShow ? '✅ 是' : '❌ 否')
  if (!shouldShow) {
    console.log('⚠️ 被第一个filter过滤！原因: isOnSale =', isOnSale, ', status =', status)
  }
  
  // 5. 模拟map处理
  if (shouldShow) {
    console.log('\n5️⃣ 模拟map处理:')
    
    const price = parseFloat(blueProduct.price) || parseFloat(blueProduct.basePrice) || 0
    console.log('计算价格:', price)
    
    // 获取画师编号
    let artistNumber = ''
    if (blueProduct.artistId) {
      const artistApp = artistApplications.find(app => 
        String(app.userId) === String(blueProduct.artistId) && app.status === 'approved'
      )
      if (artistApp) {
        artistNumber = String(artistApp.artistNumber || '')
      }
    }
    console.log('画师编号:', artistNumber)
    
    // 检查id
    const id = blueProduct.id || blueProduct._id
    console.log('商品ID:', id)
    
    const hasValidId = id !== undefined && id !== null && id !== ''
    console.log('通过id检查:', hasValidId ? '✅ 是' : '❌ 否')
    
    if (!hasValidId) {
      console.log('⚠️ 被最后的filter过滤！原因: id =', id)
    }
    
    // 检查searchTokens
    console.log('\n6️⃣ 搜索tokens:')
    const name = (blueProduct.name || '').toLowerCase()
    console.log('- name token:', `"${name}"`)
    console.log('- 包含"蓝":', name.includes('蓝') ? '✅ 是' : '❌ 否')
    console.log('- 包含"蓝色":', name.includes('蓝色') ? '✅ 是' : '❌ 否')
  }
}

// 7. 检查搜索页实际加载的商品
console.log('\n7️⃣ 检查搜索页加载情况:')
console.log('请打开搜索页，查看控制台是否有:')
console.log('  [搜索加载] 商品: 蓝色, ...')
console.log('或')
console.log('  [搜索过滤] 过滤掉商品: 蓝色, ...')

console.log('\n========== 诊断完成 ==========')
console.log('请截图完整输出发给开发者')

