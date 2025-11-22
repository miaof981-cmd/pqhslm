// 云函数：systemManager - 系统设置管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 系统设置云函数
 * 管理全局系统配置（工作人员二维码、售后二维码等）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'getSystemSettings':
        return await getSystemSettings()
      case 'updateSystemSettings':
        return await updateSystemSettings(openid, event)
      case 'uploadStaffQRCode':
        return await uploadStaffQRCode(openid, event)
      case 'uploadServiceQRCode':
        return await uploadServiceQRCode(openid, event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('系统设置错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 获取系统设置
 */
async function getSystemSettings() {
  const res = await db.collection('system_settings')
    .doc('global')
    .get()

  if (res.data) {
    return {
      success: true,
      data: res.data
    }
  }

  // 如果不存在，返回默认值
  return {
    success: true,
    data: {
      staff_contact_qrcode: '',
      service_qrcode: '',
      complaint_qrcode: '',
      platform_name: '画师联盟',
      platform_slogan: '专业约稿平台'
    }
  }
}

/**
 * 更新系统设置
 */
async function updateSystemSettings(openid, event) {
  // 检查管理员权限
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { settings } = event
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  try {
    // 尝试更新
    await db.collection('system_settings')
      .doc('global')
      .update({
        data: {
          ...settings,
          updatedAt: now
        }
      })
  } catch (error) {
    // 如果不存在则创建
    if (error.errCode === -1) {
      await db.collection('system_settings').add({
        data: {
          _id: 'global',
          ...settings,
          createdAt: now,
          updatedAt: now
        }
      })
    } else {
      throw error
    }
  }

  return {
    success: true,
    message: '更新成功'
  }
}

/**
 * 上传工作人员二维码
 */
async function uploadStaffQRCode(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { fileID, cloudPath } = event
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // 更新到系统设置
  try {
    await db.collection('system_settings')
      .doc('global')
      .update({
        data: {
          staff_contact_qrcode: fileID,
          staff_contact_qrcode_path: cloudPath,
          updatedAt: now
        }
      })
  } catch (error) {
    if (error.errCode === -1) {
      await db.collection('system_settings').add({
        data: {
          _id: 'global',
          staff_contact_qrcode: fileID,
          staff_contact_qrcode_path: cloudPath,
          createdAt: now,
          updatedAt: now
        }
      })
    } else {
      throw error
    }
  }

  return {
    success: true,
    message: '上传成功',
    data: { fileID, cloudPath }
  }
}

/**
 * 上传售后二维码
 */
async function uploadServiceQRCode(openid, event) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { success: false, message: '仅管理员可操作' }
  }

  const { fileID, cloudPath } = event
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  try {
    await db.collection('system_settings')
      .doc('global')
      .update({
        data: {
          service_qrcode: fileID,
          service_qrcode_path: cloudPath,
          complaint_qrcode: fileID,  // 兼容字段
          updatedAt: now
        }
      })
  } catch (error) {
    if (error.errCode === -1) {
      await db.collection('system_settings').add({
        data: {
          _id: 'global',
          service_qrcode: fileID,
          service_qrcode_path: cloudPath,
          complaint_qrcode: fileID,
          createdAt: now,
          updatedAt: now
        }
      })
    } else {
      throw error
    }
  }

  return {
    success: true,
    message: '上传成功',
    data: { fileID, cloudPath }
  }
}

/**
 * 检查是否为管理员
 */
async function checkAdmin(openid) {
  const adminRes = await db.collection('system_admin')
    .where({ openid })
    .get()

  if (adminRes.data.length > 0) {
    return true
  }

  const userRes = await db.collection('users')
    .where({
      _openid: openid,
      role: 'admin'
    })
    .get()

  return userRes.data.length > 0
}

