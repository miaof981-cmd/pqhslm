const orderStatusUtil = require('../../utils/order-status.js')

/**
 * 🔧 iOS兼容的日期解析函数
 */
const parseDate = orderStatusUtil.parseDate

Page({
  data: {
    loading: true,
    notices: [],
    showModal: false,
    isEdit: false,
    currentId: '',
    formData: {
      title: '',
      content: '',
      type: 'info', // info | warning | important
      status: 'active' // active | inactive
    }
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    this.loadNotices()
  },

  // 检查管理员权限
  checkPermission() {
    // ✅ 修复：使用 userRoles 数组而不是 userRole
    const roles = wx.getStorageSync('userRoles') || ['customer']
    const hasAdminRole = Array.isArray(roles) && roles.indexOf('admin') !== -1
    
    if (!hasAdminRole) {
      wx.showModal({
        title: '权限不足',
        content: '只有管理员可以访问此页面',
        showCancel: false,
        complete: () => {
          wx.navigateBack()
        }
      })
      return false
    }
    return true
  },

  // 加载公告列表
  loadNotices() {
    this.setData({ loading: true })
    
    try {
      const notices = wx.getStorageSync('notices') || []
      // 按创建时间倒序
      // 🔧 iOS兼容：使用parseDate函数
      notices.sort((a, b) => parseDate(b.createTime) - parseDate(a.createTime))
      
      this.setData({ 
        notices,
        loading: false 
      })
      
      console.log('📢 加载公告列表:', notices.length, '条')
    } catch (error) {
      console.error('加载公告失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 显示添加公告弹窗
  showAddModal() {
    this.setData({
      showModal: true,
      isEdit: false,
      currentId: '',
      formData: {
        title: '',
        content: '',
        type: 'info',
        status: 'active'
      }
    })
  },

  // 显示编辑公告弹窗
  editNotice(e) {
    const { id } = e.currentTarget.dataset
    const notices = wx.getStorageSync('notices') || []
    const notice = notices.find(n => n.id === id)
    
    if (!notice) {
      wx.showToast({ title: '公告不存在', icon: 'none' })
      return
    }
    
    this.setData({
      showModal: true,
      isEdit: true,
      currentId: id,
      formData: {
        title: notice.title || '',
        content: notice.content || '',
        type: notice.type || 'info',
        status: notice.status || 'active'
      }
    })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showModal: false })
  },

  // 表单输入
  onTitleInput(e) {
    this.setData({ 'formData.title': e.detail.value })
  },

  onContentInput(e) {
    this.setData({ 'formData.content': e.detail.value })
  },

  onTypeChange(e) {
    this.setData({ 'formData.type': e.detail.value })
  },

  onStatusChange(e) {
    this.setData({ 'formData.status': e.detail.value })
  },

  // 保存公告
  saveNotice() {
    const { isEdit, currentId, formData } = this.data
    
    // 验证
    if (!formData.title || !formData.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    
    if (!formData.content || !formData.content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    
    const notices = wx.getStorageSync('notices') || []
    
    if (isEdit) {
      // 编辑
      const index = notices.findIndex(n => n.id === currentId)
      if (index === -1) {
        wx.showToast({ title: '公告不存在', icon: 'none' })
        return
      }
      
      notices[index] = {
        ...notices[index],
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        status: formData.status,
        updateTime: new Date().toISOString()
      }
      
      console.log('✏️ 更新公告:', notices[index])
    } else {
      // 新增
      const newNotice = {
        id: 'notice_' + Date.now(),
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        status: formData.status,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      
      notices.unshift(newNotice)
      console.log('➕ 新增公告:', newNotice)
    }
    
    wx.setStorageSync('notices', notices)
    
    wx.showToast({
      title: isEdit ? '更新成功' : '添加成功',
      icon: 'success'
    })
    
    this.setData({ showModal: false })
    this.loadNotices()
  },

  // 删除公告
  deleteNotice(e) {
    const { id } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这条公告吗？',
      success: (res) => {
        if (res.confirm) {
          const notices = wx.getStorageSync('notices') || []
          const newNotices = notices.filter(n => n.id !== id)
          wx.setStorageSync('notices', newNotices)
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
          
          console.log('🗑️ 删除公告:', id)
          this.loadNotices()
        }
      }
    })
  },

  // 切换状态
  toggleStatus(e) {
    const { id } = e.currentTarget.dataset
    const notices = wx.getStorageSync('notices') || []
    const notice = notices.find(n => n.id === id)
    
    if (!notice) return
    
    notice.status = notice.status === 'active' ? 'inactive' : 'active'
    notice.updateTime = new Date().toISOString()
    
    wx.setStorageSync('notices', notices)
    
    wx.showToast({
      title: notice.status === 'active' ? '已启用' : '已停用',
      icon: 'success'
    })
    
    console.log('🔄 切换公告状态:', id, notice.status)
    this.loadNotices()
  },

  // 阻止事件冒泡
  stopPropagation() {}
})
