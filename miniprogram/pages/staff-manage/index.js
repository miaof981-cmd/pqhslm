const staffFinance = require('../../utils/staff-finance.js')

function defaultForm() {
  return {
    _id: '',
    name: '',
    roleType: '',  // 角色类型（如主管、专员等）
    userId: '',
    enableShare: false,
    shareAmount: '',
    description: '',
    isActive: true
  }
}

Page({
  data: {
    loading: true,
    staffList: [],
    showModal: false,
    modalMode: 'add',
    formData: defaultForm()
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const staffList = staffFinance.getStaffList()
      // 🎯 格式化金额显示
      const formattedList = staffList.map(item => ({
        ...item,
        enableShare: item.enableShare !== false && item.shareAmount > 0,
        shareAmountDisplay: item.shareAmount != null 
          ? parseFloat(item.shareAmount).toFixed(2) 
          : '0.00'
      }))
      this.setData({ staffList: formattedList })
    } catch (error) {
      console.error('加载人员失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  showAddModal() {
    this.setData({
      showModal: true,
      modalMode: 'add',
      formData: defaultForm()
    })
  },

  editItem(e) {
    const id = e.currentTarget.dataset.id
    const target = this.data.staffList.find(item => item._id === id)
    if (!target) return

    this.setData({
      showModal: true,
      modalMode: 'edit',
      formData: {
        _id: target._id,
        name: target.name || '',
        roleType: target.roleType || '',
        userId: target.userId || '',
        enableShare: target.enableShare !== false && target.shareAmount > 0,
        shareAmount: target.shareAmount != null ? String(target.shareAmount) : '',
        description: target.description || '',
        isActive: target.isActive !== false
      }
    })
  },

  hideModal() {
    this.setData({
      showModal: false
    })
  },

  stopPropagation() {},

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },

  onActiveChange(e) {
    this.setData({
      'formData.isActive': e.detail.value
    })
  },

  // 🎯 分成开关切换
  onShareEnableChange(e) {
    this.setData({
      'formData.enableShare': e.detail.value
    })
  },

  submitForm() {
    const form = { ...this.data.formData }
    const mode = this.data.modalMode

    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    if (!form.userId || !form.userId.trim()) {
      wx.showToast({ title: '请输入用户ID', icon: 'none' })
      return
    }

    // 🎯 如果开启分成，验证金额
    let formattedAmount = 0
    if (form.enableShare) {
      const amount = parseFloat(form.shareAmount)
      if (Number.isNaN(amount) || amount < 0) {
        wx.showToast({ title: '分成金额需为非负数', icon: 'none' })
        return
      }
      formattedAmount = Math.round(amount * 100) / 100
    }

    const duplicate = this.data.staffList.find(item => {
      if (item.userId == null) return false
      if (String(item.userId) !== String(form.userId).trim()) return false
      if (!form._id) return true
      return item._id !== form._id
    })

    if (duplicate) {
      wx.showToast({ title: '该用户ID已绑定其他管理员', icon: 'none' })
      return
    }

    const payload = {
      ...form,
      enableShare: form.enableShare,
      shareAmount: formattedAmount,
      userId: String(form.userId).trim(),
      name: form.name.trim(),
      roleType: form.roleType ? form.roleType.trim() : '',
      description: form.description ? form.description.trim() : '',
      isActive: form.isActive
    }

    try {
      staffFinance.upsertStaff(payload)
      wx.showToast({ title: mode === 'add' ? '已添加' : '已保存', icon: 'success' })
      this.setData({
        showModal: false,
        formData: defaultForm()
      })
      this.loadData()
    } catch (error) {
      console.error('保存人员失败', error)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return

    wx.showModal({
      title: '删除人员',
      content: '删除后将无法恢复，确认删除吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          staffFinance.removeStaff(id)
          this.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
