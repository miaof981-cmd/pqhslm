const cloudAPI = require('../../utils/cloud-api.js')

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

  // 加载当前二维码（从云端获取）
  async loadQRCode() {
    wx.showLoading({ title: '加载中...' })
    
    try {
      const res = await cloudAPI.getSystemSettings()
      
      if (res.success && res.data) {
        const contactQrcode = res.data.staff_contact_qrcode || ''
        const serviceQrcode = res.data.service_qrcode || res.data.complaint_qrcode || ''
        
        console.log('👔 从云端加载工作人员联系二维码:', contactQrcode ? '已设置' : '未设置')
        console.log('📞 从云端加载售后二维码:', serviceQrcode ? '已设置' : '未设置')
        
        this.setData({
          currentQRCode: contactQrcode,
          serviceQRCode: serviceQrcode
        })
      } else {
        console.warn('⚠️ 获取系统设置失败，使用默认值')
        this.setData({
          currentQRCode: '',
          serviceQRCode: ''
        })
      }
    } catch (error) {
      console.error('❌ 加载二维码失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 选择工作人员二维码（上传到云存储）
  chooseQRCode() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.showLoading({ title: '上传中...' })
        
        try {
          // 上传到云存储
          const cloudPath = `qrcodes/staff_contact_${Date.now()}.jpg`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          })
          
          console.log('☁️ 云存储上传成功:', uploadRes.fileID)
          
          // 保存到云数据库
          const saveRes = await cloudAPI.uploadStaffQRCode(uploadRes.fileID, cloudPath)
          
          if (saveRes.success) {
            this.setData({
              currentQRCode: uploadRes.fileID
            })
            
            wx.hideLoading()
            wx.showToast({
              title: '设置成功',
              icon: 'success'
            })
            
            console.log('✅ 工作人员联系二维码已更新（云端）')
          } else {
            throw new Error(saveRes.message || '保存失败')
          }
        } catch (error) {
          console.error('❌ 上传失败:', error)
          wx.hideLoading()
          wx.showToast({
            title: '上传失败: ' + (error.message || '未知错误'),
            icon: 'none',
            duration: 2000
          })
        }
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

  // 选择售后二维码（上传到云存储）
  chooseServiceQRCode() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.showLoading({ title: '上传中...' })
        
        try {
          // 上传到云存储
          const cloudPath = `qrcodes/service_qrcode_${Date.now()}.jpg`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          })
          
          console.log('☁️ 云存储上传成功:', uploadRes.fileID)
          
          // 保存到云数据库
          const saveRes = await cloudAPI.uploadServiceQRCode(uploadRes.fileID, cloudPath)
          
          if (saveRes.success) {
            this.setData({
              serviceQRCode: uploadRes.fileID
            })
            
            wx.hideLoading()
            wx.showToast({
              title: '设置成功',
              icon: 'success'
            })
            
            console.log('✅ 售后二维码已更新（云端）')
          } else {
            throw new Error(saveRes.message || '保存失败')
          }
        } catch (error) {
          console.error('❌ 上传失败:', error)
          wx.hideLoading()
          wx.showToast({
            title: '上传失败: ' + (error.message || '未知错误'),
            icon: 'none',
            duration: 2000
          })
        }
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

