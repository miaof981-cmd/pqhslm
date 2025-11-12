/**
 * 云函数示例 - 多角色权限控制
 * 说明：由于users/orders等集合设置为"仅创建者可读写"
 *      前端无法直接读取，必须通过云函数API实现权限控制
 */

// ========== 示例1：获取用户列表 ==========
// 云函数名：getUserList

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 1. 检查是否为管理员
    const adminCheck = await db.collection('system_admin')
      .where({
        _openid: openid,
        isAdmin: true
      })
      .get()
    
    const isAdmin = adminCheck.data.length > 0
    
    // 2. 根据角色返回数据
    if (isAdmin) {
      // 管理员：返回所有用户
      const result = await db.collection('users')
        .get()
      
      return {
        code: 0,
        message: '成功',
        data: result.data
      }
    } else {
      // 普通用户：只返回自己的信息
      const result = await db.collection('users')
        .where({ _openid: openid })
        .get()
      
      return {
        code: 0,
        message: '成功',
        data: result.data
      }
    }
  } catch (error) {
    console.error('获取用户列表失败', error)
    return {
      code: 1001,
      message: error.message,
      data: null
    }
  }
}

// ========== 示例2：获取订单列表 ==========
// 云函数名：getOrderList

exports.getOrderList = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { status } = event // 前端传入的筛选条件
  
  try {
    // 1. 检查用户角色
    const adminCheck = await db.collection('system_admin')
      .where({ _openid: openid, isAdmin: true })
      .get()
    const isAdmin = adminCheck.data.length > 0
    
    // 2. 检查是否为画师
    const artistCheck = await db.collection('artist_applications')
      .where({ _openid: openid, status: 'approved' })
      .get()
    const isArtist = artistCheck.data.length > 0
    
    // 3. 检查是否为客服
    const serviceCheck = await db.collection('users')
      .where({ _openid: openid })
      .get()
    const userRoles = serviceCheck.data[0]?.roles || []
    const isService = userRoles.includes('service')
    
    // 4. 构建查询条件
    let where = {}
    
    if (isAdmin) {
      // 管理员：查看所有订单
      where = status ? { status } : {}
    } else if (isArtist) {
      // 画师：查看分配给自己的订单
      where = { artistOpenId: openid }
      if (status) where.status = status
    } else if (isService) {
      // 客服：查看分配给自己的订单
      where = { serviceOpenId: openid }
      if (status) where.status = status
    } else {
      // 普通用户：查看自己的订单
      where = { buyerOpenId: openid }
      if (status) where.status = status
    }
    
    // 5. 查询订单
    const result = await db.collection('orders')
      .where(where)
      .orderBy('createTime', 'desc')
      .get()
    
    return {
      code: 0,
      message: '成功',
      data: result.data
    }
  } catch (error) {
    console.error('获取订单列表失败', error)
    return {
      code: 1002,
      message: error.message,
      data: null
    }
  }
}

// ========== 示例3：获取收入账本 ==========
// 云函数名：getIncomeList

exports.getIncomeList = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { userId } = event // 前端传入的用户ID
  
  try {
    // 1. 检查是否为管理员
    const adminCheck = await db.collection('system_admin')
      .where({ _openid: openid, isAdmin: true })
      .get()
    const isAdmin = adminCheck.data.length > 0
    
    // 2. 获取当前用户ID
    const userResult = await db.collection('users')
      .where({ _openid: openid })
      .get()
    const currentUserId = userResult.data[0]?.userId
    
    // 3. 权限验证
    if (!isAdmin && userId !== currentUserId) {
      return {
        code: 403,
        message: '无权限查看他人收入',
        data: null
      }
    }
    
    // 4. 查询收入记录
    const where = isAdmin && userId ? { userId } : { userId: currentUserId }
    const result = await db.collection('income_ledger')
      .where(where)
      .orderBy('createTime', 'desc')
      .get()
    
    return {
      code: 0,
      message: '成功',
      data: result.data
    }
  } catch (error) {
    console.error('获取收入列表失败', error)
    return {
      code: 1003,
      message: error.message,
      data: null
    }
  }
}

// ========== 示例4：创建订单 ==========
// 云函数名：createOrder

