const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')
const orderHelper = require('../../utils/order-helper.js')

/**
 * ⚠️ 调试工具页面
 * 用于诊断订单和商品数据问题
 * 已云端化：所有数据从云端读取
 * ❌ 已废弃修复功能：数据修复应在云端进行
 */

Page({
  data: {
    loading: true,
    scanProgress: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalServices: 0,
    problemOrders: [],
    problemProducts: [],
    issueStats: {
      productNotFound: 0,
      artistMismatch: 0,
      noService: 0,
      missingFields: 0,
      wrongArtistName: 0,
      wrongCategory: 0
    }
  },

  onLoad() {
    this.runDiagnosis()
  },

  async runDiagnosis() {
    this.setData({ loading: true })
    
    try {
      // ✅ 从云端加载所有数据
      const [ordersRes, productsRes, categoriesRes, appsRes] = await Promise.all([
        cloudAPI.getOrderList({}),
        cloudAPI.getProductList({}),
        cloudAPI.getCategoryList(),
        cloudAPI.getArtistApplicationList({})
      ])

      const allOrders = ordersRes.success ? (ordersRes.data || []) : []
      const products = productsRes.success ? (productsRes.data || []) : []
      const categories = categoriesRes.success ? (categoriesRes.data || []) : []
      const applications = appsRes.success ? (appsRes.data || []) : []
      const services = []  // ✅ 客服列表从云端用户表读取

      this.setData({ scanProgress: allOrders.length })

      // 扫描每个订单
      const problemOrders = []
      const stats = {
        productNotFound: 0,
        artistMismatch: 0,
        noService: 0,
        missingFields: 0,
        wrongArtistName: 0,
        wrongCategory: 0
      }
      
      // 🎯 扫描商品画师名字 + 分类异常
      const problemProducts = []
      
      // 🎯 检测异常英文的辅助函数
      const isInvalidEnglish = (text) => {
        if (!text) return false
        const str = String(text).trim()
        return str.includes('cat_') || 
               str === 'emoticon' || 
               str === 'portrait' ||
               /^[a-zA-Z0-9_]+$/.test(str)
      }
      
      products.forEach(product => {
        const artistName = product.artistName || product.artist_name || ''
        const artistId = product.artistId || product.artist_id
        const category = product.category
        
        let issues = []
        
        // 检查1：画师名字是否是错误的英文
        if (isInvalidEnglish(artistName) && artistId) {
          let correctName = null
          const app = applications.find(a => 
            String(a.userId || a.user_id) === String(artistId) && a.status === 'approved'
          )
          if (app) {
            correctName = app.name || app.nickName || app.nick_name
          }
          
          if (correctName) {
            issues.push({
              type: 'artistName',
              wrongValue: artistName,
              correctValue: correctName
            })
            stats.wrongArtistName++
          }
        }
        
        // 检查2：分类显示是否正确
        const categoryName = product.categoryName || product.category_name || ''
        if (category) {
          const validCategory = categories.find(c => String(c._id || c.id) === String(category))
          
          if (!validCategory) {
            issues.push({
              type: 'category',
              wrongValue: `${category}（分类已失效）`,
              correctValue: '请在商品编辑中重新选择分类'
            })
            stats.wrongCategory++
          } else if (!categoryName || categoryName !== validCategory.name) {
            issues.push({
              type: 'category',
              wrongValue: categoryName || '未设置',
              correctValue: validCategory.name
            })
            stats.wrongCategory++
          }
        } else if (!category && !categoryName) {
          issues.push({
            type: 'category',
            wrongValue: '未分类',
            correctValue: '请设置商品分类'
          })
          stats.wrongCategory++
        }
        
        if (issues.length > 0) {
          problemProducts.push({
            productId: product._id || product.id,
            productName: product.name,
            artistId: artistId,
            issues: issues
          })
        }
      })

      allOrders.forEach(order => {
        const issues = []
        let hasIssue = false

        // 检查1：商品是否存在
        const product = products.find(p => 
          String(p._id || p.id) === String(order.productId || order.product_id)
        )
        if (!product) {
          issues.push({ level: 'error', text: '❌商品不存在' })
          stats.productNotFound++
          hasIssue = true
        } else {
          // 检查2：画师ID是否匹配
          const productArtistId = product.artistId || product.artist_id
          const orderArtistId = order.artistId || order.artist_id
          if (productArtistId && orderArtistId && 
              String(productArtistId) !== String(orderArtistId)) {
            issues.push({ level: 'warning', text: `⚠️画师ID不匹配(商品=${productArtistId})` })
            stats.artistMismatch++
            hasIssue = true
          }
        }

        // 检查3：客服是否分配
        const hasService = order.serviceId || order.service_id || order.serviceName || order.service_name || order.serviceQRCode || order.service_qrcode
        if (!hasService) {
          issues.push({ level: 'warning', text: '⚠️客服未分配' })
          stats.noService++
          hasIssue = true
        }

        // 检查4：关键字段是否缺失
        const missingFields = []
        if (!order.buyerId && !order.buyer_id) missingFields.push('买家ID')
        if (!order.artistId && !order.artist_id) missingFields.push('画师ID')
        if (!order.productId && !order.product_id) missingFields.push('商品ID')
        if (missingFields.length > 0) {
          issues.push({ level: 'warning', text: `⚠️缺失: ${missingFields.join(',')}` })
          stats.missingFields++
          hasIssue = true
        }

        if (hasIssue) {
          problemOrders.push({
            orderId: order._id || order.id,
            productName: order.productName || order.product_name || '未知商品',
            buyerId: order.buyerId || order.buyer_id,
            artistId: order.artistId || order.artist_id,
            productId: order.productId || order.product_id,
            serviceId: order.serviceId || order.service_id,
            issues: issues,
            _rawOrder: order
          })
        }
      })

      console.log('=== 诊断完成（云端版）===')
      console.log('总订单数:', allOrders.length)
      console.log('问题订单数:', problemOrders.length)
      console.log('问题统计:', stats)
      console.log('问题订单详情:', problemOrders)

      this.setData({
        loading: false,
        totalOrders: allOrders.length,
        totalProducts: products.length,
        totalServices: services.length,
        problemOrders: problemOrders.slice(0, 10),
        problemProducts: problemProducts.slice(0, 10),
        issueStats: stats
      })
    } catch (err) {
      console.error('❌ 诊断失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '诊断失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  copyResult() {
    let result = `【全局诊断报告（云端版）】\n`
    result += `扫描时间: ${new Date().toLocaleString()}\n\n`
    result += `📊 数据统计\n`
    result += `总订单数: ${this.data.totalOrders}\n`
    result += `问题订单: ${this.data.problemOrders.length}\n`
    result += `问题商品: ${this.data.problemProducts.length}\n`
    result += `商品总数: ${this.data.totalProducts}\n`
    result += `客服总数: ${this.data.totalServices}\n\n`

    if (this.data.problemOrders.length > 0 || this.data.problemProducts.length > 0) {
      result += `⚠️ 问题分类\n`
      result += `❌ 商品不存在: ${this.data.issueStats.productNotFound}个\n`
      result += `⚠️ 画师ID不匹配: ${this.data.issueStats.artistMismatch}个\n`
      result += `⚠️ 画师名字错误: ${this.data.issueStats.wrongArtistName}个\n`
      result += `⚠️ 分类异常: ${this.data.issueStats.wrongCategory}个\n`
      result += `⚠️ 客服未分配: ${this.data.issueStats.noService}个\n`
      result += `⚠️ 字段缺失: ${this.data.issueStats.missingFields}个\n\n`

      if (this.data.problemProducts.length > 0) {
        result += `🛒 问题商品明细\n`
        this.data.problemProducts.forEach((prod, index) => {
          result += `\n${index + 1}. ${prod.productName}\n`
          prod.issues.forEach(issue => {
            if (issue.type === 'artistName') {
              result += `   画师名字: ${issue.wrongValue} → ${issue.correctValue}\n`
            } else if (issue.type === 'category') {
              result += `   分类: ${issue.wrongValue} → ${issue.correctValue}\n`
            }
          })
        })
        result += `\n`
      }

      if (this.data.problemOrders.length > 0) {
        result += `🚨 问题订单明细（前10条）\n`
        this.data.problemOrders.forEach((order, index) => {
          result += `\n${index + 1}. ${order.productName} (${order.orderId})\n`
          result += `   买家ID: ${order.buyerId || '缺失'}\n`
          result += `   画师ID: ${order.artistId || '缺失'}\n`
          result += `   商品ID: ${order.productId || '缺失'}\n`
          result += `   问题: ${order.issues.map(i => i.text).join(', ')}\n`
        })
      }
    } else {
      result += `✅ 所有数据正常\n`
    }

    wx.setClipboardData({
      data: result,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      }
    })
  },

  fixAllIssues() {
    wx.showModal({
      title: '批量修复已废弃',
      content: '数据修复功能已迁移到云端。\n\n请联系开发人员在云端数据库中修复这些问题。\n\n或使用管理后台的数据修复工具。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#E74C3C'
    })
  },

  doFixIssues() {
    // ❌ 已废弃：数据修复应在云端进行
    wx.showToast({
      title: '修复功能已废弃',
      icon: 'none'
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
