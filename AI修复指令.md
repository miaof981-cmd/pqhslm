# 贫穷画师联盟 - AI 修复执行指令

> **文档类型**：技术修复指令  
> **目标对象**：开发 AI（Cursor / Claude / GPT-4 等）  
> **执行方式**：直接复制本文档给 AI，要求其按指令修改代码  
> **前置文档**：请先阅读《贫穷画师联盟 - 技术问题完整分析报告》

---

## 📋 任务概述

### 核心问题
1. **ID管理问题**：用户ID显示为1354，用户不理解ID的生成逻辑和来源
2. **权限刷新问题**：切换到"普通用户"后，页面仍显示"工作台"和"管理后台"

### 修复目标
1. ✅ 优化ID生成逻辑，增加透明度和可重置性
2. ✅ 修复角色切换后的页面刷新机制
3. ✅ 确保UI与数据状态完全同步
4. ✅ 保留所有现有的调试日志

---

## 🎯 任务1：优化 ID 生成逻辑

### 文件位置
`miniprogram/app.js`

### 修改范围
- 函数：`initUserInfo()` (第18-47行)
- 函数：`generateNewUserId()` (第49-65行)

### 当前问题
```javascript
// 当前逻辑：
// 1. 如果本地有userId，直接使用（这就是为什么1354一直保留）
// 2. 如果没有，生成新的自增ID
// 3. 用户无法理解ID的来源，也无法重置

if (userId && openid) {
  // 直接使用，没有说明来源
  this.globalData.userId = userId
}
```

### 修改后的代码

```javascript
// app.js

// 初始化用户信息
initUserInfo() {
  // 检查本地存储是否有用户信息
  const userInfo = wx.getStorageSync('userInfo')
  const resetFlag = wx.getStorageSync('resetUserId')  // ✅ 新增：重置标志
  let userId = wx.getStorageSync('userId')
  let openid = wx.getStorageSync('openid')
  
  // ✅ 修改：增加重置逻辑
  if (userId && openid && !resetFlag) {
    // 已有基础信息，继续使用
    this.globalData.userId = userId
    this.globalData.openid = openid
    
    if (userInfo) {
      this.globalData.userInfo = userInfo
      console.log('✅ 用户信息已加载')
      console.log('  - 来源: 本地缓存')
      console.log('  - 用户ID:', userId)
      console.log('  - 昵称:', userInfo.nickName)
    } else {
      console.log('✅ 用户ID已加载:', userId, '(来源: 本地缓存)')
    }
  } else {
    // 没有用户信息，或者需要重置，生成新的自增ID
    const newUserId = this.generateNewUserId()
    const newOpenid = `openid-${newUserId}-${Date.now()}`
    
    this.globalData.userId = newUserId
    this.globalData.openid = newOpenid
    
    wx.setStorageSync('userId', newUserId)
    wx.setStorageSync('openid', newOpenid)
    
    // ✅ 清除重置标志
    if (resetFlag) {
      wx.removeStorageSync('resetUserId')
      console.log('🔄 用户ID已重置')
    }
    
    console.log('🆕 生成新用户ID')
    console.log('  - 来源:', resetFlag ? '手动重置' : '首次创建')
    console.log('  - 新ID:', newUserId)
  }
}

// 生成新的自增用户ID
generateNewUserId() {
  // 获取当前最大的用户ID
  let maxUserId = wx.getStorageSync('maxUserId') || 1000
  
  // 新用户ID = 最大ID + 1
  const newUserId = maxUserId + 1
  
  // 保存新的最大ID
  wx.setStorageSync('maxUserId', newUserId)
  
  console.log('📊 ID生成逻辑:')
  console.log('  - 当前最大ID:', maxUserId)
  console.log('  - 新用户ID:', newUserId)
  console.log('  - 已更新maxUserId为:', newUserId)
  
  return newUserId
}
```

### 新增功能：重置ID工具方法

在 `app.js` 中添加：

```javascript
// 重置用户ID（开发调试用）
resetUserId() {
  console.log('⚠️ 准备重置用户ID...')
  
  // 设置重置标志
  wx.setStorageSync('resetUserId', true)
  
  // 清除当前用户数据
  wx.removeStorageSync('userId')
  wx.removeStorageSync('openid')
  wx.removeStorageSync('userInfo')
  wx.removeStorageSync('hasLoggedIn')
  
  console.log('✅ 用户数据已清除，下次启动将生成新ID')
  
  // 重新启动小程序
  wx.reLaunch({
    url: '/pages/login/index',
    success: () => {
      console.log('✅ 已跳转到登录页')
    }
  })
}
```

