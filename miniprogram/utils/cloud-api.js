/**
 * 云函数API封装层
 * 将前端所有本地存储操作迁移到云函数调用
 */

class CloudAPI {
  constructor() {
    this.cloudEnabled = true // 云函数开关
  }

  /**
   * 统一错误处理
   */
  handleError(error, context = '') {
    console.error(`[CloudAPI${context}] 错误:`, error)
    
    return {
      success: false,
      error: error.errMsg || error.message || '操作失败',
      data: null
    }
  }

  /**
   * 🛡️ 安全数组解析
   * 统一处理云函数返回的数据，确保返回的是数组
   * 支持两种返回格式：
   * 1. { success: true, data: [...] }
   * 2. { success: true, data: { list: [...], total: 10 } }
   */
  safeArrayParse(res) {
    if (!res || !res.success) {
      return []
    }
    
    // 如果 data 本身就是数组，直接返回
    if (Array.isArray(res.data)) {
      return res.data
    }
    
    // 如果 data 是对象且包含 list 字段（分页数据）
    if (res.data && typeof res.data === 'object' && Array.isArray(res.data.list)) {
      return res.data.list
    }
    
    // 其他情况返回空数组
    return []
  }

  /**
   * 调用云函数的统一方法
   */
  async callFunction(name, data) {
    // ✅ 请求日志
    console.log('[API CALL]', name, data)
    const startTime = Date.now()
    
    try {
      const res = await wx.cloud.callFunction({
        name,
        data
      })
      
      const duration = Date.now() - startTime
      
      if (res.result) {
        // ✅ 成功日志
        console.log('[API RESULT]', name, {
          duration: `${duration}ms`,
          success: res.result.success,
          dataSize: JSON.stringify(res.result).length,
          preview: res.result
        })
        return res.result
      }
      
      // ✅ 异常结果日志
      console.warn('[API WARNING]', name, '云函数返回结果异常', res)
      return { success: false, message: '云函数返回结果异常' }
    } catch (error) {
      const duration = Date.now() - startTime
      
      // ✅ 错误日志
      console.error('[API ERROR]', name, {
        duration: `${duration}ms`,
        error: error.errMsg || error.message,
        code: error.errCode,
        details: error
      })
      
      return this.handleError(error, ` - ${name}`)
    }
  }

  // ==================== 用户模块 ====================

