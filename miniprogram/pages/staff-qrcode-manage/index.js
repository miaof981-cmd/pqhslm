Page({
  data: {
    currentQRCode: '' // 当前的工作人员二维码
  },

  onLoad() {
    this.loadQRCode()
  },

  onShow() {
    this.loadQRCode()
  },

  // 加载当前二维码
  loadQRCode() {
    const qrcode = wx.getStorageSync('staff_contact_qrcode') || ''
    
    console.log('👔 加载工作人员联系二维码:', qrcode ? '已设置' : '未设置')
    
    this.setData({
      currentQRCode: qrcode
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

  // 预览二维码
  previewQRCode() {
    wx.previewImage({
      urls: [this.data.currentQRCode],
      current: this.data.currentQRCode
    })
  }
})

