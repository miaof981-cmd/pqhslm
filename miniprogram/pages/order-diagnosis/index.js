const orderDiagnosis = require('../../utils/order-diagnosis.js')
const orderHelper = require('../../utils/order-helper.js')

Page({
  data: {
    loading: true,
    summary: {
      adminPending: 0,
      userProcessing: 0,
      difference: 0
    },
    statusBreakdown: {
      unpaid: 0,
      paid: 0,
      processing: 0,
      waiting: 0,
      nearDeadline: 0
    },
    dataSources: {
      orders: 0,
      pending: 0,
      mock: 0,
      total: 0
    },
    duplicates: [],
    extraOrders: []
  },

  onLoad() {
    this.runDiagnosis()
  },

  runDiagnosis() {
    this.setData({ loading: true })
    
    try {
      // 获取完整诊断报告
      const report = orderDiagnosis.diagnoseOrderCounts()
      
      // 检查重复订单
      const duplicates = orderDiagnosis.checkDuplicates()
      
      // 获取数据源统计
      const orders = wx.getStorageSync('orders') || []
      const pendingOrders = wx.getStorageSync('pending_orders') || []
      const mockOrders = wx.getStorageSync('mock_orders') || []
      const allOrders = orderHelper.getAllOrders()
      
      // 详细状态分布
      const unpaidOrders = allOrders.filter(o => o.status === 'unpaid').length
      const paidOrders = allOrders.filter(o => o.status === 'paid').length
      const processingOrders = allOrders.filter(o => o.status === 'processing' || o.status === 'inProgress').length
      const waitingOrders = allOrders.filter(o => o.status === 'waitingConfirm').length
      const nearDeadlineOrders = allOrders.filter(o => o.status === 'nearDeadline').length
      
      this.setData({
        loading: false,
        summary: {
          adminPending: report.adminPending,
          userProcessing: report.userProcessing,
          difference: report.difference
        },
        statusBreakdown: {
          unpaid: unpaidOrders,
          paid: paidOrders,
          processing: processingOrders,
          waiting: waitingOrders,
          nearDeadline: nearDeadlineOrders
        },
        dataSources: {
          orders: orders.length,
          pending: pendingOrders.length,
          mock: mockOrders.length,
          total: allOrders.length
        },
        duplicates: duplicates,
        extraOrders: report.extraInAdmin.map(o => ({
          id: o.id,
          status: o.status,
          product: o.productName || '未知商品',
          buyer: o.buyerName || o.buyerId || '未知',
          artistId: o.artistId || ''
        }))
      })
      
      console.log('诊断完成:', {
        差异: report.difference,
        重复订单: duplicates.length,
        差异订单: report.extraInAdmin.length
      })
      
    } catch (error) {
      console.error('诊断失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '诊断失败',
        icon: 'none'
      })
    }
  },

  reloadDiagnosis() {
    wx.showLoading({ title: '诊断中...' })
    this.runDiagnosis()
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '诊断完成',
        icon: 'success'
      })
    }, 500)
  },

  goBack() {
    wx.navigateBack()
  }
})

