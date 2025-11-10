Page({
  data: {
    noticeId: '',
    notice: null,
    loading: true
  },

  onLoad(options) {
    this.setData({
      noticeId: options.id
    })
    this.loadNotice()
  },

  // 🎯 加载公告详情（从本地存储读取）
  async loadNotice() {
    try {
      // 从本地存储读取公告列表
      const allNotices = wx.getStorageSync('notices') || []
      
      // 查找指定ID的公告
      const notice = allNotices.find(n => n.id === this.data.noticeId || n._id === this.data.noticeId)
      
      if (notice) {
        console.log('📢 加载公告详情:', notice.title)
        this.setData({ notice: notice })
      } else {
        console.warn('⚠️ 未找到公告:', this.data.noticeId)
        wx.showToast({
          title: '公告不存在',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载公告失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
    this.setData({ loading: false })
    }
  }
})