exports.createOrder = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const orderData = event.orderData
  
  try {
    // 1. 获取买家信息
    const buyerResult = await db.collection('users')
      .where({ _openid: openid })
      .get()
    const buyer = buyerResult.data[0]
    
    if (!buyer) {
      return {
        code: 404,
        message: '用户不存在',
        data: null
      }
    }
    
    // 2. 补充订单信息
    const order = {
      ...orderData,
      buyerOpenId: openid,
      buyerId: buyer.userId,
      buyerName: buyer.nickName,
      buyerAvatar: buyer.avatarUrl,
      createTime: new Date().toISOString(),
      status: 'unpaid',
      _openid: openid // 设置创建者
    }
    
    // 3. 插入订单
    const result = await db.collection('orders').add({
      data: order
    })
    
    return {
      code: 0,
      message: '订单创建成功',
      data: {
        orderId: result._id
      }
    }
  } catch (error) {
    console.error('创建订单失败', error)
    return {
      code: 1004,
      message: error.message,
      data: null
    }
  }
}

// ========== 示例5：更新订单状态 ==========
// 云函数名：updateOrderStatus

exports.updateOrderStatus = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { orderId, newStatus } = event
  
  try {
    // 1. 检查是否为管理员
    const adminCheck = await db.collection('system_admin')
      .where({ _openid: openid, isAdmin: true })
      .get()
    const isAdmin = adminCheck.data.length > 0
    
    // 2. 获取订单信息
    const orderResult = await db.collection('orders')
      .doc(orderId)
      .get()
    const order = orderResult.data
    
    if (!order) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      }
    }
    
    // 3. 权限验证
    const isBuyer = order.buyerOpenId === openid
    const isArtist = order.artistOpenId === openid
    const isService = order.serviceOpenId === openid
    
    // 4. 根据角色判断是否有权限修改
    let hasPermission = false
    
    if (isAdmin) {
      hasPermission = true // 管理员可以修改任何状态
    } else if (isBuyer) {
      // 买家只能取消订单或确认收货
      hasPermission = ['cancelled', 'completed'].includes(newStatus)
    } else if (isArtist) {
      // 画师只能提交作品
      hasPermission = newStatus === 'waitingConfirm'
    } else if (isService) {
      // 客服可以修改部分状态
      hasPermission = ['inProgress', 'refunding'].includes(newStatus)
    }
    
    if (!hasPermission) {
      return {
        code: 403,
        message: '无权限修改订单状态',
        data: null
      }
    }
    
    // 5. 更新订单状态
    await db.collection('orders')
      .doc(orderId)
      .update({
        data: {
          status: newStatus,
          updatedAt: new Date().toISOString()
        }
      })
    
    return {
      code: 0,
      message: '订单状态更新成功',
      data: null
    }
  } catch (error) {
    console.error('更新订单状态失败', error)
    return {
      code: 1005,
      message: error.message,
      data: null
    }
  }
}

// ========== 前端调用示例 ==========

/**
 * 前端调用云函数
 */

// 获取订单列表
wx.cloud.callFunction({
  name: 'getOrderList',
  data: {
    status: 'inProgress' // 可选筛选条件
  }
}).then(res => {
  if (res.result.code === 0) {
    console.log('订单列表:', res.result.data)
  } else {
    console.error('获取失败:', res.result.message)
  }
})

// 创建订单
wx.cloud.callFunction({
  name: 'createOrder',
  data: {
    orderData: {
      productId: 'product_001',
      productName: '商品名称',
      quantity: 1,
      totalAmount: 88.00
      // ... 其他订单信息
    }
  }
}).then(res => {
  if (res.result.code === 0) {
    console.log('订单创建成功:', res.result.data.orderId)
  }
})

// ========== 使用说明 ==========

/**
 * 云函数部署步骤：
 * 
 * 1. 在cloudfunctions目录下创建对应的云函数文件夹
 *    例如：cloudfunctions/getUserList/
 * 
 * 2. 在文件夹中创建index.js，复制对应的函数代码
 * 
 * 3. 创建package.json：
 *    {
 *      "name": "getUserList",
 *      "version": "1.0.0",
 *      "description": "获取用户列表",
 *      "main": "index.js",
 *      "dependencies": {
 *        "wx-server-sdk": "^2.6.3"
 *      }
 *    }
 * 
 * 4. 右键点击云函数文件夹 → 上传并部署：云端安装依赖
 * 
 * 5. 部署成功后，前端即可调用
 */

/**
 * 云函数开发建议：
 * 
 * 1. 统一返回格式：
 *    { code: 0, message: '成功', data: {} }
 * 
 * 2. 统一错误码：
 *    0 - 成功
 *    403 - 权限不足
 *    404 - 资源不存在
 *    1001+ - 业务错误
 * 
 * 3. 日志记录：
 *    使用console.log记录关键操作
 *    使用console.error记录错误
 * 
 * 4. 权限验证：
 *    每个云函数都应验证用户权限
 *    敏感操作必须验证管理员身份
 */

