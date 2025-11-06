const serviceIncome = require('../../utils/service-income.js')

Page({
  data: {
    loading: true,
    totalIncome: '0.00',
    rewardIncome: '0.00',
    orderIncome: '0.00',
    serviceIncome: '0.00',
    staffIncome: '0.00',
    records: []
  },

  onLoad() {
    this.loadIncomeData()
  },

  onShow() {
    this.loadIncomeData()
  },

  // 加载收入数据
  loadIncomeData() {
    this.setData({ loading: true })

    try {
      const userId = wx.getStorageSync('userId')
      const userKey = userId != null ? String(userId) : ''

      // 🎯 1. 获取所有订单并去重
      const orders = wx.getStorageSync('orders') || []
      const pendingOrders = wx.getStorageSync('pending_orders') || []
      const completedOrders = wx.getStorageSync('completed_orders') || []
      
      const orderMap = new Map()
      ;[...orders, ...pendingOrders, ...completedOrders].forEach(order => {
        if (order && order.id) {
          orderMap.set(order.id, order)
        }
      })
      const allOrders = Array.from(orderMap.values())

      // 🎯 2. 计算画师打赏收入
      const rewardRecords = wx.getStorageSync('reward_records') || []
      const myRewards = rewardRecords.filter(record => {
        if (record.artistId) {
          return String(record.artistId) === userKey
        }
        const order = allOrders.find(o => String(o.id) === String(record.orderId))
        if (!order) return false
        return String(order.artistId) === userKey
      })
      const rewardIncomeAmount = myRewards.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      // 🎯 3. 计算画师订单稿费（订单金额 - 5元平台扣除）
      const PLATFORM_DEDUCTION = 5.00
      const myCompletedOrders = allOrders.filter(order => {
        return String(order.artistId) === userKey && order.status === 'completed'
      })
      const orderIncomeAmount = myCompletedOrders.reduce((sum, o) => {
        const orderAmount = parseFloat(o.totalPrice) || parseFloat(o.price) || 0
        const artistShare = Math.max(0, orderAmount - PLATFORM_DEDUCTION)
        return sum + artistShare
      }, 0)

      // 🎯 4. 客服收入（从service-income获取）
      const csIncomeLedger = serviceIncome.getLedgerByUserId(userKey).filter(e => e.incomeType === 'service')
      const csIncomeAmount = csIncomeLedger.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0)

      // 🎯 5. 管理员分成（从service-income获取）
      const staffIncomeLedger = serviceIncome.getLedgerByUserId(userKey).filter(e => e.incomeType === 'admin_share')
      const staffIncomeAmount = staffIncomeLedger.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0)

      // 🎯 6. 计算总收入
      const totalIncomeAmount = rewardIncomeAmount + orderIncomeAmount + csIncomeAmount + staffIncomeAmount

      // 🎯 7. 构建收入明细记录
      const records = []

      // 添加打赏记录
      myRewards.forEach(reward => {
        records.push({
          id: `reward_${reward.id}`,
          type: 'reward',
          typeText: '打赏',
          title: reward.productName || `订单 ${reward.orderId}`,
          amount: parseFloat(reward.amount).toFixed(2),
          time: reward.time || '时间未知'
        })
      })

      // 添加订单稿费记录（已减去5元平台扣除）
      myCompletedOrders.forEach(order => {
        const orderAmount = parseFloat(order.totalPrice) || parseFloat(order.price) || 0
        const artistShare = Math.max(0, orderAmount - PLATFORM_DEDUCTION)
        records.push({
          id: `order_${order.id}`,
          type: 'order',
          typeText: '订单稿费',
          title: order.productName || `订单 ${order.id}`,
          amount: artistShare.toFixed(2),
          originalAmount: orderAmount.toFixed(2),
          time: this.formatTime(order.completedAt || order.createTime)
        })
      })

      // 添加客服分成记录
      csIncomeLedger.forEach(entry => {
        records.push({
          id: `service_${entry.id}`,
          type: 'service',
          typeText: '客服分成',
          title: entry.note || `订单 ${entry.orderNo || entry.orderId}`,
          amount: parseFloat(entry.amount).toFixed(2),
          time: this.formatTime(entry.orderCompletedAt || entry.createdAt)
        })
      })

      // 添加管理员分成记录
      staffIncomeLedger.forEach(entry => {
        records.push({
          id: `staff_${entry.id}`,
          type: 'staff_share',
          typeText: '管理员分成',
          title: entry.note || `订单 ${entry.orderNo || entry.orderId}`,
          amount: parseFloat(entry.amount).toFixed(2),
          time: this.formatTime(entry.orderCompletedAt || entry.createdAt)
        })
      })

      // 按时间倒序排序
      records.sort((a, b) => {
        const timeA = new Date(a.time).getTime() || 0
        const timeB = new Date(b.time).getTime() || 0
        return timeB - timeA
      })

      this.setData({
        totalIncome: totalIncomeAmount.toFixed(2),
        rewardIncome: rewardIncomeAmount.toFixed(2),
        orderIncome: orderIncomeAmount.toFixed(2),
        serviceIncome: csIncomeAmount.toFixed(2),
        staffIncome: staffIncomeAmount.toFixed(2),
        records
      })

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 收入明细 (income-detail)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('👤 用户ID:', userKey)
      console.log('📦 订单去重:', orders.length + pendingOrders.length + completedOrders.length, '→', allOrders.length)
      console.log('')
      console.log('💰 收入统计:')
      console.log('  - 打赏收入:', rewardIncomeAmount.toFixed(2), '元 (', myRewards.length, '次)')
      console.log('  - 订单稿费:', orderIncomeAmount.toFixed(2), '元 (', myCompletedOrders.length, '单)')
      console.log('  - 客服分成:', csIncomeAmount.toFixed(2), '元 (', csIncomeLedger.length, '笔)')
      console.log('  - 管理员分成:', staffIncomeAmount.toFixed(2), '元 (', staffIncomeLedger.length, '笔)')
      console.log('')
      console.log('✅ 总收入:', totalIncomeAmount.toFixed(2), '元')
      console.log('📝 明细记录数:', records.length)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } catch (error) {
      console.error('❌ 加载收入数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '时间未知'
    
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '时间未知'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }
})