### 使用方式

开发者可以在控制台执行：

```javascript
// 重置ID
const app = getApp()
app.resetUserId()
```

---

## 🎯 任务2：修复角色切换刷新问题

### 涉及文件
1. `miniprogram/pages/role-manage/index.js`
2. `miniprogram/pages/user-center/index.js`

### 问题分析

**当前流程**：
```
1. 用户点击"普通用户" 
   ↓
2. switchScenario() 更新本地存储和全局数据
   ↓
3. 1.5秒后自动返回
   ↓
4. user-center 的 onShow() 触发
   ↓
5. loadData() → loadUserRole()
   ↓
6. 读取本地存储 roles
   ↓
7. setData({ roles })
   ↓
8. 问题：页面可能没有真正刷新
```

**问题原因**：
- 小程序的页面渲染机制可能有缓存
- setData 执行了但 DOM 没有更新
- 需要强制刷新标志

---

### 修改1：role-manage/index.js

**文件位置**：`miniprogram/pages/role-manage/index.js`  
**修改范围**：`switchScenario()` 方法（第94-130行）

```javascript
// 快速切换场景
switchScenario(e) {
  const scenarioId = e.currentTarget.dataset.scenario
  const scenario = this.data.userScenarios.find(s => s.id === scenarioId)
  
  if (!scenario) return
  
  const roles = [...scenario.roles]
  
  console.log('🔄 开始切换用户场景')
  console.log('  - 目标场景:', scenario.name)
  console.log('  - 目标角色:', roles)
  
  // 保存到本地
  wx.setStorageSync('userRoles', roles)
  
  // 更新全局数据
  const app = getApp()
  app.globalData.roles = roles
  app.globalData.role = roles[0]
  
  // ✅ 新增：设置刷新标志
  wx.setStorageSync('needRefresh', true)
  console.log('✅ 已设置刷新标志 needRefresh = true')
  
  this.setData({
    roles: roles,
    currentScenario: scenarioId
  })
  
  wx.showToast({
    title: `已切换为${scenario.name}`,
    icon: 'success',
    duration: 1000  // ✅ 修改：缩短为1秒
  })
  
  // ✅ 修改：缩短延迟时间
  setTimeout(() => {
    console.log('🔙 准备返回个人中心...')
    wx.navigateBack({
      success: () => {
        console.log('✅ 已返回个人中心，等待页面刷新')
      },
      fail: (err) => {
        console.error('❌ 返回失败:', err)
      }
    })
  }, 1000)
}
```

### 修改2：同样修改 toggleRole() 方法

```javascript
// 切换角色（手动调整）
toggleRole(e) {
  const roleId = e.currentTarget.dataset.role
  let { roles } = this.data
  
  // 不能移除customer角色（至少保留一个角色）
  if (roleId === 'customer' && roles.includes('customer') && roles.length === 1) {
    wx.showToast({
      title: '至少保留一个角色',
      icon: 'none'
    })
    return
  }
  
  // 切换角色
  if (roles.includes(roleId)) {
    // 移除角色
    roles = roles.filter(r => r !== roleId)
    
    // 如果移除后没有角色，添加customer
    if (roles.length === 0) {
      roles = ['customer']
    }
  } else {
    // 添加角色
    roles.push(roleId)
  }
  
  console.log('🔄 手动调整角色')
  console.log('  - 新角色列表:', roles)
  
  // 保存到本地
  wx.setStorageSync('userRoles', roles)
  
  // 更新全局数据
  const app = getApp()
  app.globalData.roles = roles
  app.globalData.role = roles[0]
  
  // ✅ 新增：设置刷新标志
  wx.setStorageSync('needRefresh', true)
  console.log('✅ 已设置刷新标志 needRefresh = true')
  
  // 重新检测场景
  const currentScenario = this.detectScenario(roles)
  
  this.setData({
    roles: roles,
    currentScenario: currentScenario
  })
  
  wx.showToast({
    title: '权限已更新',
    icon: 'success',
    duration: 1000  // ✅ 修改：缩短为1秒
  })
  
  // ✅ 修改：缩短延迟时间
  setTimeout(() => {
    console.log('🔙 准备返回个人中心...')
    wx.navigateBack({
      success: () => {
        console.log('✅ 已返回个人中心，等待页面刷新')
      }
    })
  }, 1000)
}
```

