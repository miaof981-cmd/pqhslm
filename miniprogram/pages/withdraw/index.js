Page({
  data: {
    balance: 0,
    withdrawAmount: '',
    withdrawMethod: 'wechat',
    quickAmounts: [100, 200, 500, 1000],
    withdrawRecords: []
  },

  onLoad() {
    this.loadBalance()
    this.loadWithdrawRecords()
  },

  // 加载余额
  loadBalance() {
    // 从本地存储加载
    const rewardRecords = wx.getStorageSync('reward_records') || []
    const withdrawRecords = wx.getStorageSync('withdraw_records') || []
    
    // 计算总收入
    const totalIncome = rewardRecords.reduce((sum, r) => sum + parseFloat(r.amount), 0)
    
    // 计算已提现金额
    const totalWithdraw = withdrawRecords
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0)
    
    // 可用余额 = 总收入 - 已提现
    const balance = (totalIncome - totalWithdraw).toFixed(2)
    
    this.setData({
      balance: balance > 0 ? balance : '0.00'
    })
  },

  // 加载提现记录
  loadWithdrawRecords() {
    const records = wx.getStorageSync('withdraw_records') || []
    
    if (records.length === 0) {
      // 生成模拟数据
      const mockRecords = [
        {
          id: 1,
          amount: 100,
          method: 'wechat',
          status: 'success',
          statusText: '已到账',
          time: '2025-10-20 10:30'
        },
        {
          id: 2,
          amount: 50,
          method: 'alipay',
          status: 'pending',
          statusText: '处理中',
          time: '2025-10-25 14:20'
        }
      ]
      this.setData({
        withdrawRecords: mockRecords
      })
    } else {
      this.setData({
        withdrawRecords: records.reverse()
      })
    }
  },

  // 输入提现金额
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

  // 选择提现方式
  selectMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({
      withdrawMethod: method
    })
  },

  // 提交提现申请
  submitWithdraw() {
    const { withdrawAmount, balance, withdrawMethod } = this.data
    
    // 验证
    if (!withdrawAmount) {
      wx.showToast({
        title: '请输入提现金额',
        icon: 'none'
      })
      return
    }
    
    const amount = parseFloat(withdrawAmount)
    
    if (amount < 10) {
      wx.showToast({
        title: '最低提现金额为10元',
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
    
    if (amount > 5000) {
      wx.showToast({
        title: '单笔最高提现5000元',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认提现',
      content: `确认提现 ¥${amount} 到${withdrawMethod === 'wechat' ? '微信零钱' : '支付宝'}？`,
      success: (res) => {
        if (res.confirm) {
          this.processWithdraw(amount, withdrawMethod)
        }
      }
    })
  },

  // 处理提现
  processWithdraw(amount, method) {
    wx.showLoading({ title: '处理中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      
      // 保存提现记录
      const records = wx.getStorageSync('withdraw_records') || []
      const newRecord = {
        id: Date.now(),
        amount: amount,
        method: method,
        status: 'pending',
        statusText: '处理中',
        time: new Date().toLocaleString()
      }
      records.push(newRecord)
      wx.setStorageSync('withdraw_records', records)
      
      wx.showToast({
        title: '提现申请已提交',
        icon: 'success'
      })
      
      // 刷新数据
      this.setData({
        withdrawAmount: ''
      })
      this.loadBalance()
      this.loadWithdrawRecords()
    }, 1000)
  },

  // 查看全部记录
  viewAllRecords() {
    wx.showToast({
      title: '提现记录详情页开发中',
      icon: 'none'
    })
  }
})

