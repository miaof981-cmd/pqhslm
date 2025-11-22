const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')
const orderHelper = require('../../utils/order-helper.js')
const orderStatusUtil = require('../../utils/order-status.js')
const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')

/**
 * 🔧 iOS兼容的日期解析函数
 */
const parseDate = orderStatusUtil.parseDate

Page({
  data: {
    loading: true,
    artistId: '',
    isAdmin: false,
    currentTab: 'products',
    tabs: [
      { label: '作品', value: 'products' },
      { label: '业绩', value: 'performance' },
      { label: '评价', value: 'reviews' }
    ],
    artist: null,
    products: [],
    performance: null,
    reviews: []
  },

  onLoad(options) {
    if (options.isAdmin === 'true') {
      this.setData({ isAdmin: true })
    }
    
    if (options.id || options.artistId) {
      this.setData({ artistId: options.id || options.artistId })
      this.loadArtistInfo()
      this.loadProducts()
    } else {
      wx.showToast({ title: '画师ID不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // 加载画师信息
  async loadArtistInfo() {
    this.setData({ loading: true })
    
    try {
      const artistId = this.data.artistId
      const currentUserId = app.globalData.userId
      
      // ✅ 从云端获取画师申请信息
      const appsRes = await cloudAPI.getArtistApplicationList({})
      // 🛡️ 安全数组解析
      const allApplications = cloudAPI.safeArray(appsRes)
      const artistApp = allApplications.find(app => app.userId == artistId && app.status === 'approved')
      
      // 构建用户信息（优先从申请记录）
      let userInfo = null
      if (artistApp) {
        userInfo = {
          id: artistApp.userId,
          userId: artistApp.userId,
          nickName: artistApp.nickName || artistApp.name,
          avatarUrl: artistApp.avatarUrl || artistApp.avatar
        }
      }
      
      // 如果是当前登录用户，从全局数据读取
      const wxUserInfo = app.globalData.userInfo || {}
      if (artistId == currentUserId && wxUserInfo.nickName) {
        userInfo = {
          id: currentUserId,
          userId: currentUserId,
          nickName: wxUserInfo.nickName,
          avatarUrl: wxUserInfo.avatarUrl
        }
      }
      
      if (!userInfo && !artistApp) {
        wx.showToast({ title: '画师信息不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
      
      // 获取画师的头像和昵称
      let avatar = userInfo ? (userInfo.avatarUrl || '') : (artistApp ? (artistApp.avatarUrl || artistApp.avatar) : '')
      let name = userInfo ? (userInfo.nickName || userInfo.name) : (artistApp ? (artistApp.nickName || artistApp.name) : '画师')
      let intro = artistApp ? artistApp.selfIntro : ''
      
      // 兼容：如果当前登录用户就是画师，优先从全局读取
      if (artistId == currentUserId && wxUserInfo.avatarUrl) {
        avatar = wxUserInfo.avatarUrl
        name = wxUserInfo.nickName || name
      }
      
      console.log('🎨 画师头像读取（云端版）:', { artistId, avatar, name, hasApp: !!artistApp })
      
      // ✅ 从云端读取商品和订单数据
      const [productsRes, ordersRes] = await Promise.all([
        cloudAPI.getProductList({ artistId }),
        cloudAPI.getOrderList({ artistId })
      ])
      
      // 🛡️ 安全数组解析
      const artistProducts = cloudAPI.safeArray(productsRes)
      const artistOrders = cloudAPI.safeArray(ordersRes)
      const completedOrders = artistOrders.filter(o => o.status === 'completed')
      
      // 计算成交额
      const totalRevenue = completedOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.totalPrice || order.total_price) || parseFloat(order.price) || 0)
      }, 0)
      
      const artist = {
        _id: artistId,
        name: name,
        avatar: avatar || '/assets/default-avatar.png',
        intro: intro || '暂无简介',
        productCount: artistProducts.length,
        orderCount: artistOrders.length,
        totalRevenue: totalRevenue.toFixed(2)
      }

      this.setData({ artist: artist })
    } catch (error) {
      console.error('❌ 加载画师信息失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载作品列表
  async loadProducts() {
    try {
      const artistId = this.data.artistId
      
      // ✅ 从云端读取商品和订单
      const [productsRes, ordersRes] = await Promise.all([
        cloudAPI.getProductList({ artistId }),
        cloudAPI.getOrderList({ artistId })
      ])
      
      // 🛡️ 安全数组解析
      const artistProducts = cloudAPI.safeArray(productsRes)
      const allOrders = cloudAPI.safeArray(ordersRes)
      
      // 统计每个商品的销量
      const products = artistProducts.map(product => {
        const productId = product._id || product.id
        const productOrders = allOrders.filter(o => (o.productId || o.product_id) == productId && o.status === 'completed')
        const images = product.images || []
        const productImage = product.productImage || product.product_image
        const coverImage = ensureRenderableImage(
          Array.isArray(images) && images.length > 0 ? images[0] : productImage,
          { namespace: 'product-cover', fallback: DEFAULT_PLACEHOLDER }
        )
        return {
          _id: productId,
          name: product.name,
          coverImage,
          price: product.basePrice || product.base_price ? parseFloat(product.basePrice || product.base_price).toFixed(2) : '0.00',
          sales: productOrders.length
        }
      })

      this.setData({ products: products })
    } catch (error) {
      console.error('❌ 加载作品失败', error)
    }
  },

  // 加载业绩数据
  async loadPerformance() {
    try {
      const artistId = this.data.artistId
      
      // ✅ 从云端读取订单
      const ordersRes = await cloudAPI.getOrderList({ artistId })
      // 🛡️ 安全数组解析
      const artistOrders = cloudAPI.safeArray(ordersRes)
      const completedOrders = artistOrders.filter(o => o.status === 'completed')
      
      // 计算本月订单（最近30天）
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const monthOrders = artistOrders.filter(o => {
        const orderDate = parseDate(o.createTime || o.create_time)
        return orderDate >= thirtyDaysAgo
      })
      
      // 计算本月收入
      const monthRevenue = monthOrders.filter(o => o.status === 'completed').reduce((sum, o) => {
        return sum + (parseFloat(o.totalPrice || o.total_price) || 0)
      }, 0)
      
      // 计算总收入
      const totalRevenue = completedOrders.reduce((sum, o) => {
        return sum + (parseFloat(o.totalPrice || o.total_price) || 0)
      }, 0)
      
      // 计算完成率
      const completeRate = artistOrders.length > 0 ? (completedOrders.length / artistOrders.length * 100).toFixed(1) : 0
      
      const performance = {
        monthOrders: monthOrders.length,
        monthRevenue: monthRevenue.toFixed(2),
        completeRate: parseFloat(completeRate),
        totalOrders: artistOrders.length,
        totalRevenue: totalRevenue.toFixed(2),
        goodRate: completedOrders.length > 0 ? 95.0 : 0
      }

      this.setData({ performance: performance })
    } catch (error) {
      console.error('❌ 加载业绩失败', error)
    }
  },

  // 加载评价列表（关联买家秀）
  async loadReviews() {
    try {
      const artistId = this.data.artistId
      
      // ✅ 从云端读取买家秀和订单
      const [postsRes, ordersRes] = await Promise.all([
        cloudAPI.getBuyerShowList({}),
        cloudAPI.getOrderList({ artistId })
      ])
      
      // 🛡️ 安全数组解析
      const allPosts = cloudAPI.safeArray(postsRes)
      const artistOrders = cloudAPI.safeArray(ordersRes)
      
      // 找出该画师的订单ID
      const artistOrderIds = artistOrders.map(o => String(o._id || o.id))
      
      // 找出这些订单的买家秀
      const artistReviews = allPosts
        .filter(post => {
          return artistOrderIds.includes(String(post.orderId || post.order_id))
        })
        .map(post => {
          // 从post中获取用户信息（买家秀应该包含发布者信息）
          return {
            _id: post._id || post.id,
            userName: post.userName || post.user_name || '用户',
            userAvatar: post.userAvatar || post.user_avatar || '/assets/default-avatar.png',
            rating: post.rating || 5,
            content: post.comment || post.content || '买家暂无评价',
            images: post.images || [],
            createTime: this.formatTime(post.createdAt || post.created_at || post.publishTime || post.publish_time),
            orderId: post.orderId || post.order_id
          }
        })
      
      console.log('🎨 画师评价（买家秀 - 云端版）:', artistReviews.length, '条')
      this.setData({ reviews: artistReviews })
    } catch (error) {
      console.error('❌ 加载评价失败', error)
      this.setData({ reviews: [] })
    }
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })

    if (tab === 'performance' && !this.data.performance) {
      this.loadPerformance()
    } else if (tab === 'reviews' && this.data.reviews.length === 0) {
      this.loadReviews()
    }
  },

  // 关注/取消关注
  toggleFollow() {
    const isFollowed = !this.data.artist.isFollowed
    this.setData({
      'artist.isFollowed': isFollowed
    })
    wx.showToast({
      title: isFollowed ? '关注成功' : '已取消关注',
      icon: 'success'
    })
  },

  // 联系画师（显示画师联系方式）
  async contactArtist() {
    const artistId = this.data.artistId
    
    try {
      // ✅ 从云端读取画师申请信息
      const res = await cloudAPI.getArtistApplicationList({})
      // 🛡️ 安全数组解析
      const allApplications = cloudAPI.safeArray(res)
      const artistApp = allApplications.find(app => app.userId == artistId && app.status === 'approved')
      
      if (!artistApp) {
        wx.showToast({ title: '画师信息不存在', icon: 'none' })
        return
      }
      
      // 构建联系信息
      let content = `画师：${artistApp.name}\n`
      if (artistApp.phone) content += `电话：${artistApp.phone}\n`
      if (artistApp.wechat) content += `微信：${artistApp.wechat}\n`
      if (artistApp.email) content += `邮箱：${artistApp.email}\n`
      
      // 如果没有任何联系方式
      if (!artistApp.phone && !artistApp.wechat && !artistApp.email) {
        content += '\n该画师暂未填写联系方式\n请通过平台客服联系'
      }
      
      wx.showModal({
        title: '画师联系方式',
        content: content,
        showCancel: true,
        cancelText: '关闭',
        confirmText: '复制微信',
        success: (res) => {
          if (res.confirm && artistApp.wechat) {
            wx.setClipboardData({
              data: artistApp.wechat,
              success: () => {
                wx.showToast({ title: '已复制微信号', icon: 'success' })
              }
            })
          }
        }
      })
    } catch (err) {
      console.error('❌ 获取画师联系方式失败:', err)
      wx.showToast({ title: '获取联系方式失败', icon: 'none' })
    }
  },

  // 查看作品
  viewProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${id}`
    })
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: urls
    })
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = parseDate(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `推荐画师：${this.data.artist.name}`,
      path: `/pages/artist-detail/index?id=${this.data.artistId}`
    }
  }
})
