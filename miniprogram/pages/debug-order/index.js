const orderHelper = require('../../utils/order-helper.js')

Page({
  data: {
    loading: true,
    scanProgress: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalServices: 0,
    problemOrders: [],  // 问题订单列表
    problemProducts: [], // 🎯 新增：问题商品列表
    issueStats: {
      productNotFound: 0,
      artistMismatch: 0,
      noService: 0,
      missingFields: 0,
      wrongArtistName: 0  // 🎯 新增：画师名字错误
    }
  },

  onLoad() {
    this.runDiagnosis()
  },

  runDiagnosis() {
    this.setData({ loading: true })
    
    setTimeout(() => {
      // 1️⃣ 加载所有数据
      const allOrders = orderHelper.getAllOrders()
      const products = wx.getStorageSync('mock_products') || []
      const services = wx.getStorageSync('customer_service_list') || 
                       wx.getStorageSync('service_list') || []

      this.setData({ scanProgress: allOrders.length })

      // 2️⃣ 扫描每个订单
      const problemOrders = []
      const stats = {
        productNotFound: 0,
        artistMismatch: 0,
        noService: 0,
        missingFields: 0,
        wrongArtistName: 0
      }
      
      // 🎯 新增：扫描商品画师名字
      const users = wx.getStorageSync('users') || []
      const applications = wx.getStorageSync('artist_applications') || []
      const problemProducts = []
      
      products.forEach(product => {
        const artistName = product.artistName || ''
        const artistId = product.artistId
        
        // 检测是否是错误的英文名（cat_xxx、emoticon、portrait等）
        const isWrongName = !artistName || 
                           artistName.includes('cat_') || 
                           artistName === 'emoticon' || 
                           artistName === 'portrait' ||
                           /^[a-zA-Z0-9_]+$/.test(artistName)  // 纯英文+数字+下划线
        
        if (isWrongName && artistId) {
          // 获取正确的画师名字
          let correctName = null
          const app = applications.find(a => 
            String(a.userId) === String(artistId) && a.status === 'approved'
          )
          if (app) {
            correctName = app.name || app.nickName
          } else {
            const user = users.find(u => 
              String(u.id) === String(artistId) || String(u.userId) === String(artistId)
            )
            if (user) {
              correctName = user.nickName || user.name
            }
          }
          
          if (correctName) {
            problemProducts.push({
              productId: product.id,
              productName: product.name,
              wrongName: artistName,
              correctName: correctName,
              artistId: artistId
            })
            stats.wrongArtistName++
          }
        }
      })

      allOrders.forEach(order => {
        const issues = []
        let hasIssue = false

        // 🎯 检查1：商品是否存在
        const product = products.find(p => 
          String(p.id || p._id) === String(order.productId)
        )
        if (!product) {
          issues.push({ level: 'error', text: '❌商品不存在' })
          stats.productNotFound++
          hasIssue = true
        } else {
          // 🎯 检查2：画师ID是否匹配
          if (product.artistId && order.artistId && 
              String(product.artistId) !== String(order.artistId)) {
            issues.push({ level: 'warning', text: `⚠️画师ID不匹配(商品=${product.artistId})` })
            stats.artistMismatch++
            hasIssue = true
          }
        }

        // 🎯 检查3：客服是否分配
        if (!order.serviceId) {
          issues.push({ level: 'warning', text: '⚠️客服未分配' })
          stats.noService++
          hasIssue = true
        }

        // 🎯 检查4：关键字段是否缺失
        const missingFields = []
        if (!order.buyerId) missingFields.push('买家ID')
        if (!order.artistId) missingFields.push('画师ID')
        if (!order.productId) missingFields.push('商品ID')
        if (missingFields.length > 0) {
          issues.push({ level: 'warning', text: `⚠️缺失: ${missingFields.join(',')}` })
          stats.missingFields++
          hasIssue = true
        }

        if (hasIssue) {
          problemOrders.push({
            orderId: order.id || order._id,
            productName: order.productName || '未知商品',
            buyerId: order.buyerId,
            artistId: order.artistId,
            productId: order.productId,
            serviceId: order.serviceId,
            issues: issues,
            _rawOrder: order  // 保存原始订单用于修复
          })
        }
      })

      console.log('=== 诊断完成 ===')
      console.log('总订单数:', allOrders.length)
      console.log('问题订单数:', problemOrders.length)
      console.log('问题统计:', stats)
      console.log('问题订单详情:', problemOrders)

      this.setData({
        loading: false,
        totalOrders: allOrders.length,
        totalProducts: products.length,
        totalServices: services.length,
        problemOrders: problemOrders.slice(0, 10),  // 只显示前10个
        problemProducts: problemProducts.slice(0, 10),  // 🎯 新增
        issueStats: stats
      })
    }, 500)
  },

  copyResult() {
    let result = `【全局诊断报告】\n`
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
      result += `⚠️ 客服未分配: ${this.data.issueStats.noService}个\n`
      result += `⚠️ 字段缺失: ${this.data.issueStats.missingFields}个\n\n`

      if (this.data.problemProducts.length > 0) {
        result += `🛒 问题商品明细\n`
        this.data.problemProducts.forEach((prod, index) => {
          result += `\n${index + 1}. ${prod.productName}\n`
          result += `   错误名字: ${prod.wrongName}\n`
          result += `   正确名字: ${prod.correctName}\n`
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
    const totalIssues = this.data.problemOrders.length + this.data.problemProducts.length
    wx.showModal({
      title: '批量修复',
      content: `将修复以下问题：\n\n` +
               `订单问题: ${this.data.problemOrders.length}个\n` +
               `商品画师名字: ${this.data.problemProducts.length}个\n\n` +
               `确定继续？`,
      success: (res) => {
        if (res.confirm) {
          this.doFixIssues()
        }
      }
    })
  },

  doFixIssues() {
    wx.showLoading({ title: '修复中...', mask: true })

    setTimeout(() => {
      let products = wx.getStorageSync('mock_products') || []
      let fixedCount = 0

      // 🎯 1️⃣ 修复商品画师名字
      if (this.data.problemProducts.length > 0) {
        console.log('=== 开始修复商品画师名字 ===')
        products = products.map(product => {
          const problem = this.data.problemProducts.find(p => 
            String(p.productId) === String(product.id)
          )
          if (problem) {
            console.log(`✅ 修复商品 "${product.name}": "${problem.wrongName}" → "${problem.correctName}"`)
            fixedCount++
            return {
              ...product,
              artistName: problem.correctName
            }
          }
          return product
        })
        wx.setStorageSync('mock_products', products)
        console.log(`✅ 已修复 ${this.data.problemProducts.length} 个商品`)
      }

      // 🎯 2️⃣ 修复订单画师ID
      if (this.data.problemOrders.length > 0) {
        console.log('=== 开始修复订单画师ID ===')
        const orders = wx.getStorageSync('orders') || []
        const pendingOrders = wx.getStorageSync('pending_orders') || []
        const completedOrders = wx.getStorageSync('completed_orders') || []
        const mockOrders = wx.getStorageSync('mock_orders') || []

        this.data.problemOrders.forEach(problemOrder => {
          const orderId = problemOrder.orderId
          const product = products.find(p => 
            String(p.id || p._id) === String(problemOrder.productId)
          )

          if (!product) {
            console.warn(`⚠️ 商品不存在，无法修复订单 ${orderId}`)
            return
          }

          const updateOrder = (list) => {
            return list.map(o => {
              if (o.id === orderId || o._id === orderId) {
                console.log(`✅ 修复订单 ${orderId}: artistId ${o.artistId} → ${product.artistId}`)
                fixedCount++
                return {
                  ...o,
                  artistId: product.artistId,
                  artistName: product.artistName || o.artistName,
                  productName: product.name || o.productName
                }
              }
              return o
            })
          }

          wx.setStorageSync('orders', updateOrder(orders))
          wx.setStorageSync('pending_orders', updateOrder(pendingOrders))
          wx.setStorageSync('completed_orders', updateOrder(completedOrders))
          wx.setStorageSync('mock_orders', updateOrder(mockOrders))
        })
      }

      wx.hideLoading()
      wx.showToast({ 
        title: `已修复${fixedCount}项`, 
        icon: 'success',
        duration: 2000
      })

      // 重新扫描
      setTimeout(() => {
        this.runDiagnosis()
      }, 2000)
    }, 500)
  },

  goBack() {
    wx.navigateBack()
  }
})
