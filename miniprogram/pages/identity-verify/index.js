// 实名认证页面
Page({
  data: {
    // 表单数据
    realName: '',
    idCard: '',
    bankCard: '',
    bankName: '',
    bankBranch: '',
    phoneNumber: '',
    smsCode: '',
    
    // 银行列表
    bankList: [
      '中国工商银行',
      '中国建设银行',
      '中国农业银行',
      '中国银行',
      '交通银行',
      '招商银行',
      '中信银行',
      '光大银行',
      '华夏银行',
      '民生银行',
      '广发银行',
      '平安银行',
      '浦发银行',
      '兴业银行',
      '邮储银行'
    ],
    bankIndex: 0,
    
    // 状态
    loading: false,
    smsSending: false,
    smsCountdown: 0,
    
    // 已认证信息（回显）
    verifyInfo: null,
    isVerified: false
  },

  onLoad() {
    this.loadVerifyInfo()
  },

  // 加载认证信息
  loadVerifyInfo() {
    const userId = wx.getStorageSync('userId')
    const userKey = String(userId)
    const allVerifies = wx.getStorageSync('identity_verify_records') || []
    const myVerify = allVerifies.find(v => String(v.userId) === userKey)
    
    if (myVerify && myVerify.status === 'verified') {
      // 已认证，回显信息
      this.setData({
        isVerified: true,
        verifyInfo: myVerify,
        realName: myVerify.realName,
        idCard: this.maskIdCard(myVerify.idCard),
        bankCard: this.maskBankCard(myVerify.bankCard),
        bankName: myVerify.bankName,
        bankBranch: myVerify.bankBranch,
        phoneNumber: this.maskPhone(myVerify.phoneNumber)
      })
    }
  },

  // 输入处理
  onRealNameInput(e) {
    this.setData({ realName: e.detail.value })
  },

  onIdCardInput(e) {
    this.setData({ idCard: e.detail.value.toUpperCase() })
  },

  onBankCardInput(e) {
    this.setData({ bankCard: e.detail.value.replace(/\s/g, '') })
  },

  onBankBranchInput(e) {
    this.setData({ bankBranch: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phoneNumber: e.detail.value })
  },

  onSmsCodeInput(e) {
    this.setData({ smsCode: e.detail.value })
  },

  // 银行选择
  onBankChange(e) {
    this.setData({
      bankIndex: e.detail.value,
      bankName: this.data.bankList[e.detail.value]
    })
  },

  // 发送验证码
  sendSmsCode() {
    if (this.data.smsSending || this.data.smsCountdown > 0) return
    
    const { phoneNumber } = this.data
    if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ smsSending: true })
    
    // 🎯 模拟发送验证码
    setTimeout(() => {
      wx.showToast({ title: '验证码已发送', icon: 'success' })
      
      // 开始倒计时
      this.setData({
        smsSending: false,
        smsCountdown: 60
      })
      
      const timer = setInterval(() => {
        const countdown = this.data.smsCountdown - 1
        this.setData({ smsCountdown: countdown })
        
        if (countdown <= 0) {
          clearInterval(timer)
        }
      }, 1000)
      
      // 🎯 开发环境提示验证码
      console.log('📱 验证码（测试）：123456')
    }, 1000)
  },

  // 提交认证
  submitVerify() {
    if (this.data.isVerified) {
      wx.showToast({ title: '您已完成实名认证', icon: 'none' })
      return
    }

    const { realName, idCard, bankCard, bankName, bankBranch, phoneNumber, smsCode } = this.data

    // 表单验证
    if (!realName || realName.length < 2) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' })
      return
    }

    if (!this.validateIdCard(idCard)) {
      wx.showToast({ title: '请输入正确的身份证号', icon: 'none' })
      return
    }

    if (!this.validateBankCard(bankCard)) {
      wx.showToast({ title: '请输入正确的银行卡号', icon: 'none' })
      return
    }

    if (!bankName) {
      wx.showToast({ title: '请选择开户银行', icon: 'none' })
      return
    }

    if (!bankBranch || bankBranch.length < 2) {
      wx.showToast({ title: '请输入支行名称', icon: 'none' })
      return
    }

    if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    if (!smsCode) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    // 🎯 模拟验证码校验
    if (smsCode !== '123456') {
      wx.showToast({ title: '验证码错误', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    // 🎯 模拟提交认证
    setTimeout(() => {
      const userId = wx.getStorageSync('userId')
      const userKey = String(userId)
      
      const verifyRecord = {
        id: Date.now(),
        userId: userKey,
        status: 'verified', // 🎯 直接通过（模拟）
        realName,
        idCard,
        bankCard,
        bankName,
        bankBranch,
        phoneNumber,
        submitTime: new Date().toLocaleString('zh-CN'),
        verifyTime: new Date().toLocaleString('zh-CN'),
        rejectReason: ''
      }

      const allVerifies = wx.getStorageSync('identity_verify_records') || []
      // 删除旧记录
      const filteredVerifies = allVerifies.filter(v => String(v.userId) !== userKey)
      filteredVerifies.push(verifyRecord)
      wx.setStorageSync('identity_verify_records', filteredVerifies)

      this.setData({ loading: false })

      wx.showToast({
        title: '认证成功',
        icon: 'success',
        duration: 2000
      })

      console.log('✅ 实名认证成功:', verifyRecord)

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)
    }, 1500)
  },

  // 身份证校验
  validateIdCard(idCard) {
    if (!idCard) return false
    const pattern = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
    return pattern.test(idCard)
  },

  // 银行卡校验
  validateBankCard(cardNo) {
    if (!cardNo) return false
    return /^\d{16,19}$/.test(cardNo)
  },

  // 脱敏处理
  maskIdCard(idCard) {
    if (!idCard || idCard.length < 8) return idCard
    return idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 4)
  },

  maskBankCard(cardNo) {
    if (!cardNo || cardNo.length < 8) return cardNo
    return cardNo.substring(0, 4) + '********' + cardNo.substring(cardNo.length - 4)
  },

  maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone
    return phone.substring(0, 3) + '****' + phone.substring(7)
  }
})

