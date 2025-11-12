// API统一封装层
const config = require('../config/env')
const db = wx.cloud.database()
const _ = db.command

class ApiService {
  constructor() {
    this.db = db
    this.collections = config.collections
  }
  
  /**
   * 统一错误处理
   */
  handleError(error, showToast = true) {
    console.error('API错误:', error)
    
    if (showToast) {
      wx.showToast({
        title: error.errMsg || error.message || '操作失败',
        icon: 'none',
        duration: 2000
      })
    }
    
    throw error
  }
  
  /**
   * ========== 用户模块 ==========
   */
  
  // 获取用户信息
  async getUserInfo(userId) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const users = wx.getStorageSync('users') || []
        return users.find(u => u.userId === userId)
      }
      
      const res = await this.db.collection(this.collections.users)
        .where({ userId })
        .get()
      
      return res.data[0] || null
    } catch (error) {
      return this.handleError(error, false)
    }
  }
  
  // 创建/更新用户
  async saveUserInfo(userData) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const users = wx.getStorageSync('users') || []
        const index = users.findIndex(u => u.userId === userData.userId)
        
        if (index >= 0) {
          users[index] = { ...users[index], ...userData }
        } else {
          users.push(userData)
        }
        
        wx.setStorageSync('users', users)
        return { success: true }
      }
      
      // 云数据库upsert
      const res = await this.db.collection(this.collections.users)
        .where({ userId: userData.userId })
        .get()
      
      if (res.data.length > 0) {
        // 更新
        await this.db.collection(this.collections.users)
          .doc(res.data[0]._id)
          .update({ data: userData })
      } else {
        // 新增
        await this.db.collection(this.collections.users)
          .add({ data: userData })
      }
      
      return { success: true }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * ========== 订单模块 ==========
   */
  
  // 创建订单
  async createOrder(orderData) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const orders = wx.getStorageSync('pending_orders') || []
        orders.unshift(orderData)
        wx.setStorageSync('pending_orders', orders)
        return { orderId: orderData.id }
      }
      
      const res = await this.db.collection(this.collections.orders)
        .add({ data: orderData })
      
      return { orderId: res._id }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  // 获取订单列表
  async getOrderList(filters = {}) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const pending = wx.getStorageSync('pending_orders') || []
        const completed = wx.getStorageSync('completed_orders') || []
        let orders = [...pending, ...completed]
        
        // 应用过滤
        if (filters.status) {
          orders = orders.filter(o => o.status === filters.status)
        }
        if (filters.buyerId) {
          orders = orders.filter(o => o.buyerId === filters.buyerId)
        }
        if (filters.artistId) {
          orders = orders.filter(o => o.artistId === filters.artistId)
        }
        
        return orders
      }
      
      // 构建查询条件
      const where = {}
      if (filters.status) where.status = filters.status
      if (filters.buyerId) where.buyerId = filters.buyerId
      if (filters.artistId) where.artistId = filters.artistId
      
      const res = await this.db.collection(this.collections.orders)
        .where(where)
        .orderBy('createTime', 'desc')
        .get()
      
      return res.data
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  // 更新订单状态
  async updateOrderStatus(orderId, status) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const pending = wx.getStorageSync('pending_orders') || []
        const completed = wx.getStorageSync('completed_orders') || []
        
        const order = pending.find(o => o.id === orderId) || 
                      completed.find(o => o.id === orderId)
        
        if (order) {
          order.status = status
          if (status === 'completed') {
            order.completedAt = new Date().toISOString()
          }
          
          // 更新存储
          wx.setStorageSync('pending_orders', pending)
          wx.setStorageSync('completed_orders', completed)
        }
        
        return { success: true }
      }
      
      await this.db.collection(this.collections.orders)
        .where({ orderId })
        .update({
          data: {
            status,
            updatedAt: new Date()
          }
        })
      
      return { success: true }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * ========== 商品模块 ==========
   */
  
  // 获取商品列表
  async getProductList(filters = {}) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        let products = wx.getStorageSync('mock_products') || []
        
        if (filters.artistId) {
          products = products.filter(p => p.artistId === filters.artistId)
        }
        if (filters.categoryId) {
          products = products.filter(p => p.categoryId === filters.categoryId)
        }
        
        return products
      }
      
      const where = {}
      if (filters.artistId) where.artistId = filters.artistId
      if (filters.categoryId) where.categoryId = filters.categoryId
      
      const res = await this.db.collection(this.collections.products)
        .where(where)
        .get()
      
      return res.data
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  // 保存商品
  async saveProduct(productData) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const products = wx.getStorageSync('mock_products') || []
        const index = products.findIndex(p => p.id === productData.id)
        
        if (index >= 0) {
          products[index] = productData
        } else {
          products.push(productData)
        }
        
        wx.setStorageSync('mock_products', products)
        return { success: true }
      }
      
      // 云数据库upsert
      const res = await this.db.collection(this.collections.products)
        .where({ productId: productData.id })
        .get()
      
      if (res.data.length > 0) {
        await this.db.collection(this.collections.products)
          .doc(res.data[0]._id)
          .update({ data: productData })
      } else {
        await this.db.collection(this.collections.products)
          .add({ data: productData })
      }
      
      return { success: true }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * ========== 财务模块 ==========
   */
  
  // 记录收入
  async createIncomeRecord(data) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const ledger = wx.getStorageSync('service_income_ledger') || []
        ledger.push(data)
        wx.setStorageSync('service_income_ledger', ledger)
        return { success: true }
      }
      
      await this.db.collection(this.collections.incomes)
        .add({ data })
      
      return { success: true }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  // 获取收入列表
  async getIncomeList(userId) {
    try {
      if (config.useMockData || config.emergencyFallback) {
        const ledger = wx.getStorageSync('service_income_ledger') || []
        return ledger.filter(item => item.userId === userId)
      }
      
      const res = await this.db.collection(this.collections.incomes)
        .where({ userId })
        .orderBy('createTime', 'desc')
        .get()
      
      return res.data
    } catch (error) {
      return this.handleError(error)
    }
  }
}

module.exports = new ApiService()

