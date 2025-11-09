Page({
  data: {
    posts: [],
    leftPosts: [],
    rightPosts: [],
    DEFAULT_AVATAR_DATA: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKg8L3RleHQ+PC9zdmc+'
  },

  onShow() {
    this.loadPosts()
  },

  onPullDownRefresh() {
    this.loadPosts(() => wx.stopPullDownRefresh())
  },

  loadPosts(callback) {
    const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../../utils/image-helper.js')
    
    const allPosts = (wx.getStorageSync('buyer_show_posts') || [])
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(post => ({
        ...post,
        // 🎯 修复：确保图片可渲染
        images: Array.isArray(post.images) 
          ? post.images.map((img, idx) => ensureRenderableImage(img, { 
              namespace: `buyer-show-${post.id}-${idx}`, 
              fallback: DEFAULT_PLACEHOLDER 
            }))
          : [],
        authorAvatar: ensureRenderableImage(post.authorAvatar, {
          namespace: `buyer-avatar-${post.id}`,
          fallback: this.data.DEFAULT_AVATAR_DATA
        })
      }))

    // 瀑布流分配：奇数索引到左列，偶数索引到右列
    const leftPosts = []
    const rightPosts = []
    
    allPosts.forEach((post, index) => {
      if (index % 2 === 0) {
        leftPosts.push(post)
      } else {
        rightPosts.push(post)
      }
    })

    this.setData({
      posts: allPosts,
      leftPosts,
      rightPosts
    })

    if (typeof callback === 'function') {
      callback()
    }
  },

  viewPost(event) {
    const { id } = event.currentTarget.dataset
    if (!id) {
      wx.showToast({
        title: '内容不存在',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/buyer-show/detail/index?id=${id}`
    })
  },

  goOrderList() {
    // 🎯 修复：使用navigateTo而非switchTab
    wx.navigateTo({
      url: '/pages/order-list/index'
    })
  }
})