  /**
   * 用户登录/注册
   */
  async login(nickName, avatarUrl) {
    return await this.callFunction('userManager', {
      action: 'login',
      nickName,
      avatarUrl
    })
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId = null) {
    return await this.callFunction('userManager', {
      action: 'getUserInfo',
      userId
    })
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(data) {
    return await this.callFunction('userManager', {
      action: 'updateUserInfo',
      ...data
    })
  }

  /**
   * 检查管理员权限
   */
  async checkAdmin() {
    return await this.callFunction('userManager', {
      action: 'checkAdmin'
    })
  }

  // ==================== 商品模块 ====================

  /**
   * 获取商品列表
   */
  async getProductList(params = {}) {
    return await this.callFunction('productManager', {
      action: 'getList',
      page: params.page || 1,
      pageSize: params.pageSize || 100,
      category: params.category,
      artistId: params.artistId,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      deliveryDaysMax: params.deliveryDaysMax,
      sortBy: params.sortBy || 'createTime',
      sortOrder: params.sortOrder || 'desc'
    })
  }

  /**
   * 获取商品详情
   */
  async getProductDetail(productId) {
    return await this.callFunction('productManager', {
      action: 'getDetail',
      productId
    })
  }

  /**
   * 搜索商品
   */
  async searchProducts(keyword, page = 1, pageSize = 20) {
    return await this.callFunction('productManager', {
      action: 'search',
      keyword,
      page,
      pageSize
    })
  }

  /**
   * 创建商品
   */
  async createProduct(productData) {
    return await this.callFunction('productManager', {
      action: 'create',
      ...productData
    })
  }

  /**
   * 更新商品
   */
  async updateProduct(productId, updateData) {
    return await this.callFunction('productManager', {
      action: 'update',
      productId,
      ...updateData
    })
  }

  /**
   * 删除商品
   */
  async deleteProduct(productId) {
    return await this.callFunction('productManager', {
      action: 'delete',
      productId
    })
  }

  // ==================== 订单模块 ====================

  /**
   * 创建订单
   */
  async createOrder(orderData) {
    return await this.callFunction('orderManager', {
      action: 'create',
      ...orderData
    })
  }

  /**
   * 获取订单列表
   */
  async getOrderList(params = {}) {
    return await this.callFunction('orderManager', {
      action: 'getList',
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      status: params.status,
      role: params.role // buyer, artist, service, admin
    })
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(orderId) {
    return await this.callFunction('orderManager', {
      action: 'getDetail',
      orderId
    })
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(orderId, status, visualStatus) {
    return await this.callFunction('orderManager', {
      action: 'updateStatus',
      orderId,
      status,
      visualStatus
    })
  }

  /**
   * 更新订单信息
   */
  async updateOrderInfo(orderId, updateData) {
    return await this.callFunction('orderManager', {
      action: 'updateInfo',
      orderId,
      ...updateData
    })
  }

  // ==================== 画师申请模块 ====================

  /**
   * 获取画师申请列表
   * @param {Object} options - 查询选项
   * @param {string} options.userId - 用户ID（可选，不传则返回所有申请）
   * @param {string} options.status - 申请状态（可选，不传则返回所有状态）
   */
  async getArtistApplications(options = {}) {
    return await this.callFunction('artistManager', {
      action: 'getApplications',
      ...options
    })
  }

  /**
   * 提交画师申请
   */
  async applyArtist(applicationData) {
    return await this.callFunction('artistManager', {
      action: 'apply',
      ...applicationData
    })
  }

  /**
   * 获取申请状态
   */
  async getArtistApplicationStatus() {
    return await this.callFunction('artistManager', {
      action: 'getStatus'
    })
  }

  /**
   * 批准画师申请
   */
  async approveArtistApplication(userId) {
    return await this.callFunction('artistManager', {
      action: 'approve',
      userId
    })
  }

  /**
   * 拒绝画师申请
   */
  async rejectArtistApplication(userId, reason) {
    return await this.callFunction('artistManager', {
      action: 'reject',
      userId,
      reason
    })
  }

  /**
   * 获取申请列表（管理员）
   */
  async getArtistApplicationList(params = {}) {
    return await this.callFunction('artistManager', {
      action: 'getList',
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      status: params.status
    })
  }

  /**
   * 更新画师申请状态（通过/驳回）
   */
  async updateArtistApplicationStatus(applicationId, status, rejectReason = '') {
    return await this.callFunction('artistManager', {
      action: 'updateStatus',
      applicationId,
      status,
      rejectReason
    })
  }

  /**
   * 创建画师档案
   */
  async createArtistProfile(profileData) {
    return await this.callFunction('artistManager', {
      action: 'createProfile',
      ...profileData
    })
  }

  /**
   * 获取画师档案
   */
  async getArtistProfile(userId = null) {
    return await this.callFunction('artistManager', {
      action: 'getProfile',
      userId
    })
  }

  /**
   * 更新画师档案
   */
  async updateArtistProfile(userId, updateData) {
    return await this.callFunction('artistManager', {
      action: 'updateProfile',
      userId,
      ...updateData
    })
  }


  // ==================== 财务模块 ====================

  /**
   * 获取收入明细
   */
  async getIncome(params = {}) {
    return await this.callFunction('financeManager', {
      action: 'getIncome',
      userId: params.userId,
      page: params.page || 1,
      pageSize: params.pageSize || 20
    })
  }

  /**
   * 创建提现申请
   */
  async createWithdraw(amount, accountInfo) {
    return await this.callFunction('financeManager', {
      action: 'createWithdraw',
      amount,
      accountInfo
    })
  }

  /**
   * 获取提现列表
   */
  async getWithdrawList(params = {}) {
    return await this.callFunction('financeManager', {
      action: 'getWithdrawList',
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      userId: params.userId,
      status: params.status
    })
  }

  /**
   * 批准提现
   */
  async approveWithdraw(withdrawId) {
    return await this.callFunction('financeManager', {
      action: 'approveWithdraw',
      withdrawId
    })
  }

  /**
   * 拒绝提现
   */
  async rejectWithdraw(withdrawId, reason) {
    return await this.callFunction('financeManager', {
      action: 'rejectWithdraw',
      withdrawId,
      reason
    })
  }

  /**
   * 获取打赏记录
   */
  async getRewardList(params = {}) {
    return await this.callFunction('financeManager', {
      action: 'getRewardList',
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      userId: params.userId
    })
  }

  /**
   * 创建打赏记录
   */
  async createReward(data) {
    return await this.callFunction('financeManager', {
      action: 'createReward',
      ...data
    })
  }

  // ==================== 短信验证码模块 ====================

  /**
   * 发送验证码
   */
  async sendVerificationCode(phone) {
    return await this.callFunction('smsManager', {
      action: 'sendCode',
      phone
    })
  }

  /**
   * 验证验证码
   */
  async verifyCode(phone, code) {
    return await this.callFunction('smsManager', {
      action: 'verifyCode',
      phone,
      code
    })
  }

  // ==================== 画师申请模块 ====================

  /**
   * 提交画师申请
   */
  async submitArtistApplication(data) {
    return await this.callFunction('artistManager', {
      action: 'apply',
      ...data
    })
  }

  /**
   * 获取申请状态
   */
  async getApplicationStatus(data) {
    return await this.callFunction('artistManager', {
      action: 'getStatus',
      ...data
    })
  }

  /**
   * 审批画师申请
   */
  async approveApplication(applicationId) {
    return await this.callFunction('artistManager', {
      action: 'approve',
      applicationId
    })
  }

  /**
   * 拒绝画师申请
   */
  async rejectApplication(applicationId, reason) {
    return await this.callFunction('artistManager', {
      action: 'reject',
      applicationId,
      reason
    })
  }

  // ==================== 内容管理模块 ====================

  /**
   * 获取轮播图列表
   */
  async getBannerList() {
    return await this.callFunction('contentManager', {
      module: 'banner',
      action: 'getList'
    })
  }

  /**
   * 创建轮播图
   */
  async createBanner(bannerData) {
    return await this.callFunction('contentManager', {
      module: 'banner',
      action: 'create',
      ...bannerData
    })
  }

  /**
   * 更新轮播图
   */
  async updateBanner(bannerId, updateData) {
    return await this.callFunction('contentManager', {
      module: 'banner',
      action: 'update',
      bannerId,
      ...updateData
    })
  }

  /**
   * 删除轮播图
   */
  async deleteBanner(bannerId) {
    return await this.callFunction('contentManager', {
      module: 'banner',
      action: 'delete',
      bannerId
    })
  }

  /**
   * 获取公告列表
   */
  async getNoticeList() {
    return await this.callFunction('contentManager', {
      module: 'notice',
      action: 'getList'
    })
  }

  /**
   * 获取公告详情
   */
  async getNoticeDetail(noticeId) {
    return await this.callFunction('contentManager', {
      module: 'notice',
      action: 'getDetail',
      noticeId
    })
  }

  /**
   * 创建公告
   */
  async createNotice(noticeData) {
    return await this.callFunction('contentManager', {
      module: 'notice',
      action: 'create',
      ...noticeData
    })
  }

  /**
   * 更新公告
   */
  async updateNotice(noticeId, updateData) {
    return await this.callFunction('contentManager', {
      module: 'notice',
      action: 'update',
      noticeId,
      ...updateData
    })
  }

  /**
   * 删除公告
   */
  async deleteNotice(noticeId) {
    return await this.callFunction('contentManager', {
      module: 'notice',
      action: 'delete',
      noticeId
    })
  }

  /**
   * 获取客服二维码列表
   */
  async getServiceQRCodeList() {
    return await this.callFunction('contentManager', {
      module: 'serviceQRCode',
      action: 'getList'
    })
  }

  /**
   * 随机获取客服二维码
   */
  async getRandomServiceQRCode() {
    return await this.callFunction('contentManager', {
      module: 'serviceQRCode',
      action: 'getRandom'
    })
  }

  /**
   * 创建客服二维码
   */
  async createServiceQRCode(qrcodeData) {
    return await this.callFunction('contentManager', {
      module: 'serviceQRCode',
      action: 'create',
      ...qrcodeData
    })
  }

  /**
   * 更新客服二维码
   */
  async updateServiceQRCode(qrcodeId, updateData) {
    return await this.callFunction('contentManager', {
      module: 'serviceQRCode',
      action: 'update',
      qrcodeId,
      ...updateData
    })
  }

  /**
   * 删除客服二维码
   */
  async deleteServiceQRCode(qrcodeId) {
    return await this.callFunction('contentManager', {
      module: 'serviceQRCode',
      action: 'delete',
      qrcodeId
    })
  }

  /**
   * 获取买家秀列表
   */
  async getBuyerShowList(params = {}) {
    return await this.callFunction('contentManager', {
      module: 'buyerShow',
      action: 'getList',
      page: params.page || 1,
      pageSize: params.pageSize || 20
    })
  }

  /**
   * 发布买家秀
   */
  async createBuyerShow(showData) {
    return await this.callFunction('contentManager', {
      module: 'buyerShow',
      action: 'create',
      ...showData
    })
  }

  /**
   * 删除买家秀
   */
  async deleteBuyerShow(showId) {
    return await this.callFunction('contentManager', {
      module: 'buyerShow',
      action: 'delete',
      showId
    })
  }

  /**
   * 获取分类列表
   */
  async getCategoryList() {
    return await this.callFunction('contentManager', {
      module: 'category',
      action: 'getList'
    })
  }

  /**
   * 创建分类
   */
  async createCategory(categoryData) {
    return await this.callFunction('contentManager', {
      module: 'category',
      action: 'create',
      ...categoryData
    })
  }

  /**
   * 更新分类
   */
  async updateCategory(categoryId, updateData) {
    return await this.callFunction('contentManager', {
      module: 'category',
      action: 'update',
      categoryId,
      ...updateData
    })
  }

  /**
   * 删除分类
   */
  async deleteCategory(categoryId) {
    return await this.callFunction('contentManager', {
      module: 'category',
      action: 'delete',
      categoryId
    })
  }

  // ==================== 客服模块 ====================

  /**
   * 添加客服
   */
  async addService(serviceData) {
    return await this.callFunction('serviceManager', {
      action: 'addService',
      ...serviceData
    })
  }

  /**
   * 获取客服列表
   */
  async getServiceList(isActiveOnly = false) {
    return await this.callFunction('serviceManager', {
      action: 'getServiceList',
      isActiveOnly
    })
  }

  /**
   * 更新客服信息
   */
  async updateService(userId, updateData) {
    return await this.callFunction('serviceManager', {
      action: 'updateService',
      userId,
      ...updateData
    })
  }

  /**
   * 切换客服在线状态
   */
  async toggleServiceStatus(userId, isActive) {
    return await this.callFunction('serviceManager', {
      action: 'toggleServiceStatus',
      userId,
      isActive
    })
  }

  /**
   * 删除客服
   */
  async deleteService(userId) {
    return await this.callFunction('serviceManager', {
      action: 'deleteService',
      userId
    })
  }

  // ==================== 统计模块 ====================

  /**
   * 获取仪表盘数据
   */
  async getDashboard() {
    return await this.callFunction('statsManager', {
      action: 'dashboard'
    })
  }

  /**
   * 获取画师业绩
   */
  async getArtistPerformance(params = {}) {
    return await this.callFunction('statsManager', {
      action: 'artistPerformance',
      artistId: params.artistId,
      startDate: params.startDate,
      endDate: params.endDate
    })
  }

  /**
   * 获取订单统计
   */
  async getOrderStats(params = {}) {
    return await this.callFunction('statsManager', {
      action: 'orderStats',
      startDate: params.startDate,
      endDate: params.endDate,
      groupBy: params.groupBy || 'day'
    })
  }

  /**
   * 获取用户统计
   */
  async getUserStats() {
    return await this.callFunction('statsManager', {
      action: 'userStats'
    })
  }

  // ==================== 实名认证模块 ====================
  
  /**
   * 提交实名认证
   */
  async submitIdentityVerify(data) {
    return await this.callFunction('userManager', {
      action: 'submitIdentityVerify',
      userId: data.userId,
      realName: data.realName,
      idCard: data.idCard,
      phoneNumber: data.phoneNumber,
      bankName: data.bankName,
      bankCard: data.bankCard,
      bankBranch: data.bankBranch
    })
  }

  /**
   * 获取实名认证记录
   */
  async getIdentityVerifyRecords(userId = null) {
    return await this.callFunction('userManager', {
      action: 'getIdentityVerifyRecords',
      userId
    })
  }

  /**
   * 更新实名认证状态
   */
  async updateIdentityVerifyStatus(verifyId, status, reason = '') {
    return await this.callFunction('userManager', {
      action: 'updateIdentityVerifyStatus',
      verifyId,
      status,
      reason
    })
  }

  // ==================== 系统设置模块 ====================
  
  /**
   * 获取系统设置
   */
  async getSystemSettings() {
    return await this.callFunction('systemManager', {
      action: 'getSystemSettings'
    })
  }

  /**
   * 更新系统设置
   */
  async updateSystemSettings(settings) {
    return await this.callFunction('systemManager', {
      action: 'updateSystemSettings',
      settings
    })
  }

  // ==================== 购物车模块 ====================

  /**
   * 获取购物车列表
   * @param {Object} options - 查询选项
   * @param {string} options.userId - 用户ID（可选，不传则使用当前用户）
   */
  async getCartList(options = {}) {
    return await this.callFunction('cartManager', {
      action: 'getList',
      ...options
    })
  }

  /**
   * 添加商品到购物车
   * @param {Object} cartItem - 购物车项数据
   */
  async addToCart(cartItem) {
    return await this.callFunction('cartManager', {
      action: 'add',
      cartItem
    })
  }

  /**
   * 更新购物车项
   * @param {string} cartItemId - 购物车项ID
   * @param {Object} updates - 更新内容
   */
  async updateCartItem(cartItemId, updates) {
    return await this.callFunction('cartManager', {
      action: 'update',
      cartItemId,
      updates
    })
  }

  /**
   * 删除购物车项
   * @param {string} cartItemId - 购物车项ID
   */
  async removeFromCart(cartItemId) {
    return await this.callFunction('cartManager', {
      action: 'remove',
      cartItemId
    })
  }

  /**
   * 批量删除购物车项
   * @param {Array<string>} cartItemIds - 购物车项ID数组
   */
  async batchRemoveFromCart(cartItemIds) {
    return await this.callFunction('cartManager', {
      action: 'batchRemove',
      cartItemIds
    })
  }

  /**
   * 清空购物车
   * @param {string} userId - 用户ID（可选）
   */
  async clearCart(userId = null) {
    return await this.callFunction('cartManager', {
      action: 'clear',
      userId
    })
  }

  // ==================== 云存储模块 ====================

  /**
   * 上传文件到云存储
   * @param {string} filePath - 本地文件路径
   * @param {string} cloudPath - 云存储路径（可选）
   * @returns {Promise<{success: boolean, fileID?: string, message?: string}>}
   */
  async uploadFile(filePath, cloudPath) {
    try {
      // 如果没有指定云路径，自动生成
      if (!cloudPath) {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const ext = filePath.split('.').pop() || 'jpg'
        cloudPath = `uploads/${timestamp}_${random}.${ext}`
      }

      const result = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })

      console.log('✅ 文件上传成功:', result.fileID)
      
      return {
        success: true,
        fileID: result.fileID,
        cloudPath: cloudPath
      }
    } catch (error) {
      console.error('❌ 文件上传失败:', error)
      return {
        success: false,
        message: error.errMsg || '上传失败'
      }
    }
  }

  /**
   * 删除云存储文件
   * @param {string[]} fileIDs - 文件ID数组
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async deleteFiles(fileIDs) {
    try {
      const result = await wx.cloud.deleteFile({
        fileList: fileIDs
      })

      console.log('✅ 文件删除成功:', result)
      
      return {
        success: true,
        data: result.fileList
      }
    } catch (error) {
      console.error('❌ 文件删除失败:', error)
      return {
        success: false,
        message: error.errMsg || '删除失败'
      }
    }
  }
}

// 创建单例
const cloudAPI = new CloudAPI()

// 导出全局安全解析函数
cloudAPI.safeArray = (res) => cloudAPI.safeArrayParse(res)

module.exports = cloudAPI

