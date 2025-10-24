# 画师商城小程序 - API接口文档

**版本**：v1.0  
**更新时间**：2024-01-25  
**基础URL**：`https://your-cloud-env.service.tcloudbase.com`

---

## 📋 目录

1. [用户相关](#1-用户相关)
2. [商品相关](#2-商品相关)
3. [订单相关](#3-订单相关)
4. [购物车相关](#4-购物车相关)
5. [分类相关](#5-分类相关)
6. [画师相关](#6-画师相关)
7. [公告相关](#7-公告相关)
8. [轮播图相关](#8-轮播图相关)
9. [客服相关](#9-客服相关)
10. [统计相关](#10-统计相关)
11. [会员相关](#11-会员相关)
12. [评价相关](#12-评价相关)
13. [上传相关](#13-上传相关)

---

## 🔐 认证说明

所有接口均需在请求头中携带用户凭证：

```
Authorization: Bearer <access_token>
X-WX-OPENID: <openid>
```

---

## 1. 用户相关

### 1.1 用户登录
**接口**：`POST /api/user/login`  
**描述**：微信登录，获取用户信息和token

**请求参数**：
```json
{
  "code": "微信登录code"
}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 10001,
    "openid": "oABC123...",
    "role": "customer",
    "token": "eyJhbGc...",
    "userInfo": {
      "nickname": "用户昵称",
      "avatar": "头像URL"
    }
  }
}
```

### 1.2 获取用户信息
**接口**：`GET /api/user/info`

**响应**：
```json
{
  "code": 0,
  "data": {
    "userId": 10001,
    "nickname": "用户昵称",
    "avatar": "头像URL",
    "phone": "138****1234",
    "role": "customer",
    "registerTime": "2024-01-01 10:00:00"
  }
}
```

### 1.3 更新用户信息
**接口**：`PUT /api/user/update`

**请求参数**：
```json
{
  "nickname": "新昵称",
  "avatar": "新头像URL",
  "phone": "13800138000"
}
```

---

## 2. 商品相关

### 2.1 商品列表
**接口**：`GET /api/product/list`

**请求参数**：
```
?page=1&pageSize=20&categoryId=xxx&keyword=xxx&sortBy=price&order=asc
```

**响应**：
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "_id": "prod001",
        "name": "精美头像设计",
        "price": "88.00",
        "image": "商品图URL",
        "categoryId": "cat001",
        "categoryName": "头像设计",
        "artistId": "artist001",
        "artistName": "画师小A",
        "deliveryDays": 3,
        "sales": 156,
        "rating": 4.9,
        "tags": ["热销", "精品"],
        "status": "on_sale"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2.2 商品详情
**接口**：`GET /api/product/detail/:id`

**响应**：
```json
{
  "code": 0,
  "data": {
    "_id": "prod001",
    "name": "精美头像设计",
    "summary": "商品简介",
    "detail": "详细描述",
    "price": "88.00",
    "stock": 100,
    "images": ["图1", "图2"],
    "detailImages": ["详情图1"],
    "categoryId": "cat001",
    "artistId": "artist001",
    "artistName": "画师小A",
    "artistAvatar": "头像URL",
    "deliveryDays": 3,
    "specs": [
      {
        "name": "尺寸",
        "values": ["小", "中", "大"]
      }
    ],
    "tags": ["热销"],
    "sales": 156,
    "rating": 4.9,
    "reviewCount": 89,
    "status": "on_sale",
    "createTime": "2024-01-01 10:00:00"
  }
}
```

### 2.3 创建商品
**接口**：`POST /api/product/create`  
**权限**：画师、管理员

**请求参数**：
```json
{
  "name": "商品名称",
  "summary": "商品简介",
  "detail": "详细描述",
  "price": "88.00",
  "stock": 100,
  "images": ["图1", "图2"],
  "detailImages": ["详情图1"],
  "categoryId": "cat001",
  "deliveryDays": 3,
  "specs": [],
  "tags": ["热销"],
  "isOnSale": true,
  "maxBuyCount": 5
}
```

### 2.4 更新商品
**接口**：`PUT /api/product/update/:id`  
**权限**：画师（自己的商品）、管理员

### 2.5 删除商品
**接口**：`DELETE /api/product/delete/:id`  
**权限**：画师（自己的商品）、管理员

### 2.6 上下架商品
**接口**：`PUT /api/product/status/:id`

**请求参数**：
```json
{
  "status": "on_sale" // 或 "off_sale"
}
```

---

## 3. 订单相关

### 3.1 订单列表
**接口**：`GET /api/order/list`

**请求参数**：
```
?page=1&pageSize=20&status=all&keyword=xxx
```

**响应**：
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "_id": "order001",
        "orderNo": "ORD202401250001",
        "productId": "prod001",
        "productName": "精美头像设计",
        "productImage": "图片URL",
        "artistId": "artist001",
        "artistName": "画师小A",
        "buyerId": 10001,
        "buyerName": "买家昵称",
        "amount": "88.00",
        "status": "processing",
        "statusText": "制作中",
        "deliveryDays": 3,
        "createTime": "2024-01-25 10:30:00",
        "deadline": "2024-01-28 10:30:00",
        "serviceQR": "二维码URL"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3.2 订单详情
**接口**：`GET /api/order/detail/:id`

**响应**：
```json
{
  "code": 0,
  "data": {
    "_id": "order001",
    "orderNo": "ORD202401250001",
    "productId": "prod001",
    "productName": "精美头像设计",
    "productImage": "图片URL",
    "categoryName": "头像设计",
    "artistId": "artist001",
    "artistName": "画师小A",
    "artistAvatar": "头像URL",
    "artistLevel": "S",
    "buyerId": 10001,
    "buyerName": "买家昵称",
    "buyerPhone": "138****1234",
    "amount": "88.00",
    "status": "processing",
    "statusText": "制作中",
    "statusIndex": 1,
    "deliveryDays": 3,
    "remark": "订单备注",
    "createTime": "2024-01-25 10:30:00",
    "payTime": "2024-01-25 10:31:00",
    "startTime": "2024-01-25 11:00:00",
    "deadline": "2024-01-28 10:30:00",
    "completeTime": "",
    "serviceQR": "二维码URL",
    "attachments": [],
    "logs": [
      {
        "action": "订单已创建",
        "time": "2024-01-25 10:30:00",
        "operator": "系统"
      }
    ]
  }
}
```

### 3.3 创建订单
**接口**：`POST /api/order/create`

**请求参数**：
```json
{
  "productId": "prod001",
  "spec": "小尺寸",
  "quantity": 1,
  "remark": "订单备注"
}
```

### 3.4 更新订单状态
**接口**：`PUT /api/order/status/:id`

**请求参数**：
```json
{
  "status": "processing",
  "remark": "备注"
}
```

### 3.5 取消订单
**接口**：`PUT /api/order/cancel/:id`

### 3.6 删除订单
**接口**：`DELETE /api/order/delete/:id`

### 3.7 申请退款
**接口**：`POST /api/order/refund/:id`

**请求参数**：
```json
{
  "reason": "退款原因"
}
```

---

## 4. 购物车相关

### 4.1 购物车列表
**接口**：`GET /api/cart/list`

**响应**：
```json
{
  "code": 0,
  "data": [
    {
      "_id": "cart001",
      "productId": "prod001",
      "productName": "精美头像设计",
      "productImage": "图片URL",
      "artistName": "画师小A",
      "price": "88.00",
      "quantity": 1,
      "spec": "小尺寸",
      "selected": false
    }
  ]
}
```

### 4.2 添加到购物车
**接口**：`POST /api/cart/add`

**请求参数**：
```json
{
  "productId": "prod001",
  "spec": "小尺寸",
  "quantity": 1
}
```

### 4.3 更新购物车
**接口**：`PUT /api/cart/update/:id`

**请求参数**：
```json
{
  "quantity": 2,
  "selected": true
}
```

### 4.4 删除购物车商品
**接口**：`DELETE /api/cart/delete/:id`

### 4.5 清空购物车
**接口**：`DELETE /api/cart/clear`

---

## 5. 分类相关

### 5.1 分类列表
**接口**：`GET /api/category/list`

**响应**：
```json
{
  "code": 0,
  "data": [
    {
      "_id": "cat001",
      "name": "头像设计",
      "icon": "图标URL",
      "parentId": null,
      "sort": 1,
      "status": "enabled",
      "productCount": 28,
      "children": [
        {
          "_id": "cat001-1",
          "name": "Q版头像",
          "parentId": "cat001",
          "sort": 1
        }
      ]
    }
  ]
}
```

### 5.2 创建分类
**接口**：`POST /api/category/create`  
**权限**：管理员

**请求参数**：
```json
{
  "name": "分类名称",
  "icon": "图标URL",
  "parentId": null,
  "sort": 1
}
```

### 5.3 更新分类
**接口**：`PUT /api/category/update/:id`  
**权限**：管理员

### 5.4 删除分类
**接口**：`DELETE /api/category/delete/:id`  
**权限**：管理员

---

## 6. 画师相关

### 6.1 画师列表
**接口**：`GET /api/artist/list`

**请求参数**：
```
?page=1&pageSize=20&level=S&keyword=xxx
```

**响应**：
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "_id": "artist001",
        "userId": 10001,
        "name": "画师小A",
        "avatar": "头像URL",
        "level": "S",
        "intro": "个人简介",
        "productCount": 28,
        "orderCount": 156,
        "rating": 4.9,
        "fans": 1234,
        "status": "normal",
        "createTime": "2024-01-01 10:00:00"
      }
    ],
    "total": 50
  }
}
```

### 6.2 画师详情
**接口**：`GET /api/artist/detail/:id`

**响应**：
```json
{
  "code": 0,
  "data": {
    "_id": "artist001",
    "name": "画师小A",
    "avatar": "头像URL",
    "level": "S",
    "intro": "个人简介",
    "productCount": 28,
    "orderCount": 156,
    "rating": 4.9,
    "fans": 1234,
    "isFollowed": false,
    "performance": {
      "monthOrders": 23,
      "monthRevenue": "3456.00",
      "completeRate": 95.6,
      "totalOrders": 156,
      "totalRevenue": "28900.00",
      "goodRate": 98.7
    }
  }
}
```

### 6.3 画师申请
**接口**：`POST /api/artist/apply`

**请求参数**：
```json
{
  "name": "画师名称",
  "intro": "个人简介",
  "portfolio": ["作品图1", "作品图2"],
  "contact": "联系方式"
}
```

### 6.4 审核画师申请
**接口**：`PUT /api/artist/review/:id`  
**权限**：管理员

**请求参数**：
```json
{
  "status": "approved", // 或 "rejected"
  "remark": "审核备注"
}
```

### 6.5 关注/取消关注画师
**接口**：`POST /api/artist/follow/:id`

---

## 7. 公告相关

### 7.1 公告列表
**接口**：`GET /api/notice/list`

**响应**：
```json
{
  "code": 0,
  "data": [
    {
      "_id": "notice001",
      "title": "公告标题",
      "content": "公告内容",
      "status": "enabled",
      "sort": 1,
      "createTime": "2024-01-01 10:00:00"
    }
  ]
}
```

### 7.2 公告详情
**接口**：`GET /api/notice/detail/:id`

### 7.3 创建公告
**接口**：`POST /api/notice/create`  
**权限**：管理员

### 7.4 更新公告
**接口**：`PUT /api/notice/update/:id`  
**权限**：管理员

### 7.5 删除公告
**接口**：`DELETE /api/notice/delete/:id`  
**权限**：管理员

---

## 8. 轮播图相关

### 8.1 轮播图列表
**接口**：`GET /api/banner/list`

**响应**：
```json
{
  "code": 0,
  "data": [
    {
      "_id": "banner001",
      "image": "图片URL",
      "link": "跳转链接",
      "sort": 1,
      "status": "enabled"
    }
  ]
}
```

### 8.2 创建轮播图
**接口**：`POST /api/banner/create`  
**权限**：管理员

### 8.3 更新轮播图
**接口**：`PUT /api/banner/update/:id`  
**权限**：管理员

### 8.4 删除轮播图
**接口**：`DELETE /api/banner/delete/:id`  
**权限**：管理员

---

## 9. 客服相关

### 9.1 客服二维码列表
**接口**：`GET /api/service-qr/list`

**响应**：
```json
{
  "code": 0,
  "data": [
    {
      "_id": "qr001",
      "name": "客服小A",
      "image": "二维码URL",
      "status": "enabled",
      "sort": 1
    }
  ]
}
```

### 9.2 随机获取客服二维码
**接口**：`GET /api/service-qr/random`

**响应**：
```json
{
  "code": 0,
  "data": {
    "_id": "qr001",
    "image": "二维码URL"
  }
}
```

### 9.3 创建客服二维码
**接口**：`POST /api/service-qr/create`  
**权限**：管理员

### 9.4 更新客服二维码
**接口**：`PUT /api/service-qr/update/:id`  
**权限**：管理员

### 9.5 删除客服二维码
**接口**：`DELETE /api/service-qr/delete/:id`  
**权限**：管理员

---

## 10. 统计相关

### 10.1 仪表盘数据
**接口**：`GET /api/stats/dashboard`  
**权限**：管理员

**响应**：
```json
{
  "code": 0,
  "data": {
    "todayOrders": 23,
    "todayRevenue": "3456.00",
    "monthOrders": 456,
    "monthRevenue": "67890.00",
    "totalOrders": 1234,
    "totalRevenue": "123456.00",
    "activeUsers": 567,
    "newUsers": 89,
    "pendingOrders": 12,
    "processingOrders": 34,
    "refundOrders": 3
  }
}
```

### 10.2 画师业绩统计
**接口**：`GET /api/stats/artist/:id`  
**权限**：画师（自己）、管理员

### 10.3 订单统计
**接口**：`GET /api/stats/order`  
**权限**：管理员

**请求参数**：
```
?startDate=2024-01-01&endDate=2024-01-31
```

---

## 11. 会员相关

### 11.1 会员信息
**接口**：`GET /api/member/info`

**响应**：
```json
{
  "code": 0,
  "data": {
    "isMember": true,
    "startDate": "2024-01-01",
    "endDate": "2024-02-01",
    "daysLeft": 15
  }
}
```

### 11.2 续费会员
**接口**：`POST /api/member/renew`

**请求参数**：
```json
{
  "months": 1,
  "amount": "99.00",
  "remark": "备注"
}
```

---

## 12. 评价相关

### 12.1 评价列表
**接口**：`GET /api/review/list`

**请求参数**：
```
?productId=xxx&artistId=xxx&page=1&pageSize=20
```

### 12.2 创建评价
**接口**：`POST /api/review/create`

**请求参数**：
```json
{
  "orderId": "order001",
  "productId": "prod001",
  "artistId": "artist001",
  "rating": 5,
  "content": "评价内容",
  "images": ["图1", "图2"]
}
```

---

## 13. 上传相关

### 13.1 上传图片
**接口**：`POST /api/upload/image`

**请求参数**：
```
Content-Type: multipart/form-data
file: 图片文件
```

**响应**：
```json
{
  "code": 0,
  "data": {
    "url": "https://xxx.com/image.jpg",
    "fileId": "cloud://xxx"
  }
}
```

### 13.2 批量上传图片
**接口**：`POST /api/upload/images`

---

## 📌 状态码说明

| 状态码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 未登录 |
| 1003 | 无权限 |
| 1004 | 资源不存在 |
| 1005 | 操作失败 |
| 2001 | 库存不足 |
| 2002 | 订单状态错误 |
| 2003 | 支付失败 |
| 3001 | 服务器错误 |

---

## 📝 订单状态

| 状态 | 说明 |
|------|------|
| unpaid | 待支付 |
| paid | 已支付 |
| processing | 制作中 |
| completed | 已完成 |
| refunding | 退款中 |
| refunded | 已退款 |
| cancelled | 已取消 |

---

**文档版本**：v1.0  
**最后更新**：2024-01-25  
**维护者**：开发团队
