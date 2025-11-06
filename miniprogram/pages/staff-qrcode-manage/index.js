Page({
  data: {
    currentQRCode: '', // 当前的工作人员二维码
    serviceQRCode: '' // 售后二维码
  },

  onLoad() {
    this.loadQRCode()
  },

  onShow() {
    this.loadQRCode()
  },

  // 加载当前二维码
  loadQRCode() {
    const contactQrcode = wx.getStorageSync('staff_contact_qrcode') || ''
    const systemSettings = wx.getStorageSync('system_settings') || {}
    const serviceQrcode = systemSettings.serviceQrcode || ''
    
    console.log('👔 加载工作人员联系二维码:', contactQrcode ? '已设置' : '未设置')
    console.log('📞 加载售后二维码:', serviceQrcode ? '已设置' : '未设置')
    
    this.setData({
      currentQRCode: contactQrcode,
      serviceQRCode: serviceQrcode
    })
  },

  // 选择二维码
  chooseQRCode() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.showLoading({ title: '上传中...' })
        
        // 暂时使用本地图片路径（实际项目中应上传到云存储）
        setTimeout(() => {
          // 保存到本地存储
          wx.setStorageSync('staff_contact_qrcode', tempFilePath)
          
          this.setData({
            currentQRCode: tempFilePath
          })
          
          wx.hideLoading()
          wx.showToast({
            title: '设置成功',
            icon: 'success'
          })
          
          console.log('✅ 工作人员联系二维码已更新')
        }, 500)
      }
    })
  },

  // 预览工作人员二维码
  previewQRCode() {
    wx.previewImage({
      urls: [this.data.currentQRCode],
      current: this.data.currentQRCode
    })
  },

  // 选择售后二维码
  chooseServiceQRCode() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.showLoading({ title: '上传中...' })
        
        // 转换为 base64
        const fs = wx.getFileSystemManager()
        fs.readFile({
          filePath: tempFilePath,
          encoding: 'base64',
          success: (fileRes) => {
            const base64 = 'data:image/jpeg;base64,' + fileRes.data
            
            // 保存到系统设置
            const systemSettings = wx.getStorageSync('system_settings') || {}
            systemSettings.serviceQrcode = base64
            wx.setStorageSync('system_settings', systemSettings)
            
            this.setData({
              serviceQRCode: base64
            })
            
            wx.hideLoading()
            wx.showToast({
              title: '设置成功',
              icon: 'success'
            })
            
            console.log('✅ 售后二维码已更新')
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        })
      }
    })
  },

  // 预览售后二维码
  previewServiceQRCode() {
    wx.previewImage({
      urls: [this.data.serviceQRCode],
      current: this.data.serviceQRCode
    })
  }
})

