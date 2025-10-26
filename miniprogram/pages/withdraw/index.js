Page({
  data: {
    balance: 0,
    showWithdrawModal: false,
    showVerifyModal: false,
    withdrawAmount: '',
    isVerified: false,
    realName: '',
    idCard: '',
    bankName: '',
    bankCard: '',
    bankBranch: ''
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
    const rewardRecords = wx.getStorageSync('reward_records') || []
    const withdrawRecords = wx.getStorageSync('withdraw_records') || []
    
    const totalReward = rewardRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    const totalWithdrawn = withdrawRecords
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const balance = totalReward - totalWithdrawn
    
    this.setData({
      balance: Math.max(0, balance).toFixed(2)
    })
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('user_verify_info') || {}
    this.setData({
      isVerified: !!userInfo.isVerified,
      realName: userInfo.realName || '',
      idCard: userInfo.idCard || '',
      bankName: userInfo.bankName || '',
      bankCard: userInfo.bankCard || '',
      bankBranch: userInfo.bankBranch || ''
    })
  },

  // 开始提现
  startWithdraw() {
    const { balance, isVerified } = this.data
    
    if (parseFloat(balance) <= 0) {
      wx.showToast({
        title: '暂无可提现余额',
        icon: 'none'
      })
      return
    }

    // 如果未认证，先弹出认证弹窗
    if (!isVerified) {
      this.setData({
        showVerifyModal: true
      })
    } else {
      // 已认证，直接弹出提现弹窗
      this.setData({
        showWithdrawModal: true
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
    const { realName, idCard, bankName, bankCard } = this.data
    
    // 验证实名信息
    if (!realName || !idCard) {
      wx.showToast({
        title: '请完善实名信息',
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

    // 验证银行卡信息
    if (!bankName || !bankCard) {
      wx.showToast({
        title: '请完善银行卡信息',
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
      showWithdrawModal: true
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
    wx.showLoading({ title: '提交中...' })

    setTimeout(() => {
      wx.hideLoading()

      // 添加提现记录
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
        }).replace(/\//g, '-')
      }

      const records = wx.getStorageSync('withdraw_records') || []
      records.unshift(newRecord)
      wx.setStorageSync('withdraw_records', records)

      wx.showToast({
        title: '提现申请已提交',
        icon: 'success'
      })

      // 关闭弹窗并刷新
      this.setData({
        showWithdrawModal: false,
        withdrawAmount: ''
      })
      
      this.loadBalance()
    }, 1000)
  },

  // 查看资金明细
  viewIncomeDetail() {
    wx.navigateTo({
      url: '/pages/reward-records/index'
    })
  },

  // 查看提现记录
  viewWithdrawRecords() {
    wx.navigateTo({
      url: '/pages/withdraw-records/index'
    })
  }
})
