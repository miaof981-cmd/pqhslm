// 云函数：发送模板消息
// 用途：画师上传作品后，自动通知客户确认订单

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { type, toUser, data } = event
  
  console.log('📨 收到模板消息发送请求:', {
    type,
    toUser,
    orderId: data.orderId
  })
  
  // 参数校验
  if (!type || !toUser || !data) {
    return {
      success: false,
      errcode: -1,
      errmsg: '参数不完整'
    }
  }
  
  try {
    // 根据消息类型选择模板
    let templateId = ''
    let templateData = {}
    
    if (type === 'orderComplete') {
      // ⚠️ 重要：这里需要替换为你在微信公众平台申请的模板ID
      templateId = 'YOUR_TEMPLATE_ID_HERE'
      
      // 组装模板数据
      // 注意：字段名称需要与模板中的字段名称一致
      templateData = {
        // 订单号（thing类型，最多20个汉字）
        thing1: { 
          value: data.orderId.substring(0, 20) 
        },
        
        // 商品名称（thing类型，最多20个汉字）
        thing2: { 
          value: data.productName.substring(0, 20) 
        },
        
        // 画师（thing类型，最多20个汉字）
        thing3: { 
          value: data.artistName.substring(0, 20) 
        },
        
        // 完成时间（time类型）
        time4: { 
          value: data.completeTime 
        },
        
        // 温馨提示（thing类型，最多20个汉字）
        thing5: { 
          value: '请点击查看详情并确认完成' 
        }
      }
    }
    
    // 发送订阅消息
    const result = await cloud.openapi.subscribeMessage.send({
      touser: toUser,
      page: data.page,
      data: templateData,
      templateId: templateId,
      miniprogramState: 'formal'  // 正式版：formal，开发版：developer，体验版：trial
    })
    
    console.log('✅ 模板消息发送成功:', result)
    
    // 记录发送日志（可选）
    try {
      const db = cloud.database()
      await db.collection('message_logs').add({
        data: {
          type: type,
          toUser: toUser,
          orderId: data.orderId,
          sendTime: new Date(),
          success: true,
          errcode: result.errCode,
          errmsg: result.errMsg
        }
      })
    } catch (logErr) {
      console.warn('⚠️ 日志记录失败:', logErr)
    }
    
    return {
      success: true,
      errcode: result.errCode,
      errmsg: result.errMsg,
      msgid: result.msgId
    }
    
  } catch (err) {
    console.error('❌ 模板消息发送失败:', err)
    
    // 记录失败日志（可选）
    try {
      const db = cloud.database()
      await db.collection('message_logs').add({
        data: {
          type: type,
          toUser: toUser,
          orderId: data.orderId,
          sendTime: new Date(),
          success: false,
          errcode: err.errCode || -1,
          errmsg: err.errMsg || err.message
        }
      })
    } catch (logErr) {
      console.warn('⚠️ 日志记录失败:', logErr)
    }
    
    return {
      success: false,
      errcode: err.errCode || -1,
      errmsg: err.errMsg || err.message
    }
  }
}

