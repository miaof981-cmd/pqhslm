Page({
  data: {
    loading: true,
    artistId: '',
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
    if (options.id) {
      this.setData({ artistId: options.id })
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
      
      // 从本地存储读取画师申请信息
      const allApplications = wx.getStorageSync('artist_applications') || []
      const artistApp = allApplications.find(app => app.userId == artistId && app.status === 'approved')
      
      if (!artistApp) {
        wx.showToast({ title: '画师不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
      
      // 获取画师的头像和昵称
      let avatar = ''
      let name = artistApp.name
      
      // 如果是当前用户，读取微信头像
      if (artistId == wx.getStorageSync('userId')) {
        const wxUserInfo = wx.getStorageSync('wxUserInfo') || {}
        avatar = wxUserInfo.avatarUrl || ''
        name = wxUserInfo.nickName || artistApp.name
      }
      
      // 读取商品和订单数据
      const allProducts = wx.getStorageSync('mock_products') || []
      const allOrders = wx.getStorageSync('mock_orders') || []
      
      // 统计画师数据
      const artistProducts = allProducts.filter(p => p.artistId == artistId)
      const artistOrders = allOrders.filter(o => o.artistId == artistId)
      const completedOrders = artistOrders.filter(o => o.status === 'completed')
      
      // 计算评分（根据完成订单数量）
      let rating = 0
      if (completedOrders.length > 0) {
        rating = (4.5 + Math.min(completedOrders.length / 100, 0.5)).toFixed(1)
      }
      
      const artist = {
        _id: artistId,
        name: name,
        avatar: avatar || '/assets/default-avatar.png',
        intro: artistApp.intro || '暂无简介',
        productCount: artistProducts.length,
        orderCount: artistOrders.length,
        rating: parseFloat(rating),
        fans: 0,
        isFollowed: false
      }

      this.setData({ artist: artist })
    } catch (error) {
      console.error('加载画师信息失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载作品列表
  async loadProducts() {
    try {
      const artistId = this.data.artistId
      const allProducts = wx.getStorageSync('mock_products') || []
      const allOrders = wx.getStorageSync('mock_orders') || []
      
      // 筛选该画师的商品
      const artistProducts = allProducts.filter(p => p.artistId == artistId)
      
      // 统计每个商品的销量
      const products = artistProducts.map(product => {
        const productOrders = allOrders.filter(o => o.productId == product.id && o.status === 'completed')
        return {
          _id: product.id,
          name: product.name,
          image: product.images && product.images.length > 0 ? product.images[0] : '/assets/default-product.png',
          price: product.basePrice ? product.basePrice.toFixed(2) : '0.00',
          sales: productOrders.length
        }
      })

      this.setData({ products: products })
    } catch (error) {
      console.error('加载作品失败', error)
    }
  },

  // 加载业绩数据
  async loadPerformance() {
    try {
      const artistId = this.data.artistId
      const allOrders = wx.getStorageSync('mock_orders') || []
      
      // 筛选该画师的订单
      const artistOrders = allOrders.filter(o => o.artistId == artistId)
      const completedOrders = artistOrders.filter(o => o.status === 'completed')
      
      // 计算本月订单（简化：取最近30天）
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const monthOrders = artistOrders.filter(o => {
        const orderDate = new Date(o.createTime)
        return orderDate >= thirtyDaysAgo
      })
      
      // 计算本月收入
      const monthRevenue = monthOrders.filter(o => o.status === 'completed').reduce((sum, o) => {
        return sum + (parseFloat(o.totalPrice) || 0)
      }, 0)
      
      // 计算总收入
      const totalRevenue = completedOrders.reduce((sum, o) => {
        return sum + (parseFloat(o.totalPrice) || 0)
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
      console.error('加载业绩失败', error)
    }
  },

  // 加载评价列表
  async loadReviews() {
    try {
      const mockReviews = [
        {
          _id: '1',
          userName: '用户A',
          userAvatar: 'https://via.placeholder.com/50',
          rating: 5,
          content: '画师非常专业，画风很符合我的要求，沟通也很顺畅，强烈推荐！',
          images: ['https://via.placeholder.com/200', 'https://via.placeholder.com/200'],
          createTime: '2024-01-20'
        },
        {
          _id: '2',
          userName: '用户B',
          userAvatar: 'https://via.placeholder.com/50',
          rating: 5,
          content: '超级满意，画得太好了！而且交稿很及时，五星好评！',
          images: [],
          createTime: '2024-01-18'
        },
        {
          _id: '3',
          userName: '用户C',
          userAvatar: 'https://via.placeholder.com/50',
          rating: 4,
          content: '整体不错，就是修改了两次，不过最后效果很好。',
          images: ['https://via.placeholder.com/200'],
          createTime: '2024-01-15'
        }
      ]

      this.setData({ reviews: mockReviews })
    } catch (error) {
      console.error('加载评价失败', error)
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

  // 联系画师
  contactArtist() {
    wx.showToast({ title: '请通过客服联系画师', icon: 'none' })
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

  // 分享
  onShareAppMessage() {
    return {
      title: `推荐画师：${this.data.artist.name}`,
      path: `/pages/artist-detail/index?id=${this.data.artistId}`
    }
  }
})
