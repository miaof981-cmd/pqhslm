const serviceIncome = require('../../utils/service-income.js')
const orderStatusUtil = require('../../utils/order-status.js')

/**
 * 🔧 iOS兼容的日期解析函数
 */
const parseDate = orderStatusUtil.parseDate

Page({
  data: {
    loading: true,
    availableBalance: '0.00',      // 🎯 可提现余额
    totalIncome: '0.00',           // 🎯 历史总收入
    totalWithdrawn: '0.00',        // 🎯 已提现金额
    records: [],                   // 🎯 账单流水（收入+提现）
    showWithdrawRecordsModal: false, // 🎯 提现记录弹窗
    withdrawRecords: []            // 🎯 提现记录列表
  },

  onLoad() {
    this.loadIncomeData()
  },

  onShow() {
    this.loadIncomeData()
  },

  // 🎯 加载账单流水数据
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

      // 🎯 3. 计算画师订单稿费（订单金额 - 平台扣除，按数量计算）
      const PLATFORM_DEDUCTION_PER_ITEM = 5.00
      const myCompletedOrders = allOrders.filter(order => {
        return String(order.artistId) === userKey && order.status === 'completed'
      })
      const orderIncomeAmount = myCompletedOrders.reduce((sum, o) => {
        const orderAmount = parseFloat(o.totalPrice) || parseFloat(o.price) || 0
        const quantity = parseInt(o.quantity) || 1
        const totalDeduction = PLATFORM_DEDUCTION_PER_ITEM * quantity
        const artistShare = Math.max(0, orderAmount - totalDeduction)
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

      // 🎯 7. 获取提现记录
      const withdrawRecords = wx.getStorageSync('withdraw_records') || []
      const myWithdraws = withdrawRecords.filter(r => String(r.userId) === userKey && r.status === 'success')
      const totalWithdrawnAmount = myWithdraws.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      // 🎯 8. 构建账单流水（收入+提现）
      const transactions = []

      // 添加打赏收入
      myRewards.forEach(reward => {
        transactions.push({
          id: `reward_${reward.id}`,
          type: 'income',
          subType: 'reward',
          typeText: '打赏收入',
          title: reward.productName || `订单 ${reward.orderId}`,
          amount: parseFloat(reward.amount),
          isIncome: true,
          // 🔧 iOS兼容：使用parseDate
          timestamp: reward.time ? parseDate(reward.time).getTime() : Date.now(),
          time: this.formatTime(reward.time)
        })
      })

      // 添加订单稿费收入
      myCompletedOrders.forEach(order => {
        const orderAmount = parseFloat(order.totalPrice) || parseFloat(order.price) || 0
        const quantity = parseInt(order.quantity) || 1
        const totalDeduction = PLATFORM_DEDUCTION_PER_ITEM * quantity
        const artistShare = Math.max(0, orderAmount - totalDeduction)
        transactions.push({
          id: `order_${order.id}`,
          type: 'income',
          subType: 'order',
          typeText: '订单稿费',
          title: order.productName || `订单 ${order.id}`,
          amount: artistShare,
          isIncome: true,
          // 🔧 iOS兼容：使用parseDate函数
          timestamp: parseDate(order.completedAt || order.createTime).getTime(),
          time: this.formatTime(order.completedAt || order.createTime)
        })
      })

      // 添加客服分成收入
      csIncomeLedger.forEach(entry => {
        transactions.push({
          id: `service_${entry.id}`,
          type: 'income',
          subType: 'service',
          typeText: '客服分成',
          title: entry.note || `订单分成`,
          amount: parseFloat(entry.amount),
          isIncome: true,
          // 🔧 iOS兼容：使用parseDate函数
          timestamp: parseDate(entry.orderCompletedAt || entry.createdAt).getTime(),
          time: this.formatTime(entry.orderCompletedAt || entry.createdAt)
        })
      })

      // 添加管理员分成收入
      staffIncomeLedger.forEach(entry => {
        transactions.push({
          id: `staff_${entry.id}`,
          type: 'income',
          subType: 'staff_share',
          typeText: '管理员分成',
          title: entry.note || `订单分成`,
          amount: parseFloat(entry.amount),
          isIncome: true,
          // 🔧 iOS兼容：使用parseDate函数
          timestamp: parseDate(entry.orderCompletedAt || entry.createdAt).getTime(),
          time: this.formatTime(entry.orderCompletedAt || entry.createdAt)
        })
      })

      // 添加提现支出
      myWithdraws.forEach(withdraw => {
        transactions.push({
          id: `withdraw_${withdraw.id}`,
          type: 'withdraw',
          subType: 'withdraw',
          typeText: '提现',
          title: withdraw.bankName ? `${withdraw.bankName}(****${withdraw.bankCard})` : '提现到账',
          amount: parseFloat(withdraw.amount),
          isIncome: false,
          // 🔧 iOS兼容：使用parseDate
          timestamp: parseDate(withdraw.completedTime || withdraw.time).getTime(),
          time: this.formatTime(withdraw.completedTime || withdraw.time)
        })
      })

      // 🎯 9. 按时间正序排序（从早到晚）
      transactions.sort((a, b) => a.timestamp - b.timestamp)

      // 🎯 10. 计算每笔交易后的余额
      let currentBalance = 0
      transactions.forEach(trans => {
        if (trans.isIncome) {
          currentBalance += trans.amount
        } else {
          currentBalance -= trans.amount
        }
        trans.balance = currentBalance
        trans.amountText = (trans.isIncome ? '+' : '-') + trans.amount.toFixed(2)
        trans.balanceText = currentBalance.toFixed(2)
      })

      // 🎯 11. 倒序显示（最新的在上面）
      transactions.reverse()

      // 🎯 12. 计算可提现余额
      const availableBalanceAmount = totalIncomeAmount - totalWithdrawnAmount

      this.setData({
        availableBalance: availableBalanceAmount.toFixed(2),
        totalIncome: totalIncomeAmount.toFixed(2),
        totalWithdrawn: totalWithdrawnAmount.toFixed(2),
        records: transactions
      })

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 账单流水 (income-detail)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('👤 用户ID:', userKey)
      console.log('')
      console.log('💰 资金统计:')
      console.log('  - 历史总收入:', totalIncomeAmount.toFixed(2), '元')
      console.log('  - 已提现:', totalWithdrawnAmount.toFixed(2), '元')
      console.log('  - 可提现余额:', availableBalanceAmount.toFixed(2), '元')
      console.log('')
      console.log('📝 交易记录:')
      console.log('  - 收入笔数:', transactions.filter(t => t.isIncome).length, '笔')
      console.log('  - 提现笔数:', transactions.filter(t => !t.isIncome).length, '笔')
      console.log('  - 总记录数:', transactions.length, '笔')
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
    
    // 🔧 iOS兼容：使用parseDate
    const date = parseDate(timestamp)
    if (isNaN(date.getTime())) return '时间未知'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 🎯 显示提现记录弹窗
  showWithdrawRecordsModal() {
    const userId = wx.getStorageSync('userId')
    const userKey = String(userId)
    const allRecords = wx.getStorageSync('withdraw_records') || []
    const myRecords = allRecords.filter(r => String(r.userId) === userKey)
    
    // 按时间倒序
    myRecords.sort((a, b) => {
      // 🔧 iOS兼容：使用parseDate
      const timeA = parseDate(b.completedTime || b.time).getTime()
      const timeB = parseDate(a.completedTime || a.time).getTime()
      return timeA - timeB
    })
    
    this.setData({
      withdrawRecords: myRecords,
      showWithdrawRecordsModal: true
    })
  },

  // 关闭提现记录弹窗
  closeWithdrawRecordsModal() {
    this.setData({
      showWithdrawRecordsModal: false
    })
  }
})
