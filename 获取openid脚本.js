/**
 * 获取当前用户的openid
 * 在微信开发者工具的控制台执行此脚本
 */

// 方式一：如果已经有login云函数
wx.cloud.callFunction({
  name: 'login',
  success: res => {
    console.log('='.repeat(50))
    console.log('✅ 您的openid:', res.result.openid)
    console.log('='.repeat(50))
    console.log('请复制上面的openid，待会添加管理员时使用')
    
    // 自动复制到剪贴板（如果支持）
    wx.setClipboardData({
      data: res.result.openid,
      success: () => {
        console.log('✅ openid已自动复制到剪贴板')
      }
    })
  },
  fail: err => {
    console.log('❌ login云函数调用失败:', err)
    console.log('请使用方式二获取openid')
  }
})

// 方式二：从本地存储读取
setTimeout(() => {
  const openid = wx.getStorageSync('openid')
  if (openid) {
    console.log('\n【方式二】从本地读取:')
    console.log('您的openid:', openid)
  } else {
    console.log('\n【方式二】本地暂无openid')
    console.log('请先运行小程序，登录后再执行此脚本')
  }
}, 1000)

// 方式三：从全局数据读取
setTimeout(() => {
  const app = getApp()
  if (app && app.globalData && app.globalData.openid) {
    console.log('\n【方式三】从全局数据读取:')
    console.log('您的openid:', app.globalData.openid)
  }
}, 2000)

