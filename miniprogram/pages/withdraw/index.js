const staffFinance = require('../../utils/staff-finance.js')
const serviceIncome = require('../../utils/service-income.js')  // 🎯 新增：客服收入管理
const withdrawApi = require('../../utils/withdraw-api.js')  // 🎯 提现API对接

Page({
  data: {
    balance: 0,
    showWithdrawModal: false,
    showVerifyModal: false,
    showWithdrawRecordsModal: false, // 🎯 提现记录弹窗
    withdrawRecords: [],             // 🎯 提现记录
    withdrawAmount: '',
    isVerified: false,
    realName: '',
    idCard: '',
    phoneNumber: '',
    verifyCode: '',
    bankName: '',
    bankCard: '',
    bankBranch: '',
    countdown: 0,
    codeSending: false,
    incomeSummary: {
      artist: '0.00',     // 画师打赏收入
      service: '0.00',    // 客服分成收入
      staff: '0.00',      // 管理员分成收入
      total: '0.00'       // 总收入
    }
  },

  onLoad() {
    this.loadBalance()
    this.loadUserInfo()
  },

  onShow() {
    this.loadBalance()
  },

  // 加载余额
  loadBalance() {
    const userId = wx.getStorageSync('userId')
    const userKey = userId != null ? String(userId) : ''
    
    const withdrawRecords = wx.getStorageSync('withdraw_records') || []
    
    // 🎯 1. 获取所有订单并去重
    const orders = wx.getStorageSync('orders') || []
    const pendingOrders = wx.getStorageSync('pending_orders') || []
    const completedOrders = wx.getStorageSync('completed_orders') || []
    
    // 使用Map去重
    const orderMap = new Map()
    ;[...orders, ...pendingOrders, ...completedOrders].forEach(order => {
      if (order && order.id) {
        orderMap.set(order.id, order)
      }
    })
    const allOrders = Array.from(orderMap.values())
    
    // 🎯 2. 计算画师订单稿费（已完成订单的：订单金额 - 平台扣除，按数量计算）
    const PLATFORM_DEDUCTION_PER_ITEM = 5.00
    const myCompletedOrders = allOrders.filter(o => 
      o.status === 'completed' && String(o.artistId) === userKey
    )
    const orderIncome = myCompletedOrders.reduce((sum, order) => {
      const orderAmount = parseFloat(order.totalPrice) || parseFloat(order.price) || 0
      const quantity = parseInt(order.quantity) || 1
      const totalDeduction = PLATFORM_DEDUCTION_PER_ITEM * quantity
      const artistShare = Math.max(0, orderAmount - totalDeduction)
      return sum + artistShare
    }, 0)
    
    // 🎯 3. 计算画师打赏收入
    const rewardRecords = wx.getStorageSync('reward_records') || []
    const myRewards = rewardRecords.filter(record => {
      if (record.artistId) {
        return String(record.artistId) === userKey
      }
      const order = allOrders.find(o => String(o.id) === String(record.orderId))
      if (!order) return false
      return String(order.artistId) === userKey
    })
    const rewardIncome = myRewards.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    // 🎯 4. 画师总收入 = 订单稿费 + 打赏
    const artistIncome = orderIncome + rewardIncome
    
    // 🎯 5. 客服收入
    const serviceIncomeAmount = serviceIncome.computeIncomeByUserId(userKey, 'service')
    
    // 🎯 6. 管理员分成
    const staffIncomeAmount = serviceIncome.computeIncomeByUserId(userKey, 'admin_share')
    
    // 🎯 7. 总收入
    const totalIncome = artistIncome + serviceIncomeAmount + staffIncomeAmount
    
    // 🎯 只计算当前画师的提现记录
    const myWithdraws = withdrawRecords.filter(r => {
      if (r.userId != null) {
        return String(r.userId) === userKey && r.status === 'success'
      }
      // 兼容旧数据：没有 userId 的记录视为归属当前用户
      return r.status === 'success'
    })
    const totalWithdrawn = myWithdraws.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const balance = totalIncome - totalWithdrawn
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💰 余额计算 (withdraw)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 用户ID:', userKey)
    console.log('📦 订单去重:', orders.length + pendingOrders.length + completedOrders.length, '→', allOrders.length)
    console.log('')
    console.log('🎨 画师角色:')
    console.log('  - 订单稿费:', orderIncome.toFixed(2), '元 (', myCompletedOrders.length, '单)')
    console.log('  - 打赏收入:', rewardIncome.toFixed(2), '元 (', myRewards.length, '次)')
    console.log('  - 小计:', artistIncome.toFixed(2), '元')
    console.log('')
    console.log('👔 客服角色:', serviceIncomeAmount.toFixed(2), '元')
    console.log('💼 管理员角色:', staffIncomeAmount.toFixed(2), '元')
    console.log('')
    console.log('💵 总收入:', totalIncome.toFixed(2), '元')
    console.log('💸 已提现:', totalWithdrawn.toFixed(2), '元')
    console.log('✅ 可提现:', balance.toFixed(2), '元')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    this.setData({
      balance: Math.max(0, balance).toFixed(2),
      incomeSummary: {
        order: orderIncome.toFixed(2),      // 订单稿费
        reward: rewardIncome.toFixed(2),    // 打赏收入
        artist: artistIncome.toFixed(2),    // 画师总收入
        service: serviceIncomeAmount.toFixed(2),  // 客服收入
        staff: staffIncomeAmount.toFixed(2),      // 管理员分成
        total: totalIncome.toFixed(2)
      }
    })
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('user_verify_info') || {}
    this.setData({
      isVerified: !!userInfo.isVerified,
      realName: userInfo.realName || '',
      idCard: userInfo.idCard || '',
      phoneNumber: userInfo.phoneNumber || '',
      bankName: userInfo.bankName || '',
      bankCard: userInfo.bankCard || '',
      bankBranch: userInfo.bankBranch || ''
    })
  },

  // 开始提现
  startWithdraw() {
    // 🎯 检查实名认证状态（使用新的identity_verify_records）
    const userId = wx.getStorageSync('userId')
    const userKey = String(userId)
    const allVerifies = wx.getStorageSync('identity_verify_records') || []
    const myVerify = allVerifies.find(v => String(v.userId) === userKey)
    
    if (!myVerify || myVerify.status !== 'verified') {
      // 未认证，跳转认证页面
      wx.showModal({
        title: '需要实名认证',
        content: '提现前需要完成实名认证，现在去认证？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/identity-verify/index'
            })
          }
        }
      })
      return
    }

    const { balance } = this.data

    // 已认证，检查余额
    if (parseFloat(balance) <= 0) {
      wx.showToast({
        title: '暂无可提现余额',
        icon: 'none'
      })
      return
    }

    // 已认证且有余额，弹出提现弹窗
    this.setData({
      showWithdrawModal: true
    })
  },

  // 关闭提现弹窗
  closeModal() {
    this.setData({
      showWithdrawModal: false,
      withdrawAmount: ''
    })
  },

  // 关闭认证弹窗
  closeVerifyModal() {
    this.setData({
      showVerifyModal: false
    })
  },

  // 阻止冒泡
  stopPropagation() {},

  // 金额输入
  onAmountInput(e) {
    this.setData({
      withdrawAmount: e.detail.value
    })
  },

  // 实名信息输入
  onRealNameInput(e) {
    this.setData({ realName: e.detail.value })
  },

  onIdCardInput(e) {
    this.setData({ idCard: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phoneNumber: e.detail.value })
  },

  onVerifyCodeInput(e) {
    this.setData({ verifyCode: e.detail.value })
  },

  // 发送验证码
  sendVerifyCode() {
    const { phoneNumber } = this.data
    
    if (!phoneNumber) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({
        title: '手机号格式错误',
        icon: 'none'
      })
      return
    }

    this.setData({ codeSending: true })

    // 模拟发送验证码
    setTimeout(() => {
      this.setData({ 
        codeSending: false,
        countdown: 60
      })

      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      })

      // 开始倒计时
      this.startCountdown()
    }, 500)
  },

  // 倒计时
  startCountdown() {
    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1
      if (countdown <= 0) {
        clearInterval(timer)
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown })
      }
    }, 1000)
  },

  // 银行卡信息输入
  onBankNameInput(e) {
    this.setData({ bankName: e.detail.value })
  },

  onBankCardInput(e) {
    this.setData({ bankCard: e.detail.value })
  },

  onBankBranchInput(e) {
    this.setData({ bankBranch: e.detail.value })
  },

  // 提交认证
  submitVerify() {
    const { realName, idCard, phoneNumber, verifyCode, bankName, bankCard } = this.data
    
    // 验证真实姓名
    if (!realName || realName.trim() === '') {
      wx.showToast({
        title: '请输入真实姓名',
        icon: 'none'
      })
      return
    }

    // 验证身份证号
    if (!idCard || idCard.trim() === '') {
      wx.showToast({
        title: '请输入身份证号',
        icon: 'none'
      })
      return
    }

    if (idCard.length !== 18) {
      wx.showToast({
        title: '身份证号格式错误',
        icon: 'none'
      })
      return
    }

    // 验证手机号
    if (!phoneNumber || phoneNumber.trim() === '') {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({
        title: '手机号格式错误',
        icon: 'none'
      })
      return
    }

    // 验证验证码
    if (!verifyCode || verifyCode.trim() === '') {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      })
      return
    }

    if (verifyCode.length !== 6) {
      wx.showToast({
        title: '验证码格式错误',
        icon: 'none'
      })
      return
    }

    // 验证开户银行
    if (!bankName || bankName.trim() === '') {
      wx.showToast({
        title: '请输入开户银行',
        icon: 'none'
      })
      return
    }

    // 验证银行卡号
    if (!bankCard || bankCard.trim() === '') {
      wx.showToast({
        title: '请输入银行卡号',
        icon: 'none'
      })
      return
    }

    if (bankCard.length < 16) {
      wx.showToast({
        title: '银行卡号格式错误',
        icon: 'none'
      })
      return
    }

    // 保存认证信息
    wx.setStorageSync('user_verify_info', {
      isVerified: true,
      realName: this.data.realName,
      idCard: this.data.idCard,
      phoneNumber: this.data.phoneNumber,
      bankName: this.data.bankName,
      bankCard: this.data.bankCard,
      bankBranch: this.data.bankBranch
    })

    wx.showToast({
      title: '认证成功',
      icon: 'success'
    })

    // 关闭认证弹窗，打开提现弹窗
    this.setData({
      isVerified: true,
      showVerifyModal: false,
      showWithdrawModal: true,
      verifyCode: '', // 清空验证码
      countdown: 0 // 重置倒计时
    })
  },

  // 提交提现
  submitWithdraw() {
    const { withdrawAmount, balance } = this.data
    
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      wx.showToast({
        title: '请输入提现金额',
        icon: 'none'
      })
      return
    }

    const amount = parseFloat(withdrawAmount)
    
    if (amount < 10) {
      wx.showToast({
        title: '最低提现10元',
        icon: 'none'
      })
      return
    }

    if (amount > 5000) {
      wx.showToast({
        title: '单笔最高提现5000元',
        icon: 'none'
      })
      return
    }

    if (amount > parseFloat(balance)) {
      wx.showToast({
        title: '余额不足',
        icon: 'none'
      })
      return
    }

    const { bankName, bankCard } = this.data
    
    wx.showModal({
      title: '确认提现',
      content: `提现金额：¥${amount}\n到账银行卡：${bankName}(${bankCard.slice(-4)})`,
      success: (res) => {
        if (res.confirm) {
          this.processWithdraw(amount)
        }
      }
    })
  },

  // 处理提现
  processWithdraw(amount) {
    const userId = wx.getStorageSync('userId')
    const userKey = userId != null ? String(userId) : ''
    const roles = wx.getStorageSync('userRoles') || []
    const incomeSummary = this.data.incomeSummary || { artist: '0.00', staff: '0.00' }

    // 获取实名认证信息
    const allVerifies = wx.getStorageSync('identity_verify_records') || []
    const myVerify = allVerifies.find(v => String(v.userId) === userKey)
    
    if (!myVerify || myVerify.status !== 'verified') {
      wx.showToast({ title: '请先完成实名认证', icon: 'none' })
      return
    }

    let source = 'artist'
    const artistAmount = parseFloat(incomeSummary.artist) || 0
    const staffAmount = parseFloat(incomeSummary.staff) || 0
    const serviceAmount = parseFloat(incomeSummary.service) || 0
    if ((staffAmount + serviceAmount) > 0 && artistAmount > 0) {
      source = 'mixed'
    } else if ((staffAmount + serviceAmount) > 0) {
      source = 'staff'
    }

    wx.showLoading({ title: '提交中...' })

    // 🎯 调用提现API
    withdrawApi.submitWithdrawRequest({
      userId: userKey,
      amount: amount,
      verifyId: myVerify.id,
      realName: myVerify.realName,
      bankCard: myVerify.bankCard
    }).then(apiRes => {
      wx.hideLoading()

      // 🎯 添加提现记录（增加银行卡等字段）
      const newRecord = {
        id: Date.now(),
        amount: amount,
        status: 'pending',
        statusText: '处理中',
        time: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/\//g, '-'),
        userId: userKey,
        roles: Array.isArray(roles) ? roles : [roles || 'customer'],
        source,
        incomeBreakdown: {
          artist: artistAmount,
          service: serviceAmount,
          staff: staffAmount
        },
        // 🎯 新增字段
        realName: myVerify.realName,
        bankCard: myVerify.bankCard.substring(myVerify.bankCard.length - 4), // 只保存尾号
        bankName: myVerify.bankName,
        apiOrderId: apiRes.orderId,
        apiStatus: 'pending',
        apiMessage: apiRes.message || '',
        completedTime: ''
      }

      const records = wx.getStorageSync('withdraw_records') || []
      records.unshift(newRecord)
      wx.setStorageSync('withdraw_records', records)

      wx.showToast({
        title: '提现申请已提交',
        icon: 'success'
      })

      console.log('✅ 提现申请成功:', newRecord)
      console.log('🎯 API订单号:', apiRes.orderId)

      // 🎯 模拟自动提现成功（3秒后）
      if (withdrawApi.IS_DEV) {
        withdrawApi.mockAutoWithdrawSuccess(newRecord.id, (updatedRecord) => {
          console.log('🎉 提现自动成功:', updatedRecord)
          wx.showToast({
            title: '提现成功',
            icon: 'success'
          })
          // 刷新余额
          this.loadBalance()
        })
      }

      // 关闭弹窗并刷新
      this.setData({
        showWithdrawModal: false,
        withdrawAmount: ''
      })
      
      this.loadBalance()
    }).catch(err => {
      wx.hideLoading()
      console.error('❌ 提现申请失败:', err)
      wx.showToast({
        title: err.message || '提现申请失败',
        icon: 'none'
      })
    })
  },

  // 查看资金明细
  viewIncomeDetail() {
    wx.navigateTo({
      url: '/pages/income-detail/index'
    })
  },

  // 🎯 显示提现记录弹窗
  showWithdrawRecordsModal() {
    const userId = wx.getStorageSync('userId')
    const userKey = String(userId)
    const allRecords = wx.getStorageSync('withdraw_records') || []
    const myRecords = allRecords.filter(r => String(r.userId) === userKey)
    
    // 按时间倒序
    myRecords.sort((a, b) => {
      const timeA = new Date(b.completedTime || b.time).getTime()
      const timeB = new Date(a.completedTime || a.time).getTime()
      return timeA - timeB
    })
    
    this.setData({
      withdrawRecords: myRecords,
      showWithdrawRecordsModal: true
    })
  },

  // 关闭提现记录弹窗
  closeWithdrawRecordsModal() {
    this.setData({
      showWithdrawRecordsModal: false
    })
  }
})
