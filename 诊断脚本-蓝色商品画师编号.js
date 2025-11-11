/**
 * 诊断脚本：排查"蓝色"商品为什么搜索不到画师编号"1"
 * 执行环境：微信开发者工具 → Console
 */

const products = wx.getStorageSync('mock_products') || []
const users = wx.getStorageSync('users') || []
const artistApplications = wx.getStorageSync('artist_applications') || []

console.log('======== 诊断开始 ========')
console.log('总商品数:', products.length)
console.log('用户数:', users.length)
console.log('画师申请数:', artistApplications.length)

// 🔍 找到"蓝色"商品
const blueProduct = products.find(p => p.name === '蓝色' || p.name.includes('蓝色'))
if (!blueProduct) {
  console.error('❌ 未找到"蓝色"商品！')
} else {
  console.log('\n✅ 找到"蓝色"商品：', blueProduct.name)
  console.log('商品ID:', blueProduct.id)
  console.log('商品artistId:', blueProduct.artistId, '类型:', typeof blueProduct.artistId)
  console.log('商品artistName:', blueProduct.artistName)
  console.log('商品isOnSale:', blueProduct.isOnSale)
  
  // 🔍 查找画师申请记录
  const artistApp = artistApplications.find(app => 
    String(app.userId) === String(blueProduct.artistId) && app.status === 'approved'
  )
  
  if (!artistApp) {
    console.error('❌ 未找到对应的画师申请记录！')
    console.log('正在匹配: artistId =', blueProduct.artistId)
    console.log('\n所有已批准的画师申请：')
    artistApplications
      .filter(app => app.status === 'approved')
      .forEach(app => {
        console.log(`  userId: ${app.userId} (${typeof app.userId}), artistNumber: ${app.artistNumber}`)
      })
  } else {
    console.log('\n✅ 找到画师申请记录')
    console.log('画师userId:', artistApp.userId, '类型:', typeof artistApp.userId)
    console.log('画师编号:', artistApp.artistNumber, '类型:', typeof artistApp.artistNumber)
    console.log('画师状态:', artistApp.status)
  }
  
  // 🔍 对比其他正常显示的商品
  console.log('\n📊 对比画师1的其他商品：')
  const artist1Products = products.filter(p => 
    String(p.artistId) === '1' || String(p.artistId) === '001'
  )
  console.log('画师1的商品总数:', artist1Products.length)
  artist1Products.forEach(p => {
    const app = artistApplications.find(a => 
      String(a.userId) === String(p.artistId) && a.status === 'approved'
    )
    console.log(`  ${p.name}: artistId=${p.artistId} (${typeof p.artistId}), 找到编号=${app?.artistNumber || '无'}`)
  })
}

// 🔍 搜索逻辑模拟
console.log('\n======== 搜索逻辑模拟 ========')
const keyword = '1'
products.forEach(p => {
  if (p.name !== '蓝色' && !p.name.includes('蓝色')) return
  
  const artistApp = artistApplications.find(app => 
    String(app.userId) === String(p.artistId) && app.status === 'approved'
  )
  const artistNumber = artistApp?.artistNumber ? String(artistApp.artistNumber) : ''
  
  const searchTokens = [
    (p.name || '').toLowerCase(),
    (p.id || '').toLowerCase(),
    artistNumber.toLowerCase()
  ].filter(token => token && token.length > 0)
  
  const matched = searchTokens.some(token => token.includes(keyword.toLowerCase()))
  
  console.log(`\n商品: ${p.name}`)
  console.log('  artistId:', p.artistId, '类型:', typeof p.artistId)
  console.log('  artistNumber:', artistNumber)
  console.log('  searchTokens:', searchTokens)
  console.log('  匹配结果:', matched ? '✅ 匹配' : '❌ 不匹配')
})

console.log('\n======== 诊断结束 ========')

