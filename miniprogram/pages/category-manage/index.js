Page({
  data: {
    loading: true,
    categories: [],
    showModal: false,
    isEdit: false,
    currentId: '',
    formData: {
      name: '',
      parentId: '',
      parentName: '',
      parentIndex: -1,
      sort: 0,
      icon: '',
      status: 'active'
    },
    parentCategories: []
  },

  onLoad() {
    this.checkPermission()
    this.loadCategories()
  },

  // 检查管理员权限
  checkPermission() {
    const role = wx.getStorageSync('userRole') || 'customer'
    if (role !== 'admin') {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return false
    }
    return true
  },

  // 加载分类列表
  async loadCategories() {
    this.setData({ loading: true })
    
    try {
      // 模拟数据 - 实际应从云数据库获取
      const mockCategories = [
        {
          _id: '1',
          name: '头像设计',
          parentId: '',
          sort: 1,
          icon: 'https://via.placeholder.com/100',
          status: 'active',
          productCount: 15,
          createTime: '2024-01-20 10:00',
          children: [
            { _id: '1-1', name: 'Q版头像', parentId: '1' },
            { _id: '1-2', name: '写实头像', parentId: '1' }
          ]
        },
        {
          _id: '2',
          name: '插画设计',
          parentId: '',
          sort: 2,
          icon: 'https://via.placeholder.com/100',
          status: 'active',
          productCount: 23,
          createTime: '2024-01-20 10:05',
          children: [
            { _id: '2-1', name: '场景插画', parentId: '2' },
            { _id: '2-2', name: '人物插画', parentId: '2' }
          ]
        },
        {
          _id: '3',
          name: 'LOGO设计',
          parentId: '',
          sort: 3,
          icon: 'https://via.placeholder.com/100',
          status: 'active',
          productCount: 8,
          createTime: '2024-01-20 10:10',
          children: []
        },
        {
          _id: '4',
          name: '表情包',
          parentId: '',
          sort: 4,
          icon: 'https://via.placeholder.com/100',
          status: 'disabled',
          productCount: 0,
          createTime: '2024-01-20 10:15',
          children: []
        }
      ]
      
      // 构建父分类列表（用于选择器）
      const parentCategories = [
        { _id: '', name: '无（顶级分类）' },
        ...mockCategories.filter(c => !c.parentId)
      ]
      
      this.setData({
        categories: mockCategories,
        parentCategories: parentCategories
      })
    } catch (error) {
      console.error('加载分类失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 添加分类
  addCategory() {
    this.setData({
      showModal: true,
      isEdit: false,
      currentId: '',
      formData: {
        name: '',
        parentId: '',
        parentName: '',
        parentIndex: -1,
        sort: this.data.categories.length + 1,
        icon: '',
        status: 'active'
      }
    })
  },

  // 编辑分类
  editCategory(e) {
    const id = e.currentTarget.dataset.id
    const category = this.data.categories.find(c => c._id === id)
    
    if (!category) return
    
    // 查找父分类索引
    let parentIndex = -1
    if (category.parentId) {
      parentIndex = this.data.parentCategories.findIndex(p => p._id === category.parentId)
    }
    
    this.setData({
      showModal: true,
      isEdit: true,
      currentId: id,
      formData: {
        name: category.name,
        parentId: category.parentId || '',
        parentName: category.parentId ? this.data.parentCategories[parentIndex]?.name : '',
        parentIndex: parentIndex,
        sort: category.sort,
        icon: category.icon,
        status: category.status
      }
    })
  },

  // 切换状态
  toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset
    const action = status === 'active' ? '禁用' : '启用'
    
    wx.showModal({
      title: `${action}分类`,
      content: `确认${action}此分类？${action === '禁用' ? '禁用后该分类下的商品将不显示' : ''}`,
      success: (res) => {
        if (res.confirm) {
          // 实际应调用云函数更新
          wx.showToast({ title: `已${action}`, icon: 'success' })
          this.loadCategories()
        }
      }
    })
  },

  // 删除分类
  deleteCategory(e) {
    const id = e.currentTarget.dataset.id
    const category = this.data.categories.find(c => c._id === id)
    
    if (category && category.productCount > 0) {
      wx.showModal({
        title: '无法删除',
        content: '该分类下还有商品，请先移除商品或更改商品分类',
        showCancel: false
      })
      return
    }
    
    wx.showModal({
      title: '删除分类',
      content: '确认删除此分类？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 实际应调用云函数删除
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadCategories()
        }
      }
    })
  },

  // 表单输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  onSortInput(e) {
    this.setData({
      'formData.sort': parseInt(e.detail.value) || 0
    })
  },

  onParentChange(e) {
    const index = parseInt(e.detail.value)
    const parent = this.data.parentCategories[index]
    
    this.setData({
      'formData.parentIndex': index,
      'formData.parentId': parent._id,
      'formData.parentName': parent.name
    })
  },

  onStatusChange(e) {
    this.setData({
      'formData.status': e.detail.value ? 'active' : 'disabled'
    })
  },

  // 上传图标
  uploadIcon() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 实际应上传到云存储
        this.setData({
          'formData.icon': res.tempFilePaths[0]
        })
        wx.showToast({ title: '图片已选择', icon: 'success' })
      }
    })
  },

  // 保存分类
  saveCategory() {
    const { name, sort } = this.data.formData
    
    // 验证
    if (!name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    
    // 实际应调用云函数保存
    wx.showLoading({ title: '保存中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ 
        title: this.data.isEdit ? '修改成功' : '添加成功', 
        icon: 'success' 
      })
      this.closeModal()
      this.loadCategories()
    }, 500)
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showModal: false })
  },

  // 阻止冒泡
  stopPropagation() {}
})

