Page({
  data: {
    records: [],
    totalReward: 0
  },

  onLoad() {
    this.loadRewardRecords()
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadRewardRecords()
  },

  loadRewardRecords() {
    // 从本地存储加载打赏记录
    const records = wx.getStorageSync('reward_records') || []
    
    // 如果没有记录，生成一些模拟数据
    if (records.length === 0) {
      this.generateMockData()
      return
    }
    
    // 计算总打赏金额
    const total = records.reduce((sum, record) => sum + parseFloat(record.amount), 0)
    
    this.setData({
      records: records.reverse(), // 最新的在前面
      totalReward: total.toFixed(2)
    })
  },

  generateMockData() {
    const mockRecords = [
      {
        id: 1,
        orderId: '202510260006',
        amount: 20,
        buyerName: '用户_1234',
        time: '2025-10-24 16:30'
      },
      {
        id: 2,
        orderId: '202510260007',
        amount: 50,
        buyerName: '用户_5678',
        time: '2025-10-23 10:15'
      },
      {
        id: 3,
        orderId: '202510260008',
        amount: 10,
        buyerName: '匿名用户',
        time: '2025-10-22 14:20'
      }
    ]
    
    // 保存到本地
    wx.setStorageSync('reward_records', mockRecords)
    
    const total = mockRecords.reduce((sum, r) => sum + r.amount, 0)
    
    this.setData({
      records: mockRecords,
      totalReward: total
    })
  }
})