---

### 修改3：user-center/index.js

**文件位置**：`miniprogram/pages/user-center/index.js`  
**修改范围**：`onShow()` 方法（第29-32行）

```javascript
onShow() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 个人中心页面 onShow 触发')
  console.log('  - 时间:', new Date().toLocaleTimeString())
  
  // ✅ 新增：检查刷新标志
  const needRefresh = wx.getStorageSync('needRefresh')
  
  if (needRefresh) {
    console.log('⚡ 检测到刷新标志，执行强制刷新')
    
    // 清除刷新标志
    wx.removeStorageSync('needRefresh')
    
    // ✅ 新增：先清空当前数据
    this.setData({
      roles: [],
      roleTexts: [],
      loading: true
    })
    
    // ✅ 新增：延迟加载，确保清空生效
    setTimeout(() => {
      console.log('🔄 开始重新加载数据...')
      this.loadData()
    }, 100)
  } else {
    console.log('✅ 正常显示，无需刷新')
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}
```

### 修改4：增强 loadUserRole() 的日志

**文件位置**：`miniprogram/pages/user-center/index.js`  
**修改范围**：`loadUserRole()` 方法（第55-100行）

```javascript
// 加载用户角色（支持多角色）
loadUserRole() {
  const app = getApp()
  
  console.log('👤 开始加载用户角色...')
  
  // 优先从app.globalData获取，确保与app.js中的初始化一致
  let userId = wx.getStorageSync('userId')
  if (!userId) {
    userId = app.globalData.userId || 1001
    wx.setStorageSync('userId', userId)
  }
  
  // 从本地存储读取用户的多个角色
  let roles = wx.getStorageSync('userRoles') || ['customer']
  
  console.log('  - 本地存储读取:', wx.getStorageSync('userRoles'))
  console.log('  - 全局数据读取:', app.globalData.roles)
  
  // 确保roles是数组
  if (!Array.isArray(roles)) {
    console.warn('⚠️ roles 不是数组，重置为 [customer]')
    roles = ['customer']
  }
  
  // 如果没有角色，默认为customer
  if (roles.length === 0) {
    console.warn('⚠️ roles 为空数组，重置为 [customer]')
    roles = ['customer']
  }
  
  // 保存角色到本地（不再重复保存userId）
  wx.setStorageSync('userRoles', roles)
  
  // 更新全局数据（主角色为第一个）
  app.globalData.userId = userId
  app.globalData.role = roles[0]
  app.globalData.roles = roles
  
  // 生成角色文本数组
  const roleTexts = roles.map(role => this.getRoleText(role))
  
  console.log('👤 用户角色加载完成:')
  console.log('  - 用户ID:', userId)
  console.log('  - 角色列表:', roles)
  console.log('  - 角色文本:', roleTexts)
  console.log('  - 主角色:', roles[0])
  
  // ✅ 修改：添加回调确认
  this.setData({
    userId: userId,
    roles: roles,
    roleTexts: roleTexts
  }, () => {
    console.log('✅ setData 完成，当前页面 roles:', this.data.roles)
    
    // ✅ 新增：验证条件判断
    const hasArtist = this.data.roles.indexOf('artist') !== -1
    const hasAdmin = this.data.roles.indexOf('admin') !== -1
    const shouldShowCert = !hasArtist && !hasAdmin
    const shouldShowWorkspace = hasArtist || hasAdmin
    
    console.log('📊 UI 显示逻辑判断:')
    console.log('  - 包含画师角色:', hasArtist)
    console.log('  - 包含管理员角色:', hasAdmin)
    console.log('  - 应显示画师认证:', shouldShowCert)
    console.log('  - 应显示工作台:', shouldShowWorkspace)
  })
}
```

---

## 🧪 任务3：添加调试工具（可选）

### 在权限管理页面添加调试按钮

**文件位置**：`miniprogram/pages/role-manage/index.wxml`

在底部提示信息前添加：

```xml
<!-- 调试工具区域 -->
<view class="debug-section">
  <view class="section-title">开发调试工具</view>
  <view class="debug-buttons">
    <button class="debug-btn" bindtap="showDebugInfo">查看调试信息</button>
    <button class="debug-btn" bindtap="clearCache">清除所有缓存</button>
    <button class="debug-btn" bindtap="resetUserData">重置用户数据</button>
  </view>
</view>
```

