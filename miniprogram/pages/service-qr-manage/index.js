Page({
  data: {
    serviceList: [],
    showAddModal: false,
    showDetailModal: false,
    currentService: null,
    newService: {
      userId: '',
      name: '',
      wechatId: '',
      qrcodeUrl: ''
    }
  },

  onLoad() {
    this.loadServiceList()
  },

  onShow() {
    this.loadServiceList()
  },

  // 加载客服列表
  loadServiceList() {
    console.log('=== 加载客服列表 ===')
    
    const services = wx.getStorageSync('service_list') || []
    console.log('客服数量:', services.length)
    
    this.setData({
      serviceList: services
    })
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

  // 上传二维码
  uploadQrcode() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        // 转换为 base64
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: 'base64',
          success: (fileRes) => {
            const base64 = 'data:image/jpeg;base64,' + fileRes.data
            this.setData({
              'newService.qrcodeUrl': base64
            })
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: (err) => {
            console.error('读取文件失败:', err)
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 移除二维码
  removeQrcode() {
    this.setData({
      'newService.qrcodeUrl': ''
    })
  },

  // 确认添加客服
  confirmAddService() {
    const { userId, name, wechatId, qrcodeUrl } = this.data.newService
    
    // 验证必填项
    if (!userId) {
      wx.showToast({ title: '请输入用户ID', icon: 'none' })
      return
    }
    if (!name) {
      wx.showToast({ title: '请输入客服姓名', icon: 'none' })
      return
    }

    // 检查用户是否存在
    const wxUserInfo = wx.getStorageSync('wxUserInfo')
    const currentUserId = wx.getStorageSync('userId')
    
    if (userId != currentUserId) {
      wx.showModal({
        title: '提示',
        content: `当前只能将用户ID ${currentUserId} 设置为客服（开发环境限制）`,
        showCancel: false
      })
      return
    }

    // 获取现有客服列表
    let services = wx.getStorageSync('service_list') || []
    
    // 检查是否已存在
    const existingService = services.find(s => s.userId == userId)
    if (existingService) {
      wx.showToast({ title: '该用户已是客服', icon: 'none' })
      return
    }

    // 生成客服编号（自动递增）
    const maxNumber = services.length > 0 
      ? Math.max(...services.map(s => s.serviceNumber || 0))
      : 0
    const serviceNumber = maxNumber + 1

    // 生成二维码编号（如果有上传二维码）
    let qrcodeNumber = null
    if (qrcodeUrl) {
      const allQrcodes = services.filter(s => s.qrcodeNumber).map(s => s.qrcodeNumber)
      qrcodeNumber = allQrcodes.length > 0 
        ? Math.max(...allQrcodes) + 1
        : 1
    }

    // 创建客服记录
    const newService = {
      id: 'service_' + Date.now(),
      userId: parseInt(userId),
      name: name,
      wechatId: wechatId || '',
      serviceNumber: serviceNumber,
      qrcodeUrl: qrcodeUrl || '',
      qrcodeNumber: qrcodeNumber,
      avatar: wxUserInfo?.avatarUrl || wxUserInfo?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lrqI8L3RleHQ+PC9zdmc+',
      isActive: true,
      orderCount: 0,
      processingCount: 0,
      completedCount: 0,
      createdAt: new Date().toISOString()
    }

    services.push(newService)
    wx.setStorageSync('service_list', services)

    // 给该用户添加客服角色
    let userRoles = wx.getStorageSync('userRoles') || []
    if (!userRoles.includes('service')) {
      userRoles.push('service')
      wx.setStorageSync('userRoles', userRoles)
      
      // 同步到全局
      const app = getApp()
      if (app.globalData) {
        app.globalData.userRoles = userRoles
      }
    }

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    })

    this.hideAddModal()
    this.loadServiceList()

    console.log('客服添加成功:', newService)
    console.log('用户角色已更新:', userRoles)
  },

  // 绑定二维码（首次上传）
  bindQrcode(e) {
    const serviceId = e.currentTarget.dataset.id
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: 'base64',
          success: (fileRes) => {
            const base64 = 'data:image/jpeg;base64,' + fileRes.data
            
            // 更新客服二维码
            let services = wx.getStorageSync('service_list') || []
            const serviceIndex = services.findIndex(s => s.id === serviceId)
            
            if (serviceIndex !== -1) {
              // 生成二维码编号
              const allQrcodes = services.filter(s => s.qrcodeNumber).map(s => s.qrcodeNumber)
              const qrcodeNumber = allQrcodes.length > 0 
                ? Math.max(...allQrcodes) + 1
                : 1
              
              services[serviceIndex].qrcodeUrl = base64
              services[serviceIndex].qrcodeNumber = qrcodeNumber
              wx.setStorageSync('service_list', services)
              
              // 更新当前显示的客服信息
              this.setData({
                currentService: services[serviceIndex]
              })
              
              wx.showToast({ title: '绑定成功', icon: 'success' })
              this.loadServiceList()
            }
          },
          fail: (err) => {
            console.error('读取文件失败:', err)
            wx.showToast({ title: '绑定失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 更换二维码
  changeQrcode(e) {
    const serviceId = e.currentTarget.dataset.id
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: 'base64',
          success: (fileRes) => {
            const base64 = 'data:image/jpeg;base64,' + fileRes.data
            
            // 更新客服二维码
            let services = wx.getStorageSync('service_list') || []
            const serviceIndex = services.findIndex(s => s.id === serviceId)
            
            if (serviceIndex !== -1) {
              // 保持原有编号，只更新图片
              services[serviceIndex].qrcodeUrl = base64
              wx.setStorageSync('service_list', services)
              
              // 更新当前显示的客服信息
              this.setData({
                currentService: services[serviceIndex]
              })
              
              wx.showToast({ title: '更换成功', icon: 'success' })
              this.loadServiceList()
            }
          },
          fail: (err) => {
            console.error('读取文件失败:', err)
            wx.showToast({ title: '更换失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 查看客服详情
  viewServiceDetail(e) {
    const serviceId = e.currentTarget.dataset.id
    const services = wx.getStorageSync('service_list') || []
    const service = services.find(s => s.id === serviceId)
    
    if (service) {
      this.setData({
        showDetailModal: true,
        currentService: service
      })
    }
  },

  // 隐藏详情弹窗
  hideDetailModal() {
    this.setData({
      showDetailModal: false
    })
  },

  // 切换客服状态（Switch 开关）
  toggleServiceStatus(e) {
    const serviceId = e.currentTarget.dataset.id
    const newStatus = e.detail.value  // Switch 返回的新状态
    
    let services = wx.getStorageSync('service_list') || []
    const serviceIndex = services.findIndex(s => s.id === serviceId)
    
    if (serviceIndex !== -1) {
      services[serviceIndex].isActive = newStatus
      wx.setStorageSync('service_list', services)
      
      wx.showToast({
        title: newStatus ? '已设为在线' : '已设为离线',
        icon: 'success',
        duration: 1500
      })
      
      this.loadServiceList()
      
      console.log('客服状态已切换:', {
        serviceId: serviceId,
        serviceName: services[serviceIndex].name,
        newStatus: newStatus ? '在线' : '离线'
      })
    }
  },

  // 删除客服
  deleteService(e) {
    const serviceId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认移除',
      content: '确认移除该客服？移除后将撤销其客服权限',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          let services = wx.getStorageSync('service_list') || []
          const service = services.find(s => s.id === serviceId)
          
          if (service) {
            // 移除客服
            services = services.filter(s => s.id !== serviceId)
            wx.setStorageSync('service_list', services)
            
            // 撤销用户的客服角色
            const currentUserId = wx.getStorageSync('userId')
            if (service.userId == currentUserId) {
              let userRoles = wx.getStorageSync('userRoles') || []
              userRoles = userRoles.filter(r => r !== 'service')
              wx.setStorageSync('userRoles', userRoles)
              
              // 同步到全局
              const app = getApp()
              if (app.globalData) {
                app.globalData.userRoles = userRoles
              }
            }
            
            // 关闭详情弹窗
            this.hideDetailModal()
            
            wx.showToast({ title: '已移除', icon: 'success' })
            this.loadServiceList()
          }
        }
      }
    })
  }
})