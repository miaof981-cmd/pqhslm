const cloudAPI = require('../../utils/cloud-api.js')

Page({
  data: {
    serviceList: [],
    showAddModal: false,
    showEditModal: false,
    showDetailModal: false,
    currentService: null,
    newService: {
      userId: '',
      name: '',
      wechatId: '',
      qrcodeUrl: ''
    },
    editService: {
      id: '',
      userId: '',
      name: '',
      wechatId: ''
    },
    loading: false
  },

  onLoad() {
    this.loadServiceList()
  },

  onShow() {
    this.loadServiceList()
  },

  // ✅ 加载客服列表（从云端）
  async loadServiceList() {
    console.log('=== 加载客服列表（云端） ===')
    
    this.setData({ loading: true })
    
    try {
      const res = await cloudAPI.getServiceList(false) // 获取所有客服（包括离线）
      
      if (res && res.success) {
        const services = res.data.map(s => ({
          id: s.userId,
          userId: s.userId,
          name: s.name || s.nickName,
          wechatId: s.wechatId || '',
          qrcodeUrl: s.qrcodeUrl || '',
          avatar: s.avatarUrl || '',
          isActive: s.isActive !== false
        }))
        
        console.log('✅ 从云端加载客服:', services.length, '个')
        
        this.setData({
          serviceList: services,
          loading: false
        })
      } else {
        console.error('❌ 加载客服失败:', res?.message)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('❌ 加载客服异常:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 显示添加客服弹窗
  showAddServiceModal() {
    this.setData({
      showAddModal: true,
      newService: {
        userId: '',
        name: '',
        wechatId: '',
        qrcodeUrl: ''
      }
    })
  },

  // 隐藏弹窗
  hideAddModal() {
    this.setData({
      showAddModal: false
    })
  },

  hideEditModal() {
    this.setData({
      showEditModal: false
    })
  },

  // 阻止冒泡
  stopPropagation() {},

  // 表单输入
  onUserIdInput(e) {
    this.setData({
      'newService.userId': e.detail.value
    })
  },

  onNameInput(e) {
    this.setData({
      'newService.name': e.detail.value
    })
  },

  onWechatIdInput(e) {
    this.setData({
      'newService.wechatId': e.detail.value
    })
  },

  // 编辑表单输入
  onEditUserIdInput(e) {
    this.setData({
      'editService.userId': e.detail.value
    })
  },

  onEditNameInput(e) {
    this.setData({
      'editService.name': e.detail.value
    })
  },

  onEditWechatIdInput(e) {
    this.setData({
      'editService.wechatId': e.detail.value
    })
  },

  // 选择头像
  async chooseAvatar() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const tempPath = res.tempFilePaths[0]
        
        // ✅ 转换为base64
        const base64 = await this.convertTempToBase64(tempPath)
        
        this.setData({
          'newService.qrcodeUrl': base64
        })
        
        console.log('✅ 头像已选择（base64）')
      }
    } catch (error) {
      console.error('选择头像失败:', error)
      wx.showToast({ title: '选择失败', icon: 'none' })
    }
  },

  // 选择二维码
  async chooseQRCode() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const tempPath = res.tempFilePaths[0]
        
        // ✅ 转换为base64
        const base64 = await this.convertTempToBase64(tempPath)
        
        this.setData({
          'newService.qrcodeUrl': base64
        })
        
        console.log('✅ 二维码已选择（base64）')
      }
    } catch (error) {
      console.error('选择二维码失败:', error)
      wx.showToast({ title: '选择失败', icon: 'none' })
    }
  },

  // 转换临时路径为base64
  convertTempToBase64(tempPath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: tempPath,
        encoding: 'base64',
        success: (res) => {
          resolve(`data:image/jpeg;base64,${res.data}`)
        },
        fail: reject
      })
    })
  },

  // ✅ 添加客服（云端）
  async addService() {
    const { userId, name, wechatId, qrcodeUrl } = this.data.newService

    // 验证
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入客服名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '添加中...' })

    try {
      // 获取当前用户头像
      const app = getApp()
      const userInfo = app.globalData.userInfo || {}
      const avatarUrl = qrcodeUrl || userInfo.avatarUrl || ''

      const res = await cloudAPI.addService({
        userId: userId || Date.now().toString(),
        name: name.trim(),
        wechatId: wechatId || '',
        qrcodeUrl: qrcodeUrl || '',
        avatarUrl: avatarUrl
      })

      wx.hideLoading()

      if (res && res.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.hideAddModal()
        this.loadServiceList()
      } else {
        wx.showToast({ title: res?.message || '添加失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('添加客服失败:', error)
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  // ✅ 切换客服状态（云端）
  async toggleServiceStatus(e) {
    const { id, status } = e.currentTarget.dataset
    const newStatus = !status

    wx.showLoading({ title: '更新中...' })

    try {
      const res = await cloudAPI.toggleServiceStatus(id, newStatus)

      wx.hideLoading()

      if (res && res.success) {
        wx.showToast({ title: res.message || '状态更新成功', icon: 'success' })
        this.loadServiceList()
      } else {
        wx.showToast({ title: res?.message || '更新失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('切换状态失败:', error)
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  // 显示编辑弹窗
  showEditServiceModal(e) {
    const service = e.currentTarget.dataset.service
    
    this.setData({
      showEditModal: true,
      editService: {
        id: service.id,
        userId: service.userId,
        name: service.name,
        wechatId: service.wechatId
      }
    })
  },

  // ✅ 保存编辑（云端）
  async saveEdit() {
    const { id, name, wechatId } = this.data.editService

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入客服名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const res = await cloudAPI.updateService(id, {
        name: name.trim(),
        wechatId: wechatId || ''
      })

      wx.hideLoading()

      if (res && res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.hideEditModal()
        this.loadServiceList()
      } else {
        wx.showToast({ title: res?.message || '保存失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('保存失败:', error)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // ✅ 删除客服（云端）
  async deleteService(e) {
    const { id } = e.currentTarget.dataset

    const confirmRes = await wx.showModal({
      title: '删除客服',
      content: '确定要删除这个客服吗？',
      confirmColor: '#FF6B6B'
    })

    if (!confirmRes.confirm) return

    wx.showLoading({ title: '删除中...' })

    try {
      const res = await cloudAPI.deleteService(id)

      wx.hideLoading()

      if (res && res.success) {
        wx.showToast({ title: '删除成功', icon: 'success' })
        this.loadServiceList()
      } else {
        wx.showToast({ title: res?.message || '删除失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('删除失败:', error)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  // 显示二维码详情
  showQRCodeDetail(e) {
    const service = e.currentTarget.dataset.service
    
    this.setData({
      showDetailModal: true,
      currentService: service
    })
  },

  // 隐藏二维码详情
  hideDetailModal() {
    this.setData({
      showDetailModal: false,
      currentService: null
    })
  },

  // 保存二维码到相册
  async saveQRCode() {
    const { currentService } = this.data
    
    if (!currentService || !currentService.qrcodeUrl) {
      wx.showToast({ title: '没有二维码可保存', icon: 'none' })
      return
    }

    try {
      // 如果是base64，需要先转换为临时文件
      let tempPath = currentService.qrcodeUrl
      
      if (tempPath.startsWith('data:image')) {
        const base64Data = tempPath.split(',')[1]
        const fs = wx.getFileSystemManager()
        const filePath = `${wx.env.USER_DATA_PATH}/qrcode_${Date.now()}.jpg`
        
        fs.writeFileSync(filePath, base64Data, 'base64')
        tempPath = filePath
      }

      await wx.saveImageToPhotosAlbum({
        filePath: tempPath
      })

      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (error) {
      console.error('保存失败:', error)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