### 添加对应的方法

**文件位置**：`miniprogram/pages/role-manage/index.js`

```javascript
// 显示调试信息
showDebugInfo() {
  const app = getApp()
  const debugInfo = {
    '本地存储': {
      'userId': wx.getStorageSync('userId'),
      'openid': wx.getStorageSync('openid'),
      'userRoles': wx.getStorageSync('userRoles'),
      'maxUserId': wx.getStorageSync('maxUserId'),
      'needRefresh': wx.getStorageSync('needRefresh')
    },
    '全局数据': {
      'userId': app.globalData.userId,
      'openid': app.globalData.openid,
      'roles': app.globalData.roles,
      'role': app.globalData.role
    },
    '页面数据': {
      'userId': this.data.userId,
      'roles': this.data.roles,
      'currentScenario': this.data.currentScenario
    }
  }
  
  console.log('🐛 完整调试信息:', debugInfo)
  
  const infoText = JSON.stringify(debugInfo, null, 2)
  
  wx.showModal({
    title: '调试信息',
    content: infoText,
    showCancel: true,
    cancelText: '关闭',
    confirmText: '复制',
    success: (res) => {
      if (res.confirm) {
        wx.setClipboardData({
          data: infoText,
          success: () => {
            wx.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
          }
        })
      }
    }
  })
}

// 清除所有缓存
clearCache() {
  wx.showModal({
    title: '清除缓存',
    content: '将清除所有本地存储数据，是否继续？',
    confirmText: '确定',
    confirmColor: '#E74C3C',
    success: (res) => {
      if (res.confirm) {
        wx.clearStorageSync()
        console.log('✅ 所有缓存已清除')
        
        wx.showToast({
          title: '缓存已清除',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/index'
          })
        }, 1500)
      }
    }
  })
}

// 重置用户数据
resetUserData() {
  wx.showModal({
    title: '重置用户数据',
    content: '将清除用户ID和角色信息，下次启动将生成新ID，是否继续？',
    confirmText: '确定',
    confirmColor: '#E74C3C',
    success: (res) => {
      if (res.confirm) {
        const app = getApp()
        
        // 调用 app 的重置方法
        if (app.resetUserId) {
          app.resetUserId()
        } else {
          // 手动重置
          wx.setStorageSync('resetUserId', true)
          wx.removeStorageSync('userId')
          wx.removeStorageSync('openid')
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('hasLoggedIn')
          
          wx.showToast({
            title: '数据已重置',
            icon: 'success'
          })
          
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/index'
            })
          }, 1500)
        }
      }
    }
  })
}
```

### 添加样式

**文件位置**：`miniprogram/pages/role-manage/index.wxss`

```css
/* 调试工具区域 */
.debug-section {
  margin: 30rpx;
  padding: 30rpx;
  background: #FFF9E6;
  border-radius: 20rpx;
  border: 2rpx dashed #FFB74D;
}

.debug-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 20rpx;
}

.debug-btn {
  width: 100%;
  height: 80rpx;
  background: white;
  color: #FF9800;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: 2rpx solid #FF9800;
  line-height: 80rpx;
}

.debug-btn::after {
  border: none;
}

.debug-btn:active {
  background: #FFF3E0;
}
```

---

## 🧪 任务4：在个人中心添加角色显示（可选）

**文件位置**：`miniprogram/pages/user-center/index.wxml`

在用户信息卡片中添加调试信息（仅开发环境显示）：

```xml
<!-- 用户信息卡片 -->
<view class="user-card">
  <view class="user-main-info">
    <!-- ... 现有内容 ... -->
  </view>
  
  <!-- ✅ 新增：调试信息（可选） -->
  <view class="debug-roles" wx:if="{{roles.length > 0}}">
    <text class="debug-label">当前角色：</text>
    <text class="debug-value">{{roles}}</text>
  </view>
</view>
```

添加样式：

```css
/* user-center/index.wxss */
.debug-roles {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
}

.debug-label {
  font-weight: 600;
  margin-right: 8rpx;
}

.debug-value {
  font-family: monospace;
}
```

---

## ✅ 验证测试步骤

### 步骤1：清除缓存测试

```
1. 打开开发者工具
2. 工具 → 清除缓存 → 清除所有
3. 点击"编译"
4. 查看控制台输出：
   🆕 生成新用户ID
     - 来源: 首次创建
     - 新ID: 1001
5. 进入"我的" → "权限"
6. 查看ID显示：应该是 1001
```

