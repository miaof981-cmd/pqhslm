const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 短信验证码管理云函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  console.log('[smsManager] 收到请求:', JSON.stringify(event))

  try {
    switch (action) {
      case 'sendCode':
        return await sendVerificationCode(openid, event)
      case 'verifyCode':
        return await verifyCode(openid, event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('[smsManager] 错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 发送验证码
 */
async function sendVerificationCode(openid, event) {
  const { phone } = event

  // 验证手机号格式
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, message: '手机号格式不正确' }
  }

  // 检查发送频率（60秒内不能重复发送）
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
  const recentRes = await db.collection('sms_codes')
    .where({
      phone: phone,
      createdAt: db.command.gte(oneMinuteAgo)
    })
    .get()

  if (recentRes.data.length > 0) {
    return { 
      success: false, 
      message: '验证码已发送，请60秒后再试' 
    }
  }

  // 生成6位随机验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  // 保存验证码到数据库（5分钟有效期）
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000)

  await db.collection('sms_codes').add({
    data: {
      phone: phone,
      code: code,
      openid: openid,
      verified: false,
      createdAt: now,
      expiresAt: expiresAt
    }
  })

  // ⚠️ 方案1：使用云开发短信（需要开通服务）
  // 取消下面的注释以启用真实短信发送
  /*
  try {
    await cloud.openapi.cloudbase.sendSms({
      env: cloud.DYNAMIC_CURRENT_ENV,
      content: `【联盟小程序】您的验证码是：${code}，5分钟内有效，请勿泄露。`,
      phoneNumberSet: [phone]
    })
  } catch (smsError) {
    console.error('发送短信失败:', smsError)
    // 即使发送失败，也返回成功，避免暴露验证码
  }
  */

  // ⚠️ 方案2：开发测试阶段，直接返回验证码（生产环境必须删除）
  console.log(`📱 验证码（测试）: ${phone} -> ${code}`)

  return {
    success: true,
    message: '验证码已发送',
    // ⚠️ 生产环境必须删除这一行
    debugCode: code  // 仅开发测试时返回
  }
}

/**
 * 验证验证码
 */
async function verifyCode(openid, event) {
  const { phone, code } = event

  if (!phone || !code) {
    return { success: false, message: '手机号和验证码不能为空' }
  }

  // 查询最新的验证码
  const res = await db.collection('sms_codes')
    .where({
      phone: phone,
      code: code,
      verified: false
    })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return { success: false, message: '验证码错误或已使用' }
  }

  const record = res.data[0]

  // 检查是否过期
  if (new Date() > new Date(record.expiresAt)) {
    return { success: false, message: '验证码已过期，请重新获取' }
  }

  // 标记为已验证
  await db.collection('sms_codes')
    .doc(record._id)
    .update({
      data: {
        verified: true,
        verifiedAt: new Date()
      }
    })

  return {
    success: true,
    message: '验证成功'
  }
}

