const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')
const serviceIncome = require('../../utils/service-income.js')
const orderStatusUtil = require('../../utils/order-status.js')

/**
 * 🔧 iOS兼容的日期解析函数
 */
const parseDate = orderStatusUtil.parseDate

Page({
  data: {
    loading: true,
    availableBalance: '0.00',
    totalIncome: '0.00',
    totalWithdrawn: '0.00',
    records: [],
    showWithdrawRecordsModal: false,
    withdrawRecords: []
  },

  onLoad() {
    this.loadIncomeData()
  },

  onShow() {
    this.loadIncomeData()
  },

  // 🎯 加载账单流水数据
  async loadIncomeData() {
    this.setData({ loading: true })

    try {
      const userId = app.globalData.userId
      const userKey = userId != null ? String(userId) : ''

      // ✅ 从云端获取数据
      const [ordersRes, rewardsRes, withdrawsRes] = await Promise.all([
        cloudAPI.getOrderList({ userId }),
        cloudAPI.getRewardList({ userId }),
        cloudAPI.getWithdrawList({ userId })
      ])

      // 🛡️ 安全数组解析
      const allOrders = cloudAPI.safeArray(ordersRes)
      const rewardRecords = cloudAPI.safeArray(rewardsRes)
      const withdrawRecords = cloudAPI.safeArray(withdrawsRes)

      // 🎯 2. 计算画师打赏收入
      const myRewards = rewardRecords.filter(record => {
        if (record.artistId || record.artist_id) {
          return String(record.artistId || record.artist_id) === userKey
        }
        const order = allOrders.find(o => String(o._id || o.id) === String(record.orderId || record.order_id))
        if (!order) return false
        return String(order.artistId || order.artist_id) === userKey
      })
      const rewardIncomeAmount = myRewards.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      // 🎯 3. 计算画师订单稿费（订单金额 - 平台扣除，按数量计算）
      const PLATFORM_DEDUCTION_PER_ITEM = 5.00
      const myCompletedOrders = allOrders.filter(order => {
        return String(order.artistId || order.artist_id) === userKey && order.status === 'completed'
      })
      const orderIncomeAmount = myCompletedOrders.reduce((sum, o) => {
        const orderAmount = parseFloat(o.totalPrice || o.total_price || o.price) || 0
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
      const myWithdraws = withdrawRecords.filter(r => String(r.userId || r.user_id) === userKey && (r.status === 'success' || r.status === 'completed'))
      const totalWithdrawnAmount = myWithdraws.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

      // 🎯 8. 构建账单流水（收入+提现）
      const transactions = []

      // 添加打赏收入
      myRewards.forEach(reward => {
        transactions.push({
          id: `reward_${reward._id || reward.id}`,
          type: 'income',
          subType: 'reward',
          typeText: '打赏收入',
          title: reward.productName || reward.product_name || `订单 ${reward.orderId || reward.order_id}`,
          amount: parseFloat(reward.amount),
          isIncome: true,
          timestamp: reward.time ? parseDate(reward.time).getTime() : Date.now(),
          time: this.formatTime(reward.time)
        })
      })

      // 添加订单稿费收入
      myCompletedOrders.forEach(order => {
        const orderAmount = parseFloat(order.totalPrice || order.total_price || order.price) || 0
        const quantity = parseInt(order.quantity) || 1
        const totalDeduction = PLATFORM_DEDUCTION_PER_ITEM * quantity
        const artistShare = Math.max(0, orderAmount - totalDeduction)
        transactions.push({
          id: `order_${order._id || order.id}`,
          type: 'income',
          subType: 'order',
          typeText: '订单稿费',
          title: order.productName || order.product_name || `订单 ${order._id || order.id}`,
          amount: artistShare,
          isIncome: true,
          timestamp: parseDate(order.completedAt || order.completed_at || order.createTime || order.create_time).getTime(),
          time: this.formatTime(order.completedAt || order.completed_at || order.createTime || order.create_time)
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
          timestamp: parseDate(entry.orderCompletedAt || entry.createdAt).getTime(),
          time: this.formatTime(entry.orderCompletedAt || entry.createdAt)
        })
      })

      // 添加提现支出
      myWithdraws.forEach(withdraw => {
        const bankName = withdraw.bankName || withdraw.bank_name || ''
        const bankCard = withdraw.bankCard || withdraw.bank_card || ''
        const displayCard = bankCard ? `****${bankCard.slice(-4)}` : ''
        transactions.push({
          id: `withdraw_${withdraw._id || withdraw.id}`,
          type: 'withdraw',
          subType: 'withdraw',
          typeText: '提现',
          title: bankName ? `${bankName}(${displayCard})` : '提现到账',
          amount: parseFloat(withdraw.amount),
          isIncome: false,
          timestamp: parseDate(withdraw.completedTime || withdraw.completed_time || withdraw.time).getTime(),
          time: this.formatTime(withdraw.completedTime || withdraw.completed_time || withdraw.time)
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
      console.log('📊 账单流水 (income-detail - 云端版)')
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
  async showWithdrawRecordsModal() {
    const userId = app.globalData.userId
    const userKey = String(userId)

    try {
      // ✅ 从云端获取提现记录
      const res = await cloudAPI.getWithdrawList({ userId: userKey })
      // 🛡️ 安全数组解析
      const myRecords = cloudAPI.safeArray(res).filter(r => String(r.userId || r.user_id) === userKey)
      
      // 按时间倒序
      myRecords.sort((a, b) => {
        const timeA = parseDate(b.completedTime || b.completed_time || b.time).getTime()
        const timeB = parseDate(a.completedTime || a.completed_time || a.time).getTime()
        return timeA - timeB
      })
      
      this.setData({
        withdrawRecords: myRecords,
        showWithdrawRecordsModal: true
      })
    } catch (err) {
      console.error('❌ 加载提现记录失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 关闭提现记录弹窗
  closeWithdrawRecordsModal() {
    this.setData({
      showWithdrawRecordsModal: false
    })
  }
})
