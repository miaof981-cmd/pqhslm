# 收入计算BUG修复报告

## 【问题描述】

用户反馈：
- 作为客服时，总收入显示40多元，但实际只有1个打赏（10元）+ 1个订单（19.9元）
- 收入明细页面只显示10元打赏，其他收入未显示
- 怀疑收入计算存在重复或错误

## 【问题根因】

### 1. 订单数据重复 ⭐ 核心BUG
**位置**：`user-center/index.js`, `withdraw/index.js`

```javascript
// ❌ 错误做法
const allOrders = [...orders, ...pendingOrders, ...completedOrders]
// 同一订单可能同时存在于多个数组中，导致重复计算
```

**影响**：
- 订单19.9元被计算2次：19.9 * 2 - 5 * 2 = 29.8元（应该是14.9元）
- 打赏10元正常
- 客服分成2元正常
- 总计：29.8 + 10 + 2 = 41.8元（错误！）

### 2. 订单稿费未减平台扣除
**位置**：`income-detail/index.js` 第52行

```javascript
// ❌ 错误
const orderIncome = myCompletedOrders.reduce((sum, o) => sum + parseFloat(o.price), 0)

// ✅ 正确
const orderIncome = myCompletedOrders.reduce((sum, o) => {
  const orderAmount = parseFloat(o.totalPrice) || parseFloat(o.price) || 0
  return sum + Math.max(0, orderAmount - 5)
}, 0)
```

### 3. 数据源不统一
**位置**：`income-detail/index.js`

```javascript
// ❌ 使用旧的 staff-finance（已废弃）
const staffFinance = require('../../utils/staff-finance.js')

// ✅ 使用新的 service-income
const serviceIncome = require('../../utils/service-income.js')
```

## 【修复方案】

### 核心修复逻辑

```javascript
// 🎯 订单去重（使用Map）
const orderMap = new Map()
;[...orders, ...pendingOrders, ...completedOrders].forEach(order => {
  if (order && order.id) {
    orderMap.set(order.id, order)
  }
})
const allOrders = Array.from(orderMap.values())

// 🎯 画师收入 = 订单稿费 + 打赏
const orderIncome = myCompletedOrders.reduce((sum, order) => {
  const amount = parseFloat(order.totalPrice) || parseFloat(order.price) || 0
  return sum + Math.max(0, amount - 5)  // 减去平台扣除
}, 0)

// 🎯 客服收入（从service-income获取）
const csIncome = serviceIncome.computeIncomeByUserId(userId, 'service')

// 🎯 管理员收入（从service-income获取）
const staffIncome = serviceIncome.computeIncomeByUserId(userId, 'admin_share')

// 🎯 总收入
const totalIncome = orderIncome + rewardIncome + csIncome + staffIncome
```

## 【修复文件清单】

### 1. user-center/index.js
- ✅ 添加订单去重逻辑（Map）
- ✅ 分别计算画师、客服、管理员收入
- ✅ 增强控制台输出，便于调试

### 2. withdraw/index.js
- ✅ 添加订单去重逻辑（Map）
- ✅ 统一收入计算逻辑
- ✅ 增强控制台输出

### 3. income-detail/index.js
- ✅ 更换数据源：staff-finance → service-income
- ✅ 订单稿费减去5元平台扣除
- ✅ 添加客服分成显示
- ✅ 统一订单去重逻辑

### 4. income-detail/index.wxml
- ✅ 新增"客服分成"显示项
- ✅ "订单收入"改为"订单稿费"

## 【验证方法】

### 方法1：查看控制台输出
修复后，三个页面会输出详细的收入计算过程：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 收入统计汇总 (user-center)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 用户ID: 1001
📦 订单去重: 3 → 1

🎨 画师角色:
  - 订单稿费: 14.90 元 ( 1 单)
  - 打赏收入: 10.00 元 ( 1 次)
  - 小计: 24.90 元

👔 客服角色: 2.00 元
💼 管理员角色: 0.00 元

💵 总收入: 26.90 元
💸 已提现: 0.00 元
✅ 可提现: 26.90 元
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 方法2：运行验证脚本
在小程序控制台复制粘贴 `/tmp/验证收入计算.js` 的内容运行。

### 方法3：运行清理脚本
如果发现订单重复，运行 `/tmp/清理重复订单.js`。

## 【正确的收入分配模型】

### 订单金额：¥19.9
- 画师稿费：¥14.9（订单金额 - 5）
- 客服分成：¥2.0
- 管理员A：¥2.0
- 管理员B：¥1.0
- **总计**：14.9 + 2 + 2 + 1 = ¥19.9 ✅

### 用户1001的收入（同时是画师+客服）
- 画师订单稿费：¥14.9
- 客服分成：¥2.0
- 打赏收入：¥10.0
- **总计**：14.9 + 2 + 10 = ¥26.9 ✅

## 【关键原则】

1. **订单必须去重**：使用Map按订单ID去重
2. **角色收入互不干扰**：画师、客服、管理员分别计算
3. **订单稿费需减扣除**：画师收入 = 订单金额 - 5元
4. **数据源统一**：客服和管理员分成使用`service-income`
5. **详细日志输出**：便于调试和验证

## 【测试建议】

### 测试用例1：纯画师角色
- 创建1个订单（¥19.9）
- 完成订单
- 预期收入：¥14.9

### 测试用例2：画师+客服角色
- 创建1个订单（¥19.9），serviceId = userId
- 完成订单
- 预期收入：¥16.9（14.9稿费 + 2客服分成）

### 测试用例3：画师+打赏
- 创建1个订单（¥19.9）
- 完成订单
- 打赏¥10
- 预期收入：¥24.9（14.9稿费 + 10打赏）

### 测试用例4：画师+客服+打赏
- 创建1个订单（¥19.9），serviceId = userId
- 完成订单
- 打赏¥10
- 预期收入：¥26.9（14.9稿费 + 2客服分成 + 10打赏）

## 【修复状态】

✅ **已完成**
- user-center 收入计算修复
- withdraw 收入计算修复
- income-detail 数据源统一
- 订单去重逻辑
- 收入明细完整显示

## 【注意事项】

1. **旧数据清理**：如果用户本地有重复订单，需运行清理脚本
2. **控制台检查**：建议用户查看控制台详细输出，确认计算正确
3. **数据一致性**：三个页面（user-center、withdraw、income-detail）现在使用完全相同的计算逻辑

---

**修复完成时间**：2025-11-06  
**修复方法**：方案1 - 修正收入计算逻辑

