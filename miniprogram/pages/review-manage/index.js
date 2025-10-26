Page({
  data: {
    currentTab: 'pending',
    applications: [],
    allApplications: [], // 保存所有数据用于搜索
    pendingCount: 0,
    todayReviewCount: 0,
    searchKeyword: '', // 搜索关键词
    
    // 驳回相关
    showRejectModal: false,
    showTemplateModal: false,
    rejectReason: '',
    currentRejectItem: null,
    rejectTemplates: [
      '作品质量未达到要求，请提供更多高质量作品',
      '绘画过程图不清晰，请重新上传',
      '价格设置不合理，请重新评估',
      '作品风格与平台不符',
      '资料填写不完整，请补充完整信息'
    ]
  },

  onLoad() {
    this.loadRejectTemplates()
    this.loadApplications()
    this.calculateTodayReview()
  },

  onShow() {
    this.loadApplications()
    this.calculateTodayReview()
  },

  // 加载驳回话术
  loadRejectTemplates() {
    const templates = wx.getStorageSync('reject_templates')
    if (templates && templates.length > 0) {
      this.setData({ rejectTemplates: templates })
    }
  },

  // 保存驳回话术
  saveRejectTemplates() {
    wx.setStorageSync('reject_templates', this.data.rejectTemplates)
  },

  // 计算今日审核数量
  calculateTodayReview() {
    const allApplications = wx.getStorageSync('artist_applications') || []
    const today = new Date().toLocaleDateString('zh-CN')
    
    const todayReviewed = allApplications.filter(app => {
      if (app.status === 'approved' && app.approveTime) {
        const approveDate = new Date(app.approveTime).toLocaleDateString('zh-CN')
        return approveDate === today
      }
      if (app.status === 'rejected' && app.rejectTime) {
        const rejectDate = new Date(app.rejectTime).toLocaleDateString('zh-CN')
        return rejectDate === today
      }
      return false
    })

    this.setData({ todayReviewCount: todayReviewed.length })
  },

  // 加载申请列表
  loadApplications() {
    const allApplications = wx.getStorageSync('artist_applications') || []
    const { currentTab, searchKeyword } = this.data
    
    let filteredApplications = []
    
    // 根据标签筛选
    if (currentTab === 'pending') {
      filteredApplications = allApplications.filter(app => app.status === 'pending')
    } else if (currentTab === 'approved') {
      filteredApplications = allApplications.filter(app => app.status === 'approved')
    } else if (currentTab === 'rejected') {
      filteredApplications = allApplications.filter(app => app.status === 'rejected')
    }
    
    // 搜索过滤
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase()
      filteredApplications = filteredApplications.filter(app => {
        // 搜索姓名
        if (app.name && app.name.toLowerCase().includes(keyword)) {
          return true
        }
        // 搜索微信昵称
        if (app.nickName && app.nickName.toLowerCase().includes(keyword)) {
          return true
        }
        // 搜索用户ID
        if (app.userId && String(app.userId).includes(keyword)) {
          return true
        }
        // 搜索微信号
        if (app.wechat && app.wechat.toLowerCase().includes(keyword)) {
          return true
        }
        return false
      })
    }
    
    // 按时间倒序排序
    filteredApplications.sort((a, b) => {
      const timeA = new Date(a.submitTime).getTime()
      const timeB = new Date(b.submitTime).getTime()
      return timeB - timeA
    })
    
    // 计算待审核数量
    const pendingCount = allApplications.filter(app => app.status === 'pending').length
    
    this.setData({
      applications: filteredApplications,
      allApplications: allApplications,
      pendingCount: pendingCount
    })
    
    console.log('审核列表:', currentTab, '搜索:', searchKeyword, '结果:', filteredApplications.length)
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ 
      currentTab: tab,
      searchKeyword: '' // 切换标签时清空搜索
    })
    this.loadApplications()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  // 搜索确认
  onSearchConfirm() {
    this.loadApplications()
  },

  // 清空搜索
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.loadApplications()
  },

  // 查看详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/artist-application-detail/index?id=${id}`
    })
  },

  // 预览图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({
      urls: urls,
      current: current
    })
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 通过申请
  approveApplication(e) {
    const id = e.currentTarget.dataset.id
    const application = this.data.applications.find(app => app.id === id)
    
    if (!application) {
      wx.showToast({ title: '申请不存在', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '通过申请',
      content: `确认通过 ${application.nickName} 的画师申请？`,
      success: (res) => {
        if (res.confirm) {
          this.doApprove(id)
        }
      }
    })
  },

  // 执行通过操作
  doApprove(id) {
    let allApplications = wx.getStorageSync('artist_applications') || []
    const index = allApplications.findIndex(app => app.id === id)
    
    if (index !== -1) {
      allApplications[index].status = 'approved'
      allApplications[index].approveTime = new Date().toLocaleString('zh-CN')
      wx.setStorageSync('artist_applications', allApplications)
      
      // 给用户添加画师权限
      const userId = allApplications[index].userId
      const currentUserId = wx.getStorageSync('userId')
      
      if (userId === currentUserId) {
        let userRoles = wx.getStorageSync('userRoles') || ['customer']
        if (!userRoles.includes('artist')) {
          userRoles.push('artist')
          wx.setStorageSync('userRoles', userRoles)
          
          const app = getApp()
          app.globalData.userRoles = userRoles
        }
      }
      
      wx.showToast({
        title: '审核通过',
        icon: 'success'
      })
      
      // 重新加载列表
      setTimeout(() => {
        this.loadApplications()
        this.calculateTodayReview()
      }, 500)
    }
  },

  // 显示驳回弹窗
  showRejectModal(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showRejectModal: true,
      currentRejectItem: item,
      rejectReason: ''
    })
  },

  // 隐藏驳回弹窗
  hideRejectModal() {
    this.setData({
      showRejectModal: false,
      currentRejectItem: null,
      rejectReason: ''
    })
  },

  // 选择话术模板
  selectTemplate(e) {
    const text = e.currentTarget.dataset.text
    this.setData({ rejectReason: text })
  },

  // 输入驳回原因
  onRejectReasonInput(e) {
    this.setData({ rejectReason: e.detail.value })
  },

  // 确认驳回
  confirmReject() {
    const { currentRejectItem, rejectReason } = this.data
    
    if (!rejectReason.trim()) {
      wx.showToast({
        title: '请输入驳回原因',
        icon: 'none'
      })
      return
    }
    
    let allApplications = wx.getStorageSync('artist_applications') || []
    const index = allApplications.findIndex(app => app.id === currentRejectItem.id)
    
    if (index !== -1) {
      allApplications[index].status = 'rejected'
      allApplications[index].rejectTime = new Date().toLocaleString('zh-CN')
      allApplications[index].rejectReason = rejectReason
      wx.setStorageSync('artist_applications', allApplications)
      
      wx.showToast({
        title: '已驳回',
        icon: 'success'
      })
      
      this.hideRejectModal()
      
      // 重新加载列表
      setTimeout(() => {
        this.loadApplications()
        this.calculateTodayReview()
      }, 500)
    }
  },

  // 显示话术管理
  showRejectTemplates() {
    this.setData({ showTemplateModal: true })
  },

  // 隐藏话术管理
  hideTemplateModal() {
    this.setData({ showTemplateModal: false })
  },

  // 添加话术
  addTemplate() {
    wx.showModal({
      title: '添加话术',
      editable: true,
      placeholderText: '请输入话术内容',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const templates = [...this.data.rejectTemplates, res.content.trim()]
          this.setData({ rejectTemplates: templates })
          this.saveRejectTemplates()
          
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 编辑话术
  editTemplate(e) {
    const index = e.currentTarget.dataset.index
    const oldText = this.data.rejectTemplates[index]
    
    wx.showModal({
      title: '编辑话术',
      editable: true,
      placeholderText: '请输入话术内容',
      content: oldText,
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const templates = [...this.data.rejectTemplates]
          templates[index] = res.content.trim()
          this.setData({ rejectTemplates: templates })
          this.saveRejectTemplates()
          
          wx.showToast({
            title: '修改成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 删除话术
  deleteTemplate(e) {
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '删除话术',
      content: '确认删除这条话术吗？',
      success: (res) => {
        if (res.confirm) {
          const templates = [...this.data.rejectTemplates]
          templates.splice(index, 1)
          this.setData({ rejectTemplates: templates })
          this.saveRejectTemplates()
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  }
})

