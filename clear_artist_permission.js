// 临时脚本：清除当前用户的画师权限
// 使用方法：在开发者工具的控制台中复制粘贴以下代码并执行

console.log('🔧 开始清除画师权限...')

// 1. 重置用户角色为普通用户
wx.setStorageSync('userRoles', ['customer'])
console.log('✅ 已重置角色为: customer')

// 2. 清除全局数据
const app = getApp()
app.globalData.roles = ['customer']
app.globalData.role = 'customer'
console.log('✅ 已清除全局数据中的画师权限')

// 3. 显示当前状态
console.log('📊 当前状态:')
console.log('  - userRoles:', wx.getStorageSync('userRoles'))
console.log('  - app.globalData.roles:', app.globalData.roles)

console.log('✅ 权限清除完成！请重新进入页面查看效果')
