// 在模拟器控制台运行此脚本
const cloudAPI = require('../../utils/cloud-api.js')

async function checkImagePaths() {
  console.log('========================================')
  console.log('📸 画师申请图片路径检查')
  console.log('========================================')
  
  // 获取最新的申请
  const res = await cloudAPI.getArtistApplicationList({ pageSize: 10 })
  const applications = cloudAPI.safeArray(res)
  
  if (applications.length === 0) {
    console.log('❌ 没有找到申请记录')
    return
  }
  
  const latest = applications[0]
  console.log('\n📄 最新申请ID:', latest.id || latest._id)
  console.log('👤 申请人:', latest.nickName)
  console.log('📅 提交时间:', latest.submitTime)
  
  // 检查作品图片
  console.log('\n📷 满意的作品 (finishedWorks):')
  if (Array.isArray(latest.finishedWorks) && latest.finishedWorks.length > 0) {
    latest.finishedWorks.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`)
      console.log(`     类型: ${getPathType(url)}`)
    })
  } else {
    console.log('  ❌ 没有图片')
  }
  
  // 检查过程图片
  console.log('\n🎨 绘画过程 (processImages):')
  if (Array.isArray(latest.processImages) && latest.processImages.length > 0) {
    latest.processImages.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`)
      console.log(`     类型: ${getPathType(url)}`)
    })
  } else {
    console.log('  ❌ 没有图片')
  }
  
  console.log('\n========================================')
  console.log('✅ 检查完成')
  console.log('========================================')
}

function getPathType(url) {
  if (!url) return '❌ 空路径'
  if (url.startsWith('cloud://')) return '✅ 云存储路径'
  if (url.startsWith('wxfile://')) return '❌ 临时路径（无法跨端访问）'
  if (url.startsWith('http://tmp/')) return '❌ 临时路径（无法跨端访问）'
  if (url.startsWith('https://')) return '⚠️ HTTPS URL（检查域名配置）'
  if (url.startsWith('/')) return '❌ 本地路径（无法访问）'
  return '❓ 未知类型'
}

checkImagePaths()