### 步骤2：测试权限切换

```
1. 在权限管理页面
2. 点击"超级用户"
3. 观察控制台输出：
   🔄 开始切换用户场景
     - 目标场景: 超级用户
     - 目标角色: ['customer', 'artist', 'service', 'admin']
   ✅ 已设置刷新标志 needRefresh = true
   🔙 准备返回个人中心...
   ✅ 已返回个人中心，等待页面刷新
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔄 个人中心页面 onShow 触发
   ⚡ 检测到刷新标志，执行强制刷新
   🔄 开始重新加载数据...
   👤 用户角色加载完成:
     - 角色列表: ['customer', 'artist', 'service', 'admin']
   ✅ setData 完成
   📊 UI 显示逻辑判断:
     - 应显示画师认证: false
     - 应显示工作台: true
4. 页面应该显示"工作台"和"管理后台"
```

### 步骤3：测试切换到普通用户

```
1. 再次进入权限管理
2. 点击"普通用户"
3. 观察控制台输出：
   🔄 开始切换用户场景
     - 目标场景: 普通用户
     - 目标角色: ['customer']
   ✅ 已设置刷新标志 needRefresh = true
   ...
   👤 用户角色加载完成:
     - 角色列表: ['customer']  ← 关键检查点
   📊 UI 显示逻辑判断:
     - 应显示画师认证: true   ← 关键检查点
     - 应显示工作台: false     ← 关键检查点
4. 页面应该显示"画师认证"
5. 页面不应该显示"工作台"和"管理后台"
```

### 步骤4：测试调试工具

```
1. 进入权限管理
2. 点击"查看调试信息"
3. 查看弹窗显示的信息
4. 点击"复制"
5. 粘贴到记事本查看完整信息
```

### 步骤5：测试重置ID

```
1. 在权限管理页面
2. 点击"重置用户数据"
3. 确认重置
4. 观察控制台输出：
   ⚠️ 准备重置用户ID...
   ✅ 用户数据已清除，下次启动将生成新ID
5. 重新启动后查看新ID
```

---

## 📊 预期的控制台日志输出

### 正常启动（已有ID）

```
✅ 用户信息已加载
  - 来源: 本地缓存
  - 用户ID: 1354
  - 昵称: 妙妙
```

### 首次启动（生成新ID）

```
🆕 生成新用户ID
  - 来源: 首次创建
  - 新ID: 1001
📊 ID生成逻辑:
  - 当前最大ID: 1000
  - 新用户ID: 1001
  - 已更新maxUserId为: 1001
```

### 切换权限

