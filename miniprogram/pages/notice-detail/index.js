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

  // 加载公告详情
  async loadNotice() {
    // 暂时使用模拟数据
    this.setData({
      notice: {
        _id: this.data.noticeId,
        title: '欢迎使用画师商城',
        content: '这是一个示例公告的详细内容。画师商城是一个专门为画师和客户提供服务的平台，支持商品展示、订单管理、会员服务等功能。',
        createTime: '2024-01-01'
      }
    })
    this.setData({ loading: false })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const res = await wx.cloud.database().collection('notices')
    //     .doc(this.data.noticeId)
    //     .get()
    //   
    //   if (res.data) {
    //     this.setData({ notice: res.data })
    //   }
    // } catch (error) {
    //   console.error('加载公告失败', error)
    //   wx.showToast({
    //     title: '加载失败',
    //     icon: 'none'
    //   })
    // } finally {
    //   this.setData({ loading: false })
    // }
  }
})