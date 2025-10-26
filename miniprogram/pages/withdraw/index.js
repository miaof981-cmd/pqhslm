Page({
  data: {
    balance: 0,
    withdrawAmount: '',
    isVerified: false, // 是否已实名认证
    realName: '',
    idCard: '',
    bankName: '',
    bankCard: '',
    bankBranch: '',
    withdrawRecords: []
  },

  onLoad() {
    this.loadBalance()
    this.loadWithdrawRecords()
    this.loadUserInfo()
  },

  // 加载余额
  loadBalance() {
    const rewardRecords = wx.getStorageSync('reward_records') || []
    const withdrawRecords = wx.getStorageSync('withdraw_records') || []
    
    const totalReward = rewardRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
    const totalWithdrawn = withdrawRecords
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + (r.amount || 0), 0)
    
    this.setData({
      balance: (totalReward - totalWithdrawn).toFixed(2)
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

  // 加载提现记录
  loadWithdrawRecords() {
    const records = wx.getStorageSync('withdraw_records') || []
    
    // 生成模拟数据（首次）
    if (records.length === 0) {
      const mockRecords = [
        {
          id: Date.now() - 86400000,
          amount: 200,
          status: 'success',
          statusText: '已到账',
          time: '2025-10-20 14:30'
        },
        {
          id: Date.now() - 172800000,
          amount: 150,
          status: 'success',
          statusText: '已到账',
          time: '2025-10-18 09:15'
        }
      ]
      wx.setStorageSync('withdraw_records', mockRecords)
      this.setData({ withdrawRecords: mockRecords })
    } else {
      this.setData({ withdrawRecords: records })
    }
  },

  // 金额输入
  onAmountInput(e) {
    this.setData({
      withdrawAmount: e.detail.value
    })
  },

  // 快速选择金额
  selectQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount
    this.setData({
      withdrawAmount: amount.toString()
    })
  },

  // 全部提现
  withdrawAll() {
    this.setData({
      withdrawAmount: this.data.balance
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

  // 提交提现
  submitWithdraw() {
    const { withdrawAmount, balance, isVerified, realName, idCard, bankName, bankCard } = this.data
    
    // 验证金额
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

    // 验证实名信息
    if (!isVerified) {
      if (!realName || !idCard) {
        wx.showToast({
          title: '请完善实名信息',
          icon: 'none'
        })
        return
      }

      // 简单验证身份证格式
      if (idCard.length !== 18) {
        wx.showToast({
          title: '身份证号格式错误',
          icon: 'none'
        })
        return
      }
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

    // 保存实名信息
    if (!this.data.isVerified) {
      wx.setStorageSync('user_verify_info', {
        isVerified: true,
        realName: this.data.realName,
        idCard: this.data.idCard,
        bankName: this.data.bankName,
        bankCard: this.data.bankCard,
        bankBranch: this.data.bankBranch
      })
    }

    // 模拟提现
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

      // 刷新数据
      this.setData({
        withdrawAmount: '',
        isVerified: true,
        withdrawRecords: records
      })
      
      this.loadBalance()
    }, 1000)
  }
})