```
🔄 开始切换用户场景
  - 目标场景: 普通用户
  - 目标角色: ['customer']
✅ 已设置刷新标志 needRefresh = true
🔙 准备返回个人中心...
✅ 已返回个人中心，等待页面刷新
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 个人中心页面 onShow 触发
  - 时间: 19:28:35
⚡ 检测到刷新标志，执行强制刷新
🔄 开始重新加载数据...
👤 开始加载用户角色...
  - 本地存储读取: ['customer']
  - 全局数据读取: ['customer']
👤 用户角色加载完成:
  - 用户ID: 1354
  - 角色列表: ['customer']
  - 角色文本: ['普通用户']
  - 主角色: customer
✅ setData 完成，当前页面 roles: ['customer']
📊 UI 显示逻辑判断:
  - 包含画师角色: false
  - 包含管理员角色: false
  - 应显示画师认证: true
  - 应显示工作台: false
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ⚠️ 重要提醒

### 给 AI 的执行要求

1. **保留所有现有日志**
   - 不要删除任何 `console.log`
   - 只添加新的日志，不修改现有的

2. **不要重构代码结构**
   - 只修改指定的函数
   - 保持现有的代码风格
   - 不要改变函数名和参数

3. **严格按照指令修改**
   - 每个修改点都有 `✅` 标记
   - 只修改标记的部分
   - 不要自作主张添加其他功能

4. **测试验证**
   - 修改完成后，必须按照测试步骤验证
   - 确保控制台输出符合预期
   - 确保UI显示正确

5. **保持向后兼容**
   - 不要破坏现有功能
   - 确保其他页面不受影响
   - 保持数据结构不变

---

## 📝 修改清单

### 必须修改的文件

- [ ] `miniprogram/app.js`
  - [ ] 修改 `initUserInfo()` 方法
  - [ ] 修改 `generateNewUserId()` 方法
  - [ ] 添加 `resetUserId()` 方法

- [ ] `miniprogram/pages/role-manage/index.js`
  - [ ] 修改 `switchScenario()` 方法
  - [ ] 修改 `toggleRole()` 方法
  - [ ] 添加 `showDebugInfo()` 方法（可选）
  - [ ] 添加 `clearCache()` 方法（可选）
  - [ ] 添加 `resetUserData()` 方法（可选）

- [ ] `miniprogram/pages/user-center/index.js`
  - [ ] 修改 `onShow()` 方法
  - [ ] 增强 `loadUserRole()` 方法的日志

### 可选修改的文件

- [ ] `miniprogram/pages/role-manage/index.wxml`
  - [ ] 添加调试工具区域

- [ ] `miniprogram/pages/role-manage/index.wxss`
  - [ ] 添加调试工具样式

- [ ] `miniprogram/pages/user-center/index.wxml`
  - [ ] 添加角色调试显示

- [ ] `miniprogram/pages/user-center/index.wxss`
  - [ ] 添加调试信息样式

---

## 🎯 成功标准

### 修改成功的标志

1. **ID显示清晰**
   - ✅ 控制台明确显示ID来源（本地缓存/首次创建/手动重置）
   - ✅ 用户可以通过调试工具查看ID信息
   - ✅ 用户可以手动重置ID

2. **权限切换正常**
   - ✅ 切换到"普通用户"后，只显示"画师认证"
   - ✅ 切换到"画师"后，显示"工作台"
   - ✅ 切换到"管理员"后，显示"工作台"和"管理后台"
   - ✅ 切换到"超级用户"后，显示所有入口

3. **日志输出完整**
   - ✅ 每次切换都有完整的日志输出
   - ✅ 可以通过日志追踪整个流程
   - ✅ 日志清晰易读，有明确的标识符

4. **调试工具可用**（可选）
   - ✅ 可以查看完整的调试信息
   - ✅ 可以清除缓存
   - ✅ 可以重置用户数据

---

## 📞 如果修改失败

### 排查步骤

1. **检查控制台日志**
   - 查看是否有错误信息
   - 查看日志输出是否完整
   - 查看数据是否正确

2. **检查本地存储**
   - 在控制台执行：
     ```javascript
     console.log('userId:', wx.getStorageSync('userId'))
     console.log('userRoles:', wx.getStorageSync('userRoles'))
     console.log('needRefresh:', wx.getStorageSync('needRefresh'))
     ```

3. **检查页面数据**
   - 在 `user-center/index.js` 的 `loadUserRole()` 后添加：
     ```javascript
     console.log('页面 data.roles:', this.data.roles)
     console.log('全局 globalData.roles:', app.globalData.roles)
     ```

4. **检查WXML条件**
   - 在 `user-center/index.wxml` 中临时添加：
     ```xml
     <view>roles: {{roles}}</view>
     <view>indexOf artist: {{roles.indexOf('artist')}}</view>
     ```

---

## 🎓 技术说明

### 为什么使用 needRefresh 标志？

```javascript
// 问题：小程序的页面缓存机制
// onShow() 触发时，页面可能还在显示旧的DOM

// 解决方案：使用标志位强制刷新
// 1. 切换权限时设置标志
wx.setStorageSync('needRefresh', true)

// 2. onShow 检查标志
if (needRefresh) {
  // 清空数据
  this.setData({ roles: [] })
  // 延迟重新加载
  setTimeout(() => this.loadData(), 100)
}
```

### 为什么要延迟100ms？

```javascript
// 原因：确保 setData 的清空操作完成
// 小程序的 setData 是异步的
// 需要等待DOM更新完成后再加载新数据

this.setData({ roles: [] })  // 清空
setTimeout(() => {
  this.loadData()  // 重新加载
}, 100)
```

### 为什么要添加这么多日志？

```javascript
// 原因：方便调试和追踪问题
// 1. 可以看到完整的执行流程
// 2. 可以定位问题发生的位置
// 3. 可以验证数据是否正确

console.log('🔄 开始切换用户场景')
console.log('  - 目标场景:', scenario.name)
console.log('  - 目标角色:', roles)
```

---

**文档结束**

请将此文档提供给开发 AI，要求其严格按照指令执行修改。

