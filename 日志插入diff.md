# 日志插入 Diff 报告

## 📝 修改概览

### 1. app.js - 注入全局错误处理

```diff
+ // ✅ 引入全局错误处理模块
+ const { globalErrorHandler } = require('./utils/global-error-handler.js')
+
  App({
    globalData: {
      userInfo: null,
      userId: 0,
      openid: '',
      role: 'customer',
-     userProfile: null
+     userProfile: null,
+     errorHandler: globalErrorHandler // 暴露错误处理器
    },

    onLaunch() {
+     // ✅ 初始化全局错误捕获
+     globalErrorHandler.init()
+     console.log('🛡️ 全局错误捕获已启动')
+     
      // ✅ 初始化云开发
      if (wx.cloud) {
```

**影响：**
- 捕获所有未处理的 Promise 错误
- 捕获所有 console.error
- 捕获所有 App.onError 和 App.onUnhandledRejection

---

### 2. cloud-api.js - 添加 API 调用日志

```diff
  async callFunction(name, data) {
+   // ✅ 请求日志
+   console.log('[API CALL]', name, data)
+   const startTime = Date.now()
+   
    try {
      const res = await wx.cloud.callFunction({
        name,
        data
      })
      
+     const duration = Date.now() - startTime
+     
      if (res.result) {
+       // ✅ 成功日志
+       console.log('[API RESULT]', name, {
+         duration: `${duration}ms`,
+         success: res.result.success,
+         dataSize: JSON.stringify(res.result).length,
+         preview: res.result
+       })
        return res.result
      }
      
+     // ✅ 异常结果日志
+     console.warn('[API WARNING]', name, '云函数返回结果异常', res)
      return { success: false, message: '云函数返回结果异常' }
    } catch (error) {
+     const duration = Date.now() - startTime
+     
+     // ✅ 错误日志
+     console.error('[API ERROR]', name, {
+       duration: `${duration}ms`,
+       error: error.errMsg || error.message,
+       code: error.errCode,
+       details: error
+     })
+     
-     console.error(`云函数 ${name} 调用失败:`, error)
      return this.handleError(error, ` - ${name}`)
    }
  }
```

**影响：**
- 所有前端调用云函数都会打印：[API CALL] 函数名 参数
- 成功返回会打印：[API RESULT] 函数名 {duration, success, dataSize}
- 失败会打印：[API ERROR] 函数名 {duration, error, code}

---

### 3. orderManager/index.js - 云函数日志

```diff
  exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { action } = event
+   
+   // ✅ 云函数入口日志
+   console.log('[CLOUD FUNCTION]', 'orderManager', {
+     action,
+     openid,
+     params: event
+   })
+   const startTime = Date.now()

    try {
+     let result
      switch (action) {
        case 'create':
-         return await createOrder(openid, event)
+         result = await createOrder(openid, event)
+         break
        case 'getList':
-         return await getOrderList(openid, event)
+         result = await getOrderList(openid, event)
+         break
        // ... 其他 case
        default:
-         return { success: false, message: '未知操作' }
+         result = { success: false, message: '未知操作' }
      }
      
+     // ✅ 成功日志
+     const duration = Date.now() - startTime
+     console.log('[CLOUD RESULT]', 'orderManager', {
+       action,
+       duration: `${duration}ms`,
+       success: result.success,
+       message: result.message
+     })
+     
+     return result
    } catch (error) {
+     // ✅ 错误日志
+     const duration = Date.now() - startTime
+     console.error('[CLOUD ERROR]', 'orderManager', {
+       action,
+       duration: `${duration}ms`,
+       error: error.message,
+       stack: error.stack
+     })
+     
-     console.error('订单管理错误:', error)
      return {
        success: false,
        message: error.message || '操作失败'
      }
    }
  }
```

```diff
  async function createOrder(openid, event) {
+   console.log('[createOrder] 开始创建订单', { openid, event })
+   
    const {
      productId,
      productName,
      // ...
    } = event

    // 获取当前用户信息
+   console.log('[createOrder] 查询用户信息', { openid })
    const userRes = await db.collection('users')
      .where({ _openid: openid })
      .get()
```

**影响：**
- 云函数入口打印：[CLOUD FUNCTION] orderManager {action, openid, params}
- 云函数成功打印：[CLOUD RESULT] orderManager {action, duration, success}
- 云函数错误打印：[CLOUD ERROR] orderManager {action, duration, error, stack}
- 子函数打印：[createOrder] 关键步骤

---

## 🔍 日志格式统一

### 前端日志标签

