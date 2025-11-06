/**
 * 🧪 用户 ID 递增自检脚本
 * 在微信开发者工具 -> 调试器 Console 粘贴执行。
 */

(() => {
  console.log('\n========================================')
  console.log('🧪 自检：用户 ID 递增逻辑')
  console.log('========================================\n')

  const resetKeys = [
    'userId',
    'userId_counter',
    'openid',
    'userInfo',
    'hasLoggedIn',
    'isGuestMode'
  ]
  resetKeys.forEach(key => wx.removeStorageSync(key))
  console.log('✅ 已清空用户相关缓存')

  const app = getApp()
  if (!app || typeof app.ensureUserId !== 'function') {
    console.error('❌ 无法获取 app.ensureUserId，请确保脚本在小程序运行后执行')
    return
  }

  const generated = []
  for (let i = 0; i < 3; i++) {
    const id = app.ensureUserId()
    generated.push(id)
    console.log(`第 ${i + 1} 次生成 userId ->`, id)
    wx.removeStorageSync('userId')
  }

  const counter = wx.getStorageSync('userId_counter')
  console.log('\n📌 最终计数器 userId_counter =', counter)

  const isStrictlyIncreasing = generated.every((id, idx) => idx === 0 || id > generated[idx - 1])
  if (isStrictlyIncreasing) {
    console.log('✅ 检查结果：userId 严格递增')
  } else {
    console.warn('⚠️ 检查结果：userId 未严格递增，请排查 ensureUserId 实现')
  }

  console.log('\n========================================\n')
})()
