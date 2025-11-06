const orderHelper = require('../../utils/order-helper.js')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')

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
      totalOrders: 0,
      totalIncome: 0,
      rewardIncome: 0,
      completeRate: 0,
      inProgress: 0,
      nearDeadline: 0,
      overdue: 0,
      completed: 0,
      orderIncome: 0,
      orderIncomePercent: 0,
      rewardIncomePercent: 0,
      avgOrderAmount: 0,
      avgCompleteTime: 0,
      goodReviewRate: 0,
      repurchaseRate: 0
    },
    hotProducts: []
  },

  onLoad() {
    this.loadStats()
  },

  switchTimeRange(e) {
    const range = e.currentTarget.dataset.range
    this.loadStats(range)
  },

  loadStats(range = 'week') {
    wx.showLoading({ title: '加载中...' })

    try {
      const allOrders = orderHelper.getAllOrders() || []
      const { stats, hotProducts } = this.calculateStats(range, allOrders)
      this.setData({
        currentRange: range,
        stats,
        hotProducts
      })
    } catch (error) {
      console.error('加载统计数据失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  calculateStats(range, orders) {
    const filteredOrders = this.filterOrdersByRange(orders, range)
    const completedOrders = filteredOrders.filter(order => order.status === 'completed')
    const rewardIncome = filteredOrders.reduce((sum, order) => sum + (parseFloat(order.rewardAmount) || 0), 0)
    const orderIncome = completedOrders.reduce((sum, order) => sum + this.resolveOrderAmount(order), 0)
    const totalIncome = orderIncome + rewardIncome

    const inProgressStatuses = new Set(['processing', 'inProgress', 'paid', 'waitingConfirm'])
    const inProgress = filteredOrders.filter(order => inProgressStatuses.has(order.status)).length
    const nearDeadline = filteredOrders.filter(order => order.status === 'nearDeadline').length
    const overdue = filteredOrders.filter(order => order.status === 'overdue').length

    const totalOrders = filteredOrders.length
    const completed = completedOrders.length
    const completeRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0
    const avgOrderAmount = totalOrders > 0 ? Number((totalIncome / totalOrders).toFixed(2)) : 0

    const completionDurations = completedOrders
      .map(order => this.calculateDurationInDays(order.createTime, order.completedAt || order.workCompleteTime || order.finishTime))
      .filter(value => typeof value === 'number')
    const avgCompleteTime = completionDurations.length > 0
      ? Math.round(completionDurations.reduce((sum, value) => sum + value, 0) / completionDurations.length)
      : 0

    const reviewedCount = completedOrders.filter(order => order.reviewed).length
    const goodReviewRate = completed > 0 ? Math.round((reviewedCount / completed) * 100) : 0

    const repurchaseRate = this.calculateRepurchaseRate(filteredOrders)

    const incomeTotal = totalIncome || 0
    const orderIncomePercent = incomeTotal > 0 ? Math.round((orderIncome / incomeTotal) * 100) : (rewardIncome === 0 ? 100 : 0)
    const rewardIncomePercent = incomeTotal > 0 ? Math.round((rewardIncome / incomeTotal) * 100) : (orderIncome === 0 ? 100 : 0)

    const hotProducts = this.calculateHotProducts(completedOrders)

    return {
      stats: {
        totalOrders,
        totalIncome: Number(totalIncome.toFixed(2)),
        rewardIncome: Number(rewardIncome.toFixed(2)),
        completeRate,
        inProgress,
        nearDeadline,
        overdue,
        completed,
        orderIncome: Number(orderIncome.toFixed(2)),
        orderIncomePercent,
        rewardIncomePercent,
        avgOrderAmount,
        avgCompleteTime,
        goodReviewRate,
        repurchaseRate
      },
      hotProducts
    }
  },

  filterOrdersByRange(orders, range) {
    if (range === 'all') {
      return orders
    }

    const start = this.getRangeStart(range)
    if (!start) {
      return orders
    }

    return orders.filter(order => {
      const createTime = this.parseDate(order.createTime)
      return createTime && createTime >= start
    })
  },

  getRangeStart(range) {
    const now = new Date()
    switch (range) {
      case 'today': {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      }
      case 'week': {
        const dayOfWeek = now.getDay() || 7
        const diff = dayOfWeek - 1
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
        startDate.setHours(0, 0, 0, 0)
        return startDate
      }
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      default:
        return null
    }
  },

  parseDate(value) {
    if (!value) return null
    const date = new Date(String(value).replace(/-/g, '/'))
    return isNaN(date.getTime()) ? null : date
  },

  calculateDurationInDays(startTime, endTime) {
    const start = this.parseDate(startTime)
    const end = this.parseDate(endTime)
    if (!start || !end) return null
    const diff = end.getTime() - start.getTime()
    if (diff < 0) return null
    return diff / (1000 * 60 * 60 * 24)
  },

  resolveOrderAmount(order) {
    return parseFloat(order.price || order.totalAmount || order.totalPrice || 0) || 0
  },

  calculateRepurchaseRate(orders) {
    const buyerCounter = new Map()
    orders.forEach(order => {
      const key = String(order.buyerId || order.buyer || order.customerId || 'guest')
      buyerCounter.set(key, (buyerCounter.get(key) || 0) + 1)
    })

    if (buyerCounter.size === 0) return 0

    const repurchaseCustomers = Array.from(buyerCounter.values()).filter(count => count > 1).length
    return Math.round((repurchaseCustomers / buyerCounter.size) * 100)
  },

  calculateHotProducts(completedOrders) {
    const productMap = wx.getStorageSync('mock_products') || []
    const productIndex = new Map()
    productMap.forEach(product => {
      if (product && product.id) {
        productIndex.set(String(product.id), product)
      }
    })

    const aggregated = new Map()
    completedOrders.forEach(order => {
      const productId = String(order.productId || '')
      if (!productId) return
      const quantity = Number(order.quantity) || 1
      const income = this.resolveOrderAmount(order)

      if (!aggregated.has(productId)) {
        const productInfo = productIndex.get(productId) || {}
        aggregated.set(productId, {
          id: productId,
          name: order.productName || productInfo.name || '商品',
          image: order.productImage || (productInfo.images && productInfo.images[0]) || productInfo.image || DEFAULT_PLACEHOLDER,
          sales: 0,
          income: 0
        })
      }

      const entry = aggregated.get(productId)
      entry.sales += quantity
      entry.income += income
    })

    return Array.from(aggregated.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3)
      .map(item => ({
        id: item.id,
        name: item.name,
        image: ensureRenderableImage(item.image, {
          namespace: 'stats-product',
          fallback: DEFAULT_PLACEHOLDER
        }),
        sales: item.sales,
        income: Number(item.income.toFixed(2))
      }))
  }
})
