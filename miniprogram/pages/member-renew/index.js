Page({
  data: {
    memberInfo: null,
    selectedPlan: 1,
    plans: [
      { months: 1, price: 99, discount: 0, label: '月付', avgPrice: 99 },
      { months: 3, price: 269, discount: 10, label: '季付', avgPrice: 90 },
      { months: 6, price: 499, discount: 15, label: '半年付', avgPrice: 83 },
      { months: 12, price: 899, discount: 25, label: '年付', avgPrice: 75 }
    ],
    formData: {
      amount: '',
      remark: ''
    }
  },

  onLoad() {
    this.loadMemberInfo()
  },

  // 加载会员信息
  async loadMemberInfo() {
    // 模拟加载会员信息
    this.setData({
      memberInfo: {
        isValid: false,
        endDate: '2024-01-01',
        daysLeft: 0
      }
    })
  },

  // 选择套餐
  selectPlan(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      selectedPlan: index
    })
  },

  // 输入金额
  onAmountInput(e) {
    this.setData({
      'formData.amount': e.detail.value
    })
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({
      'formData.remark': e.detail.value
    })
  },

  // 提交续费
  async submitRenew() {
    const { amount, remark } = this.data.formData
    const plan = this.data.plans[this.data.selectedPlan]

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({
        title: '请输入正确的金额',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '处理中...' })

      // 模拟提交
      setTimeout(() => {
        wx.hideLoading()
        wx.showModal({
          title: '续费成功',
          content: `已续费${plan.months}个月，会员有效期至${this.calculateEndDate(plan.months)}`,
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }, 1000)

    } catch (error) {
      wx.hideLoading()
      console.error('续费失败', error)
      wx.showToast({
        title: '续费失败',
        icon: 'none'
      })
    }
  },

  // 计算到期日期
  calculateEndDate(months) {
    const now = new Date()
    const endDate = new Date(now.setMonth(now.getMonth() + months))
    return endDate.toLocaleDateString('zh-CN')
  }
})
