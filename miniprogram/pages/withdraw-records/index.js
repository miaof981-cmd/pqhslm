Page({
  data: {
    records: [],
    totalWithdrawn: '0.00',
    recordCount: 0
  },

  onLoad() {
    this.loadRecords()
  },

  onShow() {
    this.loadRecords()
  },

  loadRecords() {
    const userId = wx.getStorageSync('userId')
    const userKey = userId != null ? String(userId) : ''
    const allRecords = wx.getStorageSync('withdraw_records') || []
    const records = allRecords.filter(record => {
      if (!userKey) return true
      if (record.userId == null) return true
      return String(record.userId) === userKey
    })
    
    // 计算累计提现（只计算成功的）
    const totalWithdrawn = records
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    this.setData({
      records: records,
      totalWithdrawn: totalWithdrawn.toFixed(2),
      recordCount: records.length
    })
  }
})
