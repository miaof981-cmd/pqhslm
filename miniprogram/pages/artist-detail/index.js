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
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockArtist = {
        _id: this.data.artistId,
        name: '画师小A',
        avatar: 'https://via.placeholder.com/200',
        level: 'S',
        intro: '专业插画师，擅长日系、古风、Q版等多种风格，5年从业经验',
        productCount: 28,
        orderCount: 156,
        rating: 4.9,
        fans: 1234,
        isFollowed: false
      }

      this.setData({ artist: mockArtist })
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
      const mockProducts = [
        { _id: '1', name: '精美头像设计', image: 'https://via.placeholder.com/300', price: '88.00', sales: 45 },
        { _id: '2', name: '创意插画', image: 'https://via.placeholder.com/300', price: '168.00', sales: 32 },
        { _id: '3', name: 'Q版人物', image: 'https://via.placeholder.com/300', price: '128.00', sales: 28 },
        { _id: '4', name: '古风美人', image: 'https://via.placeholder.com/300', price: '198.00', sales: 21 },
        { _id: '5', name: '表情包设计', image: 'https://via.placeholder.com/300', price: '58.00', sales: 67 },
        { _id: '6', name: 'LOGO设计', image: 'https://via.placeholder.com/300', price: '299.00', sales: 15 }
      ]

      this.setData({ products: mockProducts })
    } catch (error) {
      console.error('加载作品失败', error)
    }
  },

  // 加载业绩数据
  async loadPerformance() {
    try {
      const mockPerformance = {
        monthOrders: 23,
        monthRevenue: '3,456.00',
        completeRate: 95.6,
        totalOrders: 156,
        totalRevenue: '28,900.00',
        goodRate: 98.7
      }

      this.setData({ performance: mockPerformance })
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
