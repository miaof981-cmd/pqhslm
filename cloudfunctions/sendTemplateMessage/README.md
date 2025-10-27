# 模板消息云函数使用说明

## 📋 功能说明

当画师上传作品后，系统自动向客户发送订阅消息（模板消息），提醒客户确认订单。

---

## 🚀 部署步骤

### 1. 安装依赖

在微信开发者工具中：
1. 右键点击 `cloudfunctions/sendTemplateMessage` 文件夹
2. 选择"在终端中打开"
3. 执行：`npm install`

### 2. 上传云函数

1. 右键点击 `cloudfunctions/sendTemplateMessage` 文件夹
2. 选择"上传并部署：云端安装依赖"

### 3. 配置模板ID

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入"功能" → "订阅消息"
3. 选择"公共模板库"
4. 搜索并添加"订单完成通知"模板
5. 复制模板ID
6. 在 `index.js` 中替换 `YOUR_TEMPLATE_ID_HERE`

---

## 📝 模板字段说明

推荐使用的模板字段：

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| thing1 | thing | 订单号 | 202510271529058195 |
| thing2 | thing | 商品名称 | Q版头像定制 |
| thing3 | thing | 画师 | 画师小明 |
| time4 | time | 完成时间 | 2025-10-27 15:29 |
| thing5 | thing | 温馨提示 | 请点击查看详情并确认完成 |

**注意**：字段名称（如 `thing1`、`time4`）需要与你申请的模板字段名称一致。

---

## 🧪 测试方法

### 在小程序中测试

```javascript
// 在订单详情页点击"上传作品"后会自动调用
// 或者在控制台手动测试：

wx.cloud.callFunction({
  name: 'sendTemplateMessage',
  data: {
    type: 'orderComplete',
    toUser: 'oXXXX-你的openid',  // 替换为测试用户的openid
    data: {
      orderId: '202510271529058195',
      productName: '测试商品',
      artistName: '测试画师',
      completeTime: '2025-10-27 15:29',
      page: 'pages/order-detail/index?id=202510271529058195&source=customer'
    }
  },
  success: res => {
    console.log('✅ 发送成功:', res)
  },
  fail: err => {
    console.error('❌ 发送失败:', err)
  }
})
```

---

## ⚠️ 注意事项

### 1. 用户授权

用户必须先授权才能接收消息。建议在下单时请求授权：

```javascript
// 在下单页面
wx.requestSubscribeMessage({
  tmplIds: ['YOUR_TEMPLATE_ID_HERE'],
  success: (res) => {
    if (res['YOUR_TEMPLATE_ID_HERE'] === 'accept') {
      console.log('✅ 用户已授权')
    }
  }
})
```

### 2. 获取用户 openid

在下单时保存买家的 openid：

```javascript
// 下单时
const { result } = await wx.cloud.callFunction({
  name: 'login'
})

order.buyerOpenId = result.openid
```

### 3. 环境配置

- 开发环境：`miniprogramState: 'developer'`
- 体验版：`miniprogramState: 'trial'`
- 正式版：`miniprogramState: 'formal'`

---

## 📊 查看发送记录

1. 登录微信公众平台
2. 进入"功能" → "订阅消息"
3. 点击"发送记录"查看详情

---

## 🔧 故障排查

### 问题1：提示"模板ID不存在"

**解决**：检查 `index.js` 中的 `templateId` 是否正确。

### 问题2：提示"用户拒绝接收消息"

**解决**：用户需要先授权，调用 `wx.requestSubscribeMessage`。

### 问题3：提示"参数错误"

**解决**：检查模板字段名称和类型是否匹配。

---

## 📞 技术支持

如有问题，请查看：
- [微信订阅消息官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html)
- [云开发API文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/open/subscribeMessage/subscribeMessage.send.html)

