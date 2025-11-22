/**
 * ⚠️ API统一封装层（已废弃Mock降级逻辑）
 * 
 * 重要变更：
 * 1. 已移除所有 useMockData 降级逻辑
 * 2. 已移除所有 wx.getStorageSync/setStorageSync
 * 3. 统一使用云数据库
 * 
 * 建议：新功能请使用 cloud-api.js（云函数封装）
 */
const config = require('../config/env')
const db = wx.cloud.database()
const _ = db.command

class ApiService {
  constructor() {
    this.db = db
    this.collections = config.collections
    
    // ✅ 启动时检查Mock模式
    if (config.useMockData) {
      console.error('[API ERROR] Mock模式已禁用，请切换 config/env.js 到生产模式')
      throw new Error('Mock模式已禁用')
    }
  }
  
  /**
   * 统一错误处理
   */
  handleError(error, showToast = true) {
    console.error('[API ERROR]', error)
    
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
  
  // 获取用户信息（纯云端）
  async getUserInfo(userId) {
    try {
      const res = await this.db.collection(this.collections.users)
        .where({ userId })
        .get()
      
      return res.data[0] || null
    } catch (error) {
      return this.handleError(error, false)
    }
  }
  
  // 创建/更新用户（纯云端）
  async saveUserInfo(userData) {
    try {
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
  
  // 创建订单（纯云端）
  async createOrder(orderData) {
    try {
      const res = await this.db.collection(this.collections.orders)
        .add({ data: orderData })
      
      return { orderId: res._id }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  // 获取订单列表（纯云端）
  async getOrderList(filters = {}) {
    try {
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
  
  // 更新订单状态（纯云端）
  async updateOrderStatus(orderId, status) {
    try {
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
  
  // 获取商品列表（纯云端）
  async getProductList(filters = {}) {
    try {
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
  
  // 保存商品（纯云端）
  async saveProduct(productData) {
    try {
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
  
  // 记录收入（纯云端）
  async createIncomeRecord(data) {
    try {
      await this.db.collection(this.collections.incomes)
        .add({ data })
      
      return { success: true }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  // 获取收入列表（纯云端）
  async getIncomeList(userId) {
    try {
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

