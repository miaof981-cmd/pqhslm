/**
 * 提现API对接层
 * 用于对接后端分账公司接口
 */

// 🎯 开发环境开关
const IS_DEV = true

/**
 * 提交实名认证
 * @param {Object} data 认证信息
 * @returns {Promise}
 */
function submitIdentityVerify(data) {
  console.log('📤 提交实名认证:', data)
  
  if (IS_DEV) {
    // 🎯 开发环境：模拟成功
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          verifyId: `VER${Date.now()}`,
          message: '认证成功'
        })
      }, 1500)
    })
  } else {
    // 🎯 生产环境：对接后端接口
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://your-backend.com/api/identity/verify',
        method: 'POST',
        data: {
          userId: data.userId,
          realName: data.realName,
          idCard: data.idCard,
          bankCard: data.bankCard,
          bankName: data.bankName,
          bankBranch: data.bankBranch,
          phoneNumber: data.phoneNumber
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data)
          } else {
            reject(new Error(res.data.message || '认证失败'))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }
}

/**
 * 提交提现申请
 * @param {Object} data 提现信息
 * @returns {Promise}
 */
function submitWithdrawRequest(data) {
  console.log('📤 提交提现申请:', data)
  
  if (IS_DEV) {
    // 🎯 开发环境：模拟成功
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          orderId: `WD${Date.now()}`,
          message: '提现申请已提交',
          estimatedTime: '2-24小时'
        })
      }, 1500)
    })
  } else {
    // 🎯 生产环境：对接后端分账接口
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://your-backend.com/api/withdraw/submit',
        method: 'POST',
        data: {
          userId: data.userId,
          amount: data.amount,
          verifyId: data.verifyId,
          realName: data.realName,
          bankCard: data.bankCard
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data)
          } else {
            reject(new Error(res.data.message || '提现申请失败'))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }
}

/**
 * 查询提现状态
 * @param {String} orderId 提现订单号
 * @returns {Promise}
 */
function queryWithdrawStatus(orderId) {
  console.log('🔍 查询提现状态:', orderId)
  
  if (IS_DEV) {
    // 🎯 开发环境：模拟查询结果
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          orderId: orderId,
          status: 'success', // success/processing/failed
          message: '提现成功',
          completedTime: new Date().toLocaleString('zh-CN')
        })
      }, 500)
    })
  } else {
    // 🎯 生产环境：对接后端查询接口
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://your-backend.com/api/withdraw/status',
        method: 'GET',
        data: { orderId },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data)
          } else {
            reject(new Error(res.data.message || '查询失败'))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }
}

/**
 * 模拟提现自动成功（开发环境用）
 * @param {String} recordId 提现记录ID
 * @param {Function} callback 成功回调
 */
function mockAutoWithdrawSuccess(recordId, callback) {
  if (!IS_DEV) {
    console.warn('⚠️ 非开发环境，不执行自动成功逻辑')
    return
  }

  console.log('🎯 模拟提现自动成功（3秒后）:', recordId)
  
  setTimeout(() => {
    const records = wx.getStorageSync('withdraw_records') || []
    const record = records.find(r => r.id === recordId)
    
    if (record && record.status === 'pending') {
      record.status = 'success'
      record.statusText = '提现成功'
      record.completedTime = new Date().toLocaleString('zh-CN')
      record.apiStatus = 'success'
      record.apiMessage = '提现成功（模拟）'
      
      wx.setStorageSync('withdraw_records', records)
      
      console.log('✅ 提现自动成功:', record)
      
      if (callback) callback(record)
    }
  }, 3000)
}

/**
 * 处理提现回调（Webhook）
 * 生产环境由后端调用前端接口更新状态
 * @param {Object} data 回调数据
 */
function handleWithdrawCallback(data) {
  console.log('📥 收到提现回调:', data)
  
  const records = wx.getStorageSync('withdraw_records') || []
  const record = records.find(r => r.apiOrderId === data.orderId)
  
  if (record) {
    record.status = data.status === 'success' ? 'success' : 'failed'
    record.statusText = data.status === 'success' ? '提现成功' : '提现失败'
    record.completedTime = data.completedTime
    record.apiStatus = data.status
    record.apiMessage = data.message
    
    wx.setStorageSync('withdraw_records', records)
    
    console.log('✅ 提现状态已更新:', record)
  }
}

module.exports = {
  IS_DEV,
  submitIdentityVerify,
  submitWithdrawRequest,
  queryWithdrawStatus,
  mockAutoWithdrawSuccess,
  handleWithdrawCallback
}

