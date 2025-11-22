const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')

Page({
  data: {
    currentTab: 'pending',
    applications: [],
    allApplications: [],
    pendingCount: 0,
    todayReviewCount: 0,
    searchKeyword: '',
    
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

  // ✅ UI辅助：加载驳回话术（保留本地存储）
  loadRejectTemplates() {
    const templates = wx.getStorageSync('reject_templates')
    if (templates && templates.length > 0) {
      this.setData({ rejectTemplates: templates })
    }
  },

  // ✅ UI辅助：保存驳回话术（保留本地存储）
  saveRejectTemplates() {
    wx.setStorageSync('reject_templates', this.data.rejectTemplates)
  },

  // ✅ 从云端计算今日审核数量
  async calculateTodayReview() {
    try {
      const res = await cloudAPI.getArtistApplicationList({})
      const allApplications = res.success ? (res.data || []) : []
      const today = new Date().toLocaleDateString('zh-CN')
      
      const todayReviewed = allApplications.filter(app => {
        if (app.status === 'approved' && app.approveTime) {
          const approveDate = new Date(app.approveTime || app.approve_time).toLocaleDateString('zh-CN')
          return approveDate === today
        }
        if (app.status === 'rejected' && (app.rejectTime || app.reject_time)) {
          const rejectDate = new Date(app.rejectTime || app.reject_time).toLocaleDateString('zh-CN')
          return rejectDate === today
        }
        return false
      })

      this.setData({ todayReviewCount: todayReviewed.length })
    } catch (err) {
      console.error('❌ 计算今日审核数量失败:', err)
    }
  },

  // ✅ 从云端加载申请列表
  async loadApplications() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await cloudAPI.getArtistApplicationList({})
      const allApplications = res.success ? (res.data || []) : []
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
          if (app.name && app.name.toLowerCase().includes(keyword)) return true
          if (app.nickName && app.nickName.toLowerCase().includes(keyword)) return true
          if (app.userId && String(app.userId).includes(keyword)) return true
          if (app.wechat && app.wechat.toLowerCase().includes(keyword)) return true
          return false
        })
      }
      
      // 按时间倒序排序
      filteredApplications.sort((a, b) => {
        const timeA = new Date(a.submitTime || a.submit_time).getTime()
        const timeB = new Date(b.submitTime || b.submit_time).getTime()
        return timeB - timeA
      })
      
      // 计算待审核数量
      const pendingCount = allApplications.filter(app => app.status === 'pending').length
      
      this.setData({
        applications: filteredApplications,
        allApplications: allApplications,
        pendingCount: pendingCount
      })
      
      console.log('✅ 审核列表（云端）:', currentTab, '搜索:', searchKeyword, '结果:', filteredApplications.length)
    } catch (err) {
      console.error('❌ 加载申请列表失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ 
      currentTab: tab,
      searchKeyword: ''
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
    const application = this.data.applications.find(app => (app.id || app._id) === id)
    
    if (!application) {
      wx.showToast({ title: '申请不存在', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '通过申请',
      content: `确认通过 ${application.nickName || application.name} 的画师申请？`,
      success: (res) => {
        if (res.confirm) {
          this.doApprove(id, application.userId)
        }
      }
    })
  },

  // ✅ 执行通过操作（云端版）
  async doApprove(id, artistUserId) {
    try {
      wx.showLoading({ title: '处理中...' })
      
      // ✅ 云端更新申请状态为approved
      const res = await cloudAPI.updateArtistApplicationStatus(id, 'approved')
      
      if (!res.success) {
        throw new Error(res.error || '审核失败')
      }
      
      // ✅ 如果是当前登录用户，更新全局角色
      const currentUserId = app.globalData.userId
      if (artistUserId === currentUserId) {
        const rolesRes = await app.getUserRoles()
        let userRoles = rolesRes || ['customer']
        if (!userRoles.includes('artist')) {
          userRoles.push('artist')
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
    } catch (err) {
      console.error('❌ 审核通过失败:', err)
      wx.showToast({
        title: err.message || '审核失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
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

  // ✅ 确认驳回（云端版）
  async confirmReject() {
    const { currentRejectItem, rejectReason } = this.data
    
    if (!rejectReason.trim()) {
      wx.showToast({
        title: '请输入驳回原因',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: '处理中...' })
      
      // ✅ 云端更新申请状态为rejected
      const itemId = currentRejectItem.id || currentRejectItem._id
      const res = await cloudAPI.updateArtistApplicationStatus(itemId, 'rejected', rejectReason)
      
      if (!res.success) {
        throw new Error(res.error || '驳回失败')
      }
      
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
    } catch (err) {
      console.error('❌ 驳回失败:', err)
      wx.showToast({
        title: err.message || '驳回失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
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
