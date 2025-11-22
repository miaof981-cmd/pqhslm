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
    currentTab: 'artist', // artist | service | admin
    timeRange: '30days', // 7days | 30days | custom
    customStartDate: '',
    customEndDate: '',
    artistList: [],
    serviceList: [],
    adminList: []
  },

  onLoad() {
    this.loadAllRoles()
  },

  onShow() {
    this.loadAllRoles()
  },

  // 切换角色Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 切换时间范围
  switchTimeRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    
    if (range !== 'custom') {
      this.loadAllRoles()
    }
  },

  // 开始日期改变
  onStartDateChange(e) {
    const date = e.detail.value
    this.setData({ customStartDate: date })
    
    // 如果两个日期都选了，重新加载数据
    if (date && this.data.customEndDate) {
      this.loadAllRoles()
    }
  },

  // 结束日期改变
  onEndDateChange(e) {
    const date = e.detail.value
    this.setData({ customEndDate: date })
    
    // 如果两个日期都选了，重新加载数据
    if (this.data.customStartDate && date) {
      this.loadAllRoles()
    }
  },

  // 获取时间范围的起止日期
  getDateRange() {
    const now = new Date()
    let startDate, endDate
    
    if (this.data.timeRange === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      endDate = now
    } else if (this.data.timeRange === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      endDate = now
    } else if (this.data.timeRange === 'custom') {
      if (!this.data.customStartDate || !this.data.customEndDate) {
        return null
      }
      startDate = new Date(this.data.customStartDate)
      endDate = new Date(this.data.customEndDate)
      endDate.setHours(23, 59, 59, 999)
    }
    
    return { startDate, endDate }
  },

  // 判断订单是否在时间范围内
  isOrderInRange(order, startDate, endDate) {
    // 🔧 iOS兼容：使用parseDate函数
    const orderTime = parseDate(order.createTime || order.orderTime)
    return orderTime >= startDate && orderTime <= endDate
  },

  // ✅ 从云端加载所有角色收入数据
  async loadAllRoles() {
    this.setData({ loading: true })
    
    try {
      const dateRange = this.getDateRange()
      if (!dateRange) {
        this.setData({ loading: false })
        return
      }
      
      const { startDate, endDate } = dateRange
      
      // ✅ 从云端获取所有订单
      const ordersRes = await cloudAPI.getOrderList({ pageSize: 999 })
      const allOrders = ordersRes.success ? (ordersRes.data || []) : []
      
      // ✅ 从云端获取提现记录
      const withdrawRes = await cloudAPI.getWithdrawList({ pageSize: 999 })
      const withdrawRecords = withdrawRes.success ? (withdrawRes.data || []) : []
      
      // ✅ 从云端获取打赏记录
      const rewardRes = await cloudAPI.getRewardList({ pageSize: 999 })
      const rewardRecords = rewardRes.success ? (rewardRes.data || []) : []
      
      // 加载画师数据
      const artistList = this.loadArtistIncome(allOrders, rewardRecords, withdrawRecords, startDate, endDate)
      
      // 加载客服数据
      const serviceList = this.loadServiceIncome(allOrders, withdrawRecords, startDate, endDate)
      
      // 加载管理员数据
      const adminList = this.loadAdminIncome(allOrders, withdrawRecords, startDate, endDate)
      
      this.setData({
        artistList,
        serviceList,
        adminList,
        loading: false
      })
      
      console.log('📊 角色收入统计加载完成', {
        时间范围: this.data.timeRange,
        起始日期: startDate.toLocaleDateString(),
        结束日期: endDate.toLocaleDateString(),
        画师数量: artistList.length,
        客服数量: serviceList.length,
        管理员数量: adminList.length
      })
    } catch (error) {
      console.error('加载收入数据失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 计算画师收入
  loadArtistIncome(allOrders, rewardRecords, withdrawRecords, startDate, endDate) {
    const artistMap = new Map()
    const PLATFORM_DEDUCTION_PER_ITEM = 5.00
    
    // 统计已完成订单的画师收入
    const completedOrders = allOrders.filter(o => 
      o.status === 'completed' && this.isOrderInRange(o, startDate, endDate)
    )
    
    completedOrders.forEach(order => {
      const artistId = String(order.artistId)
      if (!artistId || artistId === 'undefined') return
      
      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          userId: artistId,
          name: order.artistName || '未知画师',
          avatar: order.artistAvatar || '/assets/default-avatar.png',
          orderCount: 0,
          totalRevenue: 0, // 营业额（订单总金额）
          actualIncome: 0, // 实际收益（扣除平台费后）
          rewardIncome: 0, // 打赏收入
          totalIncome: 0, // 总收入（实际收益+打赏）
          withdrawn: 0, // 已提现
          available: 0 // 可提现
        })
      }
      
      const artist = artistMap.get(artistId)
      const orderAmount = parseFloat(order.totalPrice) || parseFloat(order.price) || 0
      const quantity = parseInt(order.quantity) || 1
      const totalDeduction = PLATFORM_DEDUCTION_PER_ITEM * quantity
      const artistShare = Math.max(0, orderAmount - totalDeduction)
      
      artist.orderCount++
      artist.totalRevenue += orderAmount
      artist.actualIncome += artistShare
    })
    
    // 统计打赏收入（期间内）
    rewardRecords.forEach(record => {
      // 🔧 iOS兼容：使用parseDate函数
      const rewardTime = parseDate(record.createTime)
      if (rewardTime < startDate || rewardTime > endDate) return
      
      const artistId = String(record.artistId)
      if (!artistMap.has(artistId)) return
      
      const artist = artistMap.get(artistId)
      const amount = parseFloat(record.amount) || 0
      artist.rewardIncome += amount
    })
    
    // 统计已提现（全部历史，不限期间）
    withdrawRecords.forEach(record => {
      const userId = String(record.userId)
      if (!artistMap.has(userId)) return
      if (record.status !== 'success') return
      
      const artist = artistMap.get(userId)
      artist.withdrawn += parseFloat(record.amount) || 0
    })
    
    // 计算总收入和可提现
    artistMap.forEach(artist => {
      artist.totalIncome = artist.actualIncome + artist.rewardIncome
      artist.available = Math.max(0, artist.totalIncome - artist.withdrawn)
      
      // 格式化数字
      artist.totalRevenue = artist.totalRevenue.toFixed(2)
      artist.actualIncome = artist.actualIncome.toFixed(2)
      artist.rewardIncome = artist.rewardIncome.toFixed(2)
      artist.totalIncome = artist.totalIncome.toFixed(2)
      artist.withdrawn = artist.withdrawn.toFixed(2)
      artist.available = artist.available.toFixed(2)
    })
    
    return Array.from(artistMap.values()).sort((a, b) => 
      parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue)
    )
  },

  // 计算客服收入
  loadServiceIncome(allOrders, withdrawRecords, startDate, endDate) {
    const serviceMap = new Map()
    
    // 获取客服列表
    // ✅ 已废弃：客服列表应从云端users表读取
    const customerServiceList = []
    customerServiceList.forEach(cs => {
      const userId = String(cs.userId)
      serviceMap.set(userId, {
        userId,
        name: cs.name || cs.serviceName || '未知客服',
        avatar: cs.avatar || cs.serviceAvatar || '/assets/default-avatar.png',
        orderCount: 0,
        totalRevenue: 0, // 服务订单总额
        actualIncome: 0, // 实际分成收入
        totalIncome: 0,
        withdrawn: 0,
        available: 0
      })
    })
    
    // 从service-income记录计算客服收入
    const serviceLedger = serviceIncome.getLedger()
    serviceLedger.forEach(entry => {
      if (entry.incomeType !== 'service') return
      
      // 🔧 iOS兼容：使用parseDate函数
      const entryTime = parseDate(entry.createTime)
      if (entryTime < startDate || entryTime > endDate) return
      
      const userId = String(entry.userId)
      
      if (!serviceMap.has(userId)) {
        serviceMap.set(userId, {
          userId,
          name: '客服' + userId.substr(-4),
          avatar: '/assets/default-avatar.png',
          orderCount: 0,
          totalRevenue: 0,
          actualIncome: 0,
          totalIncome: 0,
          withdrawn: 0,
          available: 0
        })
      }
      
      const service = serviceMap.get(userId)
      const amount = parseFloat(entry.amount) || 0
      service.actualIncome += amount
      service.orderCount++
      
      // 客服收入就是营业额（没有额外扣除）
      service.totalRevenue += amount
    })
    
    // 统计已提现（全部历史）
    withdrawRecords.forEach(record => {
      const userId = String(record.userId)
      if (!serviceMap.has(userId)) return
      if (record.status !== 'success') return
      
      const service = serviceMap.get(userId)
      service.withdrawn += parseFloat(record.amount) || 0
    })
    
    // 计算总收入和可提现
    serviceMap.forEach(service => {
      service.totalIncome = service.actualIncome
      service.available = Math.max(0, service.totalIncome - service.withdrawn)
      
      // 格式化
      service.totalRevenue = service.totalRevenue.toFixed(2)
      service.actualIncome = service.actualIncome.toFixed(2)
      service.totalIncome = service.totalIncome.toFixed(2)
      service.withdrawn = service.withdrawn.toFixed(2)
      service.available = service.available.toFixed(2)
    })
    
    return Array.from(serviceMap.values())
      .filter(s => s.orderCount > 0) // 只显示有收入的客服
      .sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue))
  },

  // 计算管理员收入
  loadAdminIncome(allOrders, withdrawRecords, startDate, endDate) {
    const adminMap = new Map()
    
    // 从service-income记录计算管理员分成
    const serviceLedger = serviceIncome.getLedger()
    serviceLedger.forEach(entry => {
      if (entry.incomeType !== 'admin_share') return
      
      // 🔧 iOS兼容：使用parseDate函数
      const entryTime = parseDate(entry.createTime)
      if (entryTime < startDate || entryTime > endDate) return
      
      const userId = String(entry.userId)
      
      if (!adminMap.has(userId)) {
        adminMap.set(userId, {
          userId,
          name: entry.staffName || '管理员' + userId.substr(-4),
          avatar: '/assets/default-avatar.png',
          orderCount: 0,
          totalRevenue: 0,
          actualIncome: 0,
          totalIncome: 0,
          withdrawn: 0,
          available: 0
        })
      }
      
      const admin = adminMap.get(userId)
      const amount = parseFloat(entry.amount) || 0
      admin.actualIncome += amount
      admin.orderCount++
      admin.totalRevenue += amount // 管理员分成即营业额
    })
    
    // 统计已提现（全部历史）
    withdrawRecords.forEach(record => {
      const userId = String(record.userId)
      if (!adminMap.has(userId)) return
      if (record.status !== 'success') return
      
      const admin = adminMap.get(userId)
      admin.withdrawn += parseFloat(record.amount) || 0
    })
    
    // 计算总收入和可提现
    adminMap.forEach(admin => {
      admin.totalIncome = admin.actualIncome
      admin.available = Math.max(0, admin.totalIncome - admin.withdrawn)
      
      // 格式化
      admin.totalRevenue = admin.totalRevenue.toFixed(2)
      admin.actualIncome = admin.actualIncome.toFixed(2)
      admin.totalIncome = admin.totalIncome.toFixed(2)
      admin.withdrawn = admin.withdrawn.toFixed(2)
      admin.available = admin.available.toFixed(2)
    })
    
    return Array.from(adminMap.values()).sort((a, b) => 
      parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue)
    )
  }
})
