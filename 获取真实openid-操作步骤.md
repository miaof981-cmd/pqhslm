# 获取真实openid - 操作步骤

## 第1步：上传login云函数

1. **在微信开发者工具左侧目录树**
2. **找到 `cloudfunctions/login` 文件夹**
3. **右键点击** → 选择"上传并部署：云端安装依赖"
4. **等待部署完成**（约30秒）

## 第2步：获取真实openid

部署完成后，在**控制台**（Console标签）执行：

```javascript
wx.cloud.callFunction({
  name: 'login',
  success: res => {
    console.log('==================================================')
    console.log('✅ 您的真实openid:', res.result.openid)
    console.log('==================================================')
    
    // 自动复制
    wx.setClipboardData({
      data: res.result.openid,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      }
    })
  },
  fail: err => {
    console.error('❌ 获取失败:', err)
  }
})
```

## 第3步：添加管理员记录

拿到真实openid后：

1. **云开发控制台** → 数据库 → `system_admin`
2. **点击"添加记录"**
3. **粘贴JSON**（替换openid）：

```json
{
  "_openid": "粘贴您的真实openid",
  "isAdmin": true,
  "adminLevel": "super",
  "nickName": "超级管理员",
  "createdAt": "2025-11-12 10:00:00"
}
```

4. **点击确定**

---

完成后回复："管理员初始化完成"

