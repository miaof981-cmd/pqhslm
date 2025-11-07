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
    
    // 🎯 打印头像信息用于调试
    services.forEach(s => {
      console.log(`客服 ${s.name}: avatar=${s.avatar ? s.avatar.substring(0, 50) + '...' : '❌空'}`)
    })
    
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

    // 🎯 移除1001限制 - 允许添加任何用户ID为客服
    // 注意：生产环境应从数据库验证用户是否存在

    // 🎯 从users列表获取用户信息
    const allUsers = wx.getStorageSync('users') || []
    const targetUser = allUsers.find(u => u.id == userId || u.userId == userId)
    const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')
    
    let userAvatar = DEFAULT_AVATAR_DATA
    let userNickName = name
    
    if (targetUser) {
      userAvatar = targetUser.avatarUrl || DEFAULT_AVATAR_DATA
      userNickName = targetUser.nickName || targetUser.name || name
      console.log('✅ 从users列表获取到用户信息:', userNickName)
    } else {
      // 如果是当前用户自己，从userInfo读取
      const currentUserId = wx.getStorageSync('userId')
      if (userId == currentUserId) {
        const userInfo = wx.getStorageSync('userInfo') || {}
        userAvatar = userInfo.avatarUrl || DEFAULT_AVATAR_DATA
        userNickName = userInfo.nickName || name
      }
    }

    console.log('📋 准备添加客服:')
    console.log('  - 用户ID:', userId)
    console.log('  - 客服姓名:', name)
    console.log('  - 用户昵称:', userNickName)
    console.log('  - 用户头像:', userAvatar.substring(0, 50) + '...')

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
      nickName: userNickName,  // 保存用户昵称
      wechatId: wechatId || '',
      serviceNumber: serviceNumber,
      qrcodeUrl: qrcodeUrl || '',
      qrcodeNumber: qrcodeNumber,
      avatar: userAvatar,  // 使用转换后的头像（base64 或 DEFAULT_AVATAR_DATA）
      avatarUrl: userAvatar,  // 同时保存到 avatarUrl 字段（兼容性）
      isActive: true,
      orderCount: 0,
      processingCount: 0,
      completedCount: 0,
      createdAt: new Date().toISOString()
    }

    services.push(newService)
    wx.setStorageSync('service_list', services)
    
    // 🎯 同步到 customer_service_list（统一客服数据源）
    wx.setStorageSync('customer_service_list', services)

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
              wx.setStorageSync('customer_service_list', services)  // 同步
              
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
              wx.setStorageSync('customer_service_list', services)  // 同步
              
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

  // 显示编辑客服弹窗
  showEditServiceModal(e) {
    const serviceId = e.currentTarget.dataset.id
    const services = wx.getStorageSync('service_list') || []
    const service = services.find(s => s.id === serviceId)
    
    if (service) {
      this.setData({
        showEditModal: true,
        showDetailModal: false,
        editService: {
          id: service.id,
          userId: service.userId,
          name: service.name,
          wechatId: service.wechatId || ''
        }
      })
    }
  },

  // 确认编辑客服
  async confirmEditService() {
    const { id, userId, name, wechatId } = this.data.editService
    
    if (!userId) {
      wx.showToast({ title: '请输入用户ID', icon: 'none' })
      return
    }
    if (!name) {
      wx.showToast({ title: '请输入客服姓名', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      let services = wx.getStorageSync('service_list') || []
      const serviceIndex = services.findIndex(s => s.id === id)
      
      if (serviceIndex === -1) {
        wx.hideLoading()
        wx.showToast({ title: '客服不存在', icon: 'none' })
        return
      }

      // 🎯 如果修改了用户ID，重新读取用户头像
      if (services[serviceIndex].userId !== userId) {
        console.log('用户ID已变更，重新读取头像...')
        
        const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')
        let userAvatar = DEFAULT_AVATAR_DATA
        
        // 🎯 如果修改的是当前登录用户的ID，读取当前用户头像
        const currentUserId = wx.getStorageSync('userId')
        if (String(userId) === String(currentUserId)) {
          const userInfo = wx.getStorageSync('userInfo') || {}
          userAvatar = userInfo.avatarUrl || DEFAULT_AVATAR_DATA
          console.log('读取当前用户头像:', userAvatar ? '有' : '无')
        } else {
          // 🎯 如果是其他用户，从用户列表中查找
          const allUsers = wx.getStorageSync('users') || []
          const targetUser = allUsers.find(u => String(u.userId) === String(userId))
          if (targetUser && targetUser.avatarUrl) {
            userAvatar = targetUser.avatarUrl
            console.log('从用户列表读取头像:', userAvatar ? '有' : '无')
          } else {
            console.log('⚠️ 用户列表中未找到用户', userId)
          }
        }
        
        // 如果是临时路径，转换为 base64
        if (userAvatar && userAvatar.startsWith('http://tmp/')) {
          console.log('临时头像转换中...')
          userAvatar = await this.convertTempAvatar(userAvatar)
        }
        
        services[serviceIndex].avatar = userAvatar
        services[serviceIndex].avatarUrl = userAvatar
        console.log('✅ 头像已更新为:', userAvatar.substring(0, 60) + '...')
      }

      // 更新基本信息
      services[serviceIndex].userId = userId
      services[serviceIndex].name = name
      services[serviceIndex].nickName = name
      services[serviceIndex].wechatId = wechatId

      wx.setStorageSync('service_list', services)
      wx.setStorageSync('customer_service_list', services)

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      
      this.hideEditModal()
      
      // 🎯 强制刷新客服列表，确保头像更新
      setTimeout(() => {
        this.loadServiceList()
      }, 300)

      console.log('客服信息已更新:', services[serviceIndex])
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 转换临时头像为 base64
  async convertTempAvatar(tempPath) {
    const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')
    
    return new Promise((resolve) => {
      try {
        const fs = wx.getFileSystemManager()
        fs.readFile({
          filePath: tempPath,
          encoding: 'base64',
          success: (res) => {
            const base64 = 'data:image/jpeg;base64,' + res.data
            resolve(base64)
          },
          fail: (err) => {
            console.error('转换失败:', err)
            resolve(DEFAULT_AVATAR_DATA)
          }
        })
      } catch (err) {
        console.error('转换异常:', err)
        resolve(DEFAULT_AVATAR_DATA)
      }
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
      wx.setStorageSync('customer_service_list', services)  // 同步
      
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
            wx.setStorageSync('customer_service_list', services)  // 同步
            
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