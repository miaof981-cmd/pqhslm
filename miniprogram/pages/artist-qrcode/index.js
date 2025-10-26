Page({
  data: {
    qrcodeUrl: '' // 当前二维码URL
  },

  onLoad() {
    this.loadCurrentQRCode()
  },

  // 加载当前二维码
  loadCurrentQRCode() {
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    
    // 从本地存储读取画师工作二维码
    const artistQRCodes = wx.getStorageSync('artist_qrcodes') || {}
    const qrcodeUrl = artistQRCodes[userId] || ''
    
    console.log('📱 加载当前工作二维码:', qrcodeUrl ? '已设置' : '未设置')
    
    this.setData({
      qrcodeUrl: qrcodeUrl
    })
  },

  // 选择二维码图片
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
          this.setData({
            qrcodeUrl: tempFilePath
          })
          
          // 保存到本地存储
          this.saveQRCode(tempFilePath)
          
          wx.hideLoading()
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          })
        }, 500)
      }
    })
  },

  // 保存二维码
  saveQRCode(qrcodeUrl) {
    const app = getApp()
    const userId = app.globalData.userId || wx.getStorageSync('userId')
    
    // 读取现有的二维码数据
    const artistQRCodes = wx.getStorageSync('artist_qrcodes') || {}
    
    // 保存当前用户的二维码
    artistQRCodes[userId] = qrcodeUrl
    
    wx.setStorageSync('artist_qrcodes', artistQRCodes)
    
    console.log('✅ 工作二维码已保存')
  },

  // 完成设置
  completeSetup() {
    wx.showToast({
      title: '设置成功',
      icon: 'success',
      duration: 1500
    })
    
    setTimeout(() => {
      // 返回工作台
      wx.redirectTo({
        url: '/pages/workspace/index'
      })
    }, 1500)
  }
})

