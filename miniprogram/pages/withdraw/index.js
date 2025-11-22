const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')
const withdrawApi = require('../../utils/withdraw-api.js')  // 🎯 提现API对接

Page({
  data: {
    balance: 0,
    showWithdrawModal: false,
    showVerifyModal: false,
    showWithdrawRecordsModal: false,
    withdrawRecords: [],
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
      artist: '0.00',
      service: '0.00',
      staff: '0.00',
      total: '0.00'
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
  async loadBalance() {
    const userId = app.globalData.userId
    const userKey = userId != null ? String(userId) : ''
    
    try {
      // ✅ 从云端获取数据
      const [ordersRes, rewardsRes, withdrawsRes] = await Promise.all([
        cloudAPI.getOrderList({ userId }),
        cloudAPI.getRewardList({ userId }),
        cloudAPI.getWithdrawList({ userId })
      ])

      // 🛡️ 安全数组解析
      const allOrders = cloudAPI.safeArray(ordersRes)
      const rewardRecords = cloudAPI.safeArray(rewardsRes)
      const withdrawRecords = cloudAPI.safeArray(withdrawsRes)

      // 🎯 计算画师订单稿费（已完成订单的：订单金额 - 平台扣除，按数量计算）
      const PLATFORM_DEDUCTION_PER_ITEM = 5.00
      const myCompletedOrders = allOrders.filter(o => 
        o.status === 'completed' && String(o.artistId || o.artist_id) === userKey
      )
      const orderIncome = myCompletedOrders.reduce((sum, order) => {
        const orderAmount = parseFloat(order.totalPrice || order.total_price || order.price) || 0
        const quantity = parseInt(order.quantity) || 1
        const totalDeduction = PLATFORM_DEDUCTION_PER_ITEM * quantity
        const artistShare = Math.max(0, orderAmount - totalDeduction)
        return sum + artistShare
      }, 0)

      // 🎯 计算画师打赏收入
      const myRewards = rewardRecords.filter(record => {
        if (record.artistId || record.artist_id) {
          return String(record.artistId || record.artist_id) === userKey
        }
        const order = allOrders.find(o => String(o._id || o.id) === String(record.orderId || record.order_id))
        if (!order) return false
        return String(order.artistId || order.artist_id) === userKey
      })
      const rewardIncome = myRewards.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      // 🎯 画师总收入 = 订单稿费 + 打赏
      const artistIncome = orderIncome + rewardIncome

      // 🎯 客服收入（TODO: 需要云端计算）
      const serviceIncomeAmount = 0

      // 🎯 管理员分成（TODO: 需要云端计算）
      const staffIncomeAmount = 0

      // 🎯 总收入
      const totalIncome = artistIncome + serviceIncomeAmount + staffIncomeAmount

      // ✅ 只计算当前用户的提现记录
      const myWithdraws = withdrawRecords.filter(r => 
        String(r.userId || r.user_id) === userKey && (r.status === 'success' || r.status === 'completed')
      )
      const totalWithdrawn = myWithdraws.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      const balance = totalIncome - totalWithdrawn

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💰 余额计算 (withdraw - 云端版)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('👤 用户ID:', userKey)
      console.log('📦 订单总数:', allOrders.length)
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
          order: orderIncome.toFixed(2),
          reward: rewardIncome.toFixed(2),
          artist: artistIncome.toFixed(2),
          service: serviceIncomeAmount.toFixed(2),
          staff: staffIncomeAmount.toFixed(2),
          total: totalIncome.toFixed(2)
        }
      })
    } catch (err) {
      console.error('❌ 加载余额失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    const userId = app.globalData.userId
    const userKey = String(userId)

    try {
      // ✅ 从云端获取实名认证记录
      const res = await cloudAPI.getIdentityVerifyRecords(userKey)
      
      if (res.success && res.data && res.data.length > 0) {
        // 找到已认证的记录
        const verifiedRecord = res.data.find(v => v.status === 'verified')
        if (verifiedRecord) {
          this.setData({
            isVerified: true,
            realName: verifiedRecord.realName || verifiedRecord.real_name || '',
            idCard: verifiedRecord.idCard || verifiedRecord.id_card || '',
            phoneNumber: verifiedRecord.phoneNumber || verifiedRecord.phone_number || '',
            bankName: verifiedRecord.bankName || verifiedRecord.bank_name || '',
            bankCard: verifiedRecord.bankCard || verifiedRecord.bank_card || '',
            bankBranch: verifiedRecord.bankBranch || verifiedRecord.bank_branch || ''
          })
        } else {
          this.setData({ isVerified: false })
        }
      } else {
        this.setData({ isVerified: false })
      }
    } catch (err) {
      console.error('❌ 加载用户信息失败:', err)
      this.setData({ isVerified: false })
    }
  },

  // 开始提现
  async startWithdraw() {
    const userId = app.globalData.userId
    const userKey = String(userId)

    try {
      // ✅ 检查实名认证状态（从云端）
      const res = await cloudAPI.getIdentityVerifyRecords(userKey)
      const myVerify = res.success && res.data ? res.data.find(v => String(v.userId || v.user_id) === userKey) : null

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
    } catch (err) {
      console.error('❌ 检查认证状态失败:', err)
      wx.showToast({
        title: '检查认证失败',
        icon: 'none'
      })
    }
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
  async submitVerify() {
    const { realName, idCard, phoneNumber, verifyCode, bankName, bankCard, bankBranch } = this.data
    
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

    const userId = app.globalData.userId

    try {
      // ✅ 提交到云端
      const res = await cloudAPI.submitIdentityVerify({
        userId: String(userId),
        realName: this.data.realName,
        idCard: this.data.idCard,
        phoneNumber: this.data.phoneNumber,
        bankName: this.data.bankName,
        bankCard: this.data.bankCard,
        bankBranch: this.data.bankBranch || ''
      })

      if (res.success) {
        wx.showToast({
          title: '认证成功',
          icon: 'success'
        })

        // 关闭认证弹窗，打开提现弹窗
        this.setData({
          isVerified: true,
          showVerifyModal: false,
          showWithdrawModal: true,
          verifyCode: '',
          countdown: 0
        })
      } else {
        wx.showToast({
          title: res.error || '认证失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('❌ 提交认证失败:', err)
      wx.showToast({
        title: '认证失败',
        icon: 'none'
      })
    }
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
  async processWithdraw(amount) {
    const userId = app.globalData.userId
    const userKey = String(userId)
    const roles = app.getUserRoles ? app.getUserRoles() : ['customer']
    const incomeSummary = this.data.incomeSummary || { artist: '0.00', staff: '0.00' }

    try {
      // ✅ 从云端获取实名认证信息
      const verifyRes = await cloudAPI.getIdentityVerifyRecords(userKey)
      const myVerify = verifyRes.success && verifyRes.data ? verifyRes.data.find(v => String(v.userId || v.user_id) === userKey) : null
      
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

      // ✅ 调用云端提现API
      const withdrawRes = await cloudAPI.createWithdraw(amount, {
        userId: userKey,
        realName: myVerify.realName || myVerify.real_name,
        bankCard: myVerify.bankCard || myVerify.bank_card,
        bankName: myVerify.bankName || myVerify.bank_name,
        source,
        roles: Array.isArray(roles) ? roles : [roles || 'customer'],
        incomeBreakdown: {
          artist: artistAmount,
          service: serviceAmount,
          staff: staffAmount
        }
      })

      wx.hideLoading()

      if (withdrawRes.success) {
        wx.showToast({
          title: '提现申请已提交',
          icon: 'success'
        })

        console.log('✅ 提现申请成功:', withdrawRes)

        // 关闭弹窗并刷新
        this.setData({
          showWithdrawModal: false,
          withdrawAmount: ''
        })
        
        this.loadBalance()
      } else {
        wx.showToast({
          title: withdrawRes.error || '提现申请失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('❌ 提现申请失败:', err)
      wx.showToast({
        title: err.message || '提现申请失败',
        icon: 'none'
      })
    }
  },

  // 查看资金明细
  viewIncomeDetail() {
    wx.navigateTo({
      url: '/pages/income-detail/index'
    })
  },

  // 🎯 显示提现记录弹窗
  async showWithdrawRecordsModal() {
    const userId = app.globalData.userId
    const userKey = String(userId)

    try {
      // ✅ 从云端获取提现记录
      const res = await cloudAPI.getWithdrawList({ userId: userKey })
      // 🛡️ 安全数组解析
      const myRecords = cloudAPI.safeArray(res)

      const parseRecordTime = (record) => {
        const raw = record.completedTime || record.completed_time || record.time || record.updatedAt || record.updated_at || record.createdAt || record.created_at || ''
        if (!raw) return 0
        const normalized = String(raw)
          .replace(/年|\.|\/|月/g, '-')
          .replace(/日|号/g, '')
          .replace(/T/g, ' ')
          .replace(/--+/g, '-')
        const ms = new Date(normalized).getTime()
        return Number.isNaN(ms) ? 0 : ms
      }
      
      // 按时间倒序
      myRecords.sort((a, b) => parseRecordTime(b) - parseRecordTime(a))
      
      this.setData({
        withdrawRecords: myRecords,
        showWithdrawRecordsModal: true
      })
    } catch (err) {
      console.error('❌ 加载提现记录失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 关闭提现记录弹窗
  closeWithdrawRecordsModal() {
    this.setData({
      showWithdrawRecordsModal: false
    })
  }
})
