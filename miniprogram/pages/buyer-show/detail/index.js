Page({
  data: {
    post: null,
    DEFAULT_AVATAR_DATA: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlKg8L3RleHQ+PC9zdmc+'
  },

  onLoad(options) {
    const { id } = options
    if (!id) {
      wx.showToast({
        title: '内容不存在',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.loadPost(id)
  },

  loadPost(id) {
    const posts = wx.getStorageSync('buyer_show_posts') || []
    const post = posts.find(item => String(item.id) === String(id))

    if (!post) {
      wx.showToast({
        title: '内容已被删除',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({ post })
  },

  previewImage(event) {
    const { index } = event.currentTarget.dataset
    const { post } = this.data
    if (!post) return

    wx.previewImage({
      current: post.images[index],
      urls: post.images
    })
  },

  goToProduct() {
    const { post } = this.data
    if (!post || !post.productId) {
      wx.showToast({
        title: '商品信息缺失',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/product-detail/index?id=${post.productId}`
    })
  }
})
