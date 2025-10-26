Page({
  data: {
    currentRange: 'week',
    timeRanges: [
      { key: 'today', label: '今日' },
      { key: 'week', label: '本周' },
      { key: 'month', label: '本月' },
      { key: 'all', label: '全部' }
    ],
    stats: {
      totalOrders: 12,
      totalIncome: 1856,
      rewardIncome: 80,
      completeRate: 75,
      inProgress: 3,
      nearDeadline: 1,
      overdue: 1,
      completed: 7,
      orderIncome: 1776,
      orderIncomePercent: 95,
      rewardIncomePercent: 5,
      avgOrderAmount: 154.67,
      avgCompleteTime: 5,
      goodReviewRate: 98,
      repurchaseRate: 35
    },
    hotProducts: [
      {
        id: 1,
        name: 'Q版头像定制',
        image: '/assets/default-product.png',
        sales: 25,
        income: 2200
      },
      {
        id: 2,
        name: '半身人物立绘',
        image: '/assets/default-product.png',
        sales: 18,
        income: 3024
      },
      {
        id: 3,
        name: '表情包定制',
        image: '/assets/default-product.png',
        sales: 12,
        income: 1536
      }
    ]
  },

  onLoad() {
    this.loadStats()
  },

  // 切换时间范围
  switchTimeRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({
      currentRange: range
    })
    this.loadStats(range)
  },

  // 加载统计数据
  loadStats(range = 'week') {
    // 这里应该从后端加载数据，现在使用模拟数据
    wx.showLoading({ title: '加载中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      
      // 根据时间范围生成不同的模拟数据
      const mockData = this.generateMockData(range)
      this.setData({
        stats: mockData.stats,
        hotProducts: mockData.hotProducts
      })
    }, 500)
  },

  // 生成模拟数据
  generateMockData(range) {
    const baseData = {
      today: {
        totalOrders: 2,
        totalIncome: 356,
        rewardIncome: 20,
        inProgress: 1,
        nearDeadline: 0,
        overdue: 0,
        completed: 1
      },
      week: {
        totalOrders: 12,
        totalIncome: 1856,
        rewardIncome: 80,
        inProgress: 3,
        nearDeadline: 1,
        overdue: 1,
        completed: 7
      },
      month: {
        totalOrders: 45,
        totalIncome: 7890,
        rewardIncome: 350,
        inProgress: 8,
        nearDeadline: 2,
        overdue: 1,
        completed: 34
      },
      all: {
        totalOrders: 156,
        totalIncome: 28560,
        rewardIncome: 1280,
        inProgress: 8,
        nearDeadline: 2,
        overdue: 1,
        completed: 145
      }
    }

    const data = baseData[range] || baseData.week
    const orderIncome = data.totalIncome - data.rewardIncome
    const total = data.totalIncome
    
    return {
      stats: {
        ...data,
        orderIncome: orderIncome,
        orderIncomePercent: Math.round((orderIncome / total) * 100),
        rewardIncomePercent: Math.round((data.rewardIncome / total) * 100),
        completeRate: Math.round((data.completed / data.totalOrders) * 100),
        avgOrderAmount: (data.totalIncome / data.totalOrders).toFixed(2),
        avgCompleteTime: 5,
        goodReviewRate: 98,
        repurchaseRate: 35
      },
      hotProducts: this.data.hotProducts
    }
  }
})

