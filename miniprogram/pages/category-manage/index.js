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
    // ✅ 修复：使用 userRoles 数组而不是 userRole
    const roles = wx.getStorageSync('userRoles') || ['customer']
    const hasAdminRole = Array.isArray(roles) && roles.indexOf('admin') !== -1
    
    if (!hasAdminRole) {
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
      // 🎯 从本地存储读取分类
      let categories = wx.getStorageSync('product_categories') || []
      
      // 🎯 如果没有分类，初始化默认分类
      if (categories.length === 0) {
        categories = [
          { id: 'chibi_portrait', _id: 'chibi_portrait', name: 'Q版头像', icon: '😊', status: 'active', sort: 1 },
          { id: 'half_body', _id: 'half_body', name: '半身像', icon: '👤', status: 'active', sort: 2 },
          { id: 'full_body', _id: 'full_body', name: '全身像', icon: '🧍', status: 'active', sort: 3 },
          { id: 'scene', _id: 'scene', name: '场景插画', icon: '🖼️', status: 'active', sort: 4 },
          { id: 'emoticon', _id: 'emoticon', name: '表情包', icon: '😄', status: 'active', sort: 5 },
          { id: 'logo', _id: 'logo', name: 'LOGO设计', icon: '🏷️', status: 'active', sort: 6 },
          { id: 'ui', _id: 'ui', name: 'UI设计', icon: '📱', status: 'active', sort: 7 },
          { id: 'animation', _id: 'animation', name: '动画设计', icon: '🎬', status: 'active', sort: 8 }
        ]
        wx.setStorageSync('product_categories', categories)
      }
      
      // 🎯 统计每个分类的商品数量
      const products = wx.getStorageSync('mock_products') || []
      categories = categories.map(cat => ({
        ...cat,
        _id: cat._id || cat.id,
        productCount: products.filter(p => p.category === (cat.id || cat._id)).length,
        createTime: cat.createTime || new Date().toISOString()
      }))
      
      // 构建父分类列表（用于选择器）
      const parentCategories = [
        { _id: '', name: '无（顶级分类）' },
        ...categories.filter(c => !c.parentId)
      ]
      
      this.setData({
        categories: categories,
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
          // 🎯 更新分类状态
          const categories = wx.getStorageSync('product_categories') || []
          const index = categories.findIndex(c => (c._id || c.id) === id)
          if (index !== -1) {
            categories[index].status = status === 'active' ? 'disabled' : 'active'
            wx.setStorageSync('product_categories', categories)
          wx.showToast({ title: `已${action}`, icon: 'success' })
          this.loadCategories()
          }
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
          // 🎯 实际删除分类
          let categories = wx.getStorageSync('product_categories') || []
          categories = categories.filter(c => (c._id || c.id) !== id)
          wx.setStorageSync('product_categories', categories)
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
    const { name, sort, parentId, icon, status } = this.data.formData
    
    // 验证
    if (!name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    
    wx.showLoading({ title: '保存中...' })
    
    try {
      let categories = wx.getStorageSync('product_categories') || []
      
      if (this.data.isEdit) {
        // 🎯 编辑模式：更新现有分类
        const index = categories.findIndex(c => (c._id || c.id) === this.data.currentId)
        if (index !== -1) {
          const oldName = categories[index].name
          const newName = name.trim()
          
          categories[index] = {
            ...categories[index],
            name: newName,
            sort: sort || categories[index].sort,
            parentId: parentId || '',
            icon: icon || categories[index].icon,
            status: status || 'active'
          }
          
          // 🎯 同步更新所有使用该分类的商品
          if (oldName !== newName) {
            const products = wx.getStorageSync('mock_products') || []
            let updatedCount = 0
            
            products.forEach(product => {
              // 通过分类ID或分类名称匹配
              if (String(product.category) === String(this.data.currentId) || 
                  product.categoryName === oldName) {
                product.category = this.data.currentId
                product.categoryName = newName
                updatedCount++
              }
            })
            
            if (updatedCount > 0) {
              wx.setStorageSync('mock_products', products)
              console.log(`✅ 已同步更新 ${updatedCount} 个商品的分类名称: ${oldName} → ${newName}`)
            }
          }
        }
      } else {
        // 🎯 新增模式：添加新分类
        const newId = `cat_${Date.now()}`
        categories.push({
          id: newId,
          _id: newId,
          name: name.trim(),
          sort: sort || categories.length + 1,
          parentId: parentId || '',
          icon: icon || '📦',
          status: status || 'active',
          createTime: new Date().toISOString()
        })
      }
      
      wx.setStorageSync('product_categories', categories)
      wx.hideLoading()
      wx.showToast({ 
        title: this.data.isEdit ? '修改成功' : '添加成功', 
        icon: 'success' 
      })
      this.closeModal()
      this.loadCategories()
    } catch (error) {
      wx.hideLoading()
      console.error('保存分类失败', error)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showModal: false })
  },

  // 阻止冒泡
  stopPropagation() {}
})

