const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')
const orderDiagnosis = require('../../utils/order-diagnosis.js')
const orderHelper = require('../../utils/order-helper.js')

/**
 * ⚠️ 订单诊断工具页面
 * 已云端化：所有数据从云端读取
 * 注意：云端化后，数据源统计功能已简化
 */

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

  async runDiagnosis() {
    this.setData({ loading: true })
    
    try {
      // ✅ 从云端获取所有订单
      const ordersRes = await cloudAPI.getOrderList({})
      // 🛡️ 安全数组解析
      const allOrders = cloudAPI.safeArray(ordersRes)
      
      // 获取完整诊断报告（基于云端数据）
      const report = orderDiagnosis.diagnoseOrderCounts()
      
      // 检查重复订单
      const duplicates = orderDiagnosis.checkDuplicates()
      
      // ✅ 云端化后，数据源统一（不再分离 orders/pending_orders/mock_orders）
      const dataSources = {
        orders: 0,  // ❌ 已废弃
        pending: 0, // ❌ 已废弃
        mock: 0,    // ❌ 已废弃
        total: allOrders.length
      }
      
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
        dataSources: dataSources,
        duplicates: duplicates,
        extraOrders: report.extraInAdmin.map(o => ({
          id: o._id || o.id,
          status: o.status,
          product: o.productName || o.product_name || '未知商品',
          buyer: o.buyerName || o.buyer_name || o.buyerId || o.buyer_id || '未知',
          artistId: o.artistId || o.artist_id || ''
        }))
      })
      
      console.log('诊断完成（云端版）:', {
        总订单数: allOrders.length,
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