| 标签 | 含义 | 示例 |
|-----|------|------|
| `[API CALL]` | 调用云函数 | `[API CALL] orderManager {action: 'create', ...}` |
| `[API RESULT]` | 云函数成功返回 | `[API RESULT] orderManager {duration: '120ms', success: true}` |
| `[API ERROR]` | 云函数调用失败 | `[API ERROR] orderManager {error: 'network timeout'}` |
| `[API WARNING]` | 云函数返回异常 | `[API WARNING] orderManager 云函数返回结果异常` |
| `[GLOBAL ERROR]` | 全局错误捕获 | `[GLOBAL ERROR] {type: 'UNHANDLED_REJECTION', file: 'order-list.js'}` |
| `[STORAGE READ]` | 读取本地缓存 | `[STORAGE READ] pending_orders [...]` |
| `[STORAGE WRITE]` | 写入本地缓存 | `[STORAGE WRITE] pending_orders [...]` |

### 云函数日志标签

| 标签 | 含义 | 示例 |
|-----|------|------|
| `[CLOUD FUNCTION]` | 云函数入口 | `[CLOUD FUNCTION] orderManager {action: 'create'}` |
| `[CLOUD RESULT]` | 云函数成功返回 | `[CLOUD RESULT] orderManager {duration: '85ms'}` |
| `[CLOUD ERROR]` | 云函数执行错误 | `[CLOUD ERROR] orderManager {error: 'user not found'}` |
| `[createOrder]` | 子函数日志 | `[createOrder] 开始创建订单` |
| `[getOrderList]` | 子函数日志 | `[getOrderList] 查询条件: {status: 'pending'}` |

---

## 📋 待插入日志的文件清单

### 云函数（需要插入日志）

- [x] `cloudfunctions/orderManager/index.js` - ✅ 已插入
- [ ] `cloudfunctions/userManager/index.js` - ❌ 待插入
- [ ] `cloudfunctions/productManager/index.js` - ❌ 待插入
- [ ] `cloudfunctions/artistManager/index.js` - ❌ 待插入
- [ ] `cloudfunctions/financeManager/index.js` - ❌ 待插入
- [ ] `cloudfunctions/contentManager/index.js` - ❌ 待插入
- [ ] `cloudfunctions/statsManager/index.js` - ❌ 待插入

### 前端页面（已通过 cloud-api.js 统一插入）

所有调用 `cloudAPI.*` 的页面自动获得日志：
- ✅ `category-manage/index.js`
- ✅ `order-success/index.js`
- ✅ `service-qr-manage/index.js`
- ✅ `login/index.js`
- ✅ `reward-records/index.js`
- ✅ `apply/index.js`
- ✅ `admin/index.js`
- ✅ `workspace/index.js`
- ✅ `order-list/index.js`
- ✅ `product-manage/index.js`
- ✅ `home/index.js`
- ✅ `banner-manage/index.js`

---

## 🎯 使用方式

### 1. 查看实时日志

**方法一：微信开发者工具**
- 打开控制台
- 筛选关键词：`[API CALL]`、`[API ERROR]`、`[GLOBAL ERROR]`

**方法二：云函数日志**
- 云开发控制台 → 云函数 → 日志
- 筛选关键词：`[CLOUD FUNCTION]`、`[CLOUD ERROR]`

### 2. 获取错误报告

```javascript
// 在任意页面或控制台执行
const app = getApp()
const report = app.globalData.errorHandler.generateReport()
console.log(report)
```

### 3. 查看错误日志

```javascript
// 获取最近20条错误
const errors = app.globalData.errorHandler.getErrorLog(20)
console.table(errors)
```

### 4. 清空错误日志

```javascript
app.globalData.errorHandler.clearErrorLog()
```

---

## ⚠️ 注意事项

1. **性能影响**
   - 每次云函数调用增加 2-3 行日志
   - JSON.stringify 对大数据量有性能开销
   - 生产环境可考虑关闭详细日志

2. **日志过滤**
   - 敏感信息（密码、token）不要打印
   - 大对象只打印关键字段
   - 使用 `preview` 截取前1000字符

3. **错误上报**
   - `global-error-handler.js` 的 `reportToCloud` 已预留
   - 可对接第三方监控平台（如 Sentry、阿里云日志）

---

## ✅ 下一步行动

1. **补充其他云函数日志** - 按照 orderManager 的模式
2. **测试日志输出** - 真实环境验证日志格式
3. **优化日志过滤** - 生产环境只保留关键日志
4. **对接监控平台** - 实现错误自动上报

---

**日志系统已就绪，可开始全面监控。**

