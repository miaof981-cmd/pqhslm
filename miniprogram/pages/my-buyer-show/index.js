const { ensureRenderableImage, DEFAULT_PLACEHOLDER } = require('../../utils/image-helper.js')

Page({
  data: {
    posts: [],
    leftPosts: [],
    rightPosts: [],
    emptyTips: [
      '完成订单后，可在订单详情页发布买家秀',
      '发布成功后会出现在这里，方便你随时管理'
    ],
    DEFAULT_AVATAR_DATA: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKg8L3RleHQ+PC9zdmc+'
  },

  onShow() {
    this.loadMyPosts()
  },

  loadMyPosts() {
    const userId = wx.getStorageSync('userId')
    const allPosts = wx.getStorageSync('buyer_show_posts') || []

    const myPosts = allPosts
      .filter(post => String(post.authorId) === String(userId))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(post => {
        const coverImage = ensureRenderableImage(
          Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : post.productImage,
          { namespace: 'my-buyer-show-cover', fallback: DEFAULT_PLACEHOLDER }
        )
        return {
          ...post,
          coverImage
        }
      })

    // 🎯 瀑布流分配：奇数索引到左列，偶数索引到右列
    const leftPosts = []
    const rightPosts = []
    
    myPosts.forEach((post, index) => {
      if (index % 2 === 0) {
        leftPosts.push(post)
      } else {
        rightPosts.push(post)
      }
    })

    this.setData({ 
      posts: myPosts,
      leftPosts,
      rightPosts
    })
  },

  deletePost(event) {
    const { id } = event.currentTarget.dataset
    if (!id) return

    wx.showModal({
      title: '删除买家秀',
      content: '删除后将无法恢复，确定要删除吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (!res.confirm) return

        const posts = wx.getStorageSync('buyer_show_posts') || []
        const nextPosts = posts.filter(post => String(post.id) !== String(id))
        wx.setStorageSync('buyer_show_posts', nextPosts)

        wx.showToast({
          title: '已删除',
          icon: 'success'
        })

        this.loadMyPosts()
      }
    })
  },

  viewPost(event) {
    const { id } = event.currentTarget.dataset
    if (!id) return

    wx.navigateTo({
      url: `/pages/buyer-show/detail/index?id=${id}`
    })
  },

  goPublishGuide() {
    const targetUrl = '/pages/order-list/index?status=processing'
    wx.navigateTo({
      url: targetUrl,
      fail: () => {
        // 部分版本可能限制 navigateTo，兜底使用 switchTab
        wx.switchTab({
          url: '/pages/user-center/index'
        })
      }
    })
  }
})
