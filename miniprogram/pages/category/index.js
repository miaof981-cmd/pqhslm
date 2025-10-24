Page({
  data: {
    categories: []
  },

  onLoad() {
    this.loadCategories()
  },

  loadCategories() {
    this.setData({
      categories: [
        { id: 'all', name: '全部', count: 100 },
        { id: 'portrait', name: '头像', count: 25 },
        { id: 'illustration', name: '插画', count: 30 },
        { id: 'logo', name: 'LOGO', count: 15 },
        { id: 'poster', name: '海报', count: 10 },
        { id: 'emoticon', name: '表情包', count: 12 },
        { id: 'ui', name: 'UI设计', count: 5 },
        { id: 'animation', name: '动画', count: 3 }
      ]
    })
  },

  goToCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/home/index?category=${categoryId}`
    })
  }
})
