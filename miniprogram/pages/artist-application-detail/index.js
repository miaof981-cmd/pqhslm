const app = getApp()
const cloudAPI = require('../../utils/cloud-api.js')

Page({
  data: {
    applicationId: '',
    application: null,
    statusText: ''
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ applicationId: id })
      this.loadApplication()
    } else {
      wx.showToast({
        title: '申请ID不存在',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // ✅ 从云端加载申请详情
  async loadApplication() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      // ✅ 从云端获取申请列表
      const res = await cloudAPI.getArtistApplicationList({})
      // 🛡️ 安全数组解析
      const allApplications = cloudAPI.safeArray(res)
      const application = allApplications.find(app => (app.id || app._id) === this.data.applicationId)
      
      if (!application) {
        wx.showToast({
          title: '申请不存在',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      // 状态文本映射
      const statusTextMap = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已驳回'
      }

      this.setData({
        application: application,
        statusText: statusTextMap[application.status] || '未知状态'
      })

      console.log('✅ 申请详情（云端版）:', application)
    } catch (err) {
      console.error('❌ 加载申请详情失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 预览图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({
      urls: urls,
      current: current
    })
  },

  // ✅ 通过申请（云端版）
  async approveApplication() {
    const { application } = this.data
    
    wx.showModal({
      title: '通过申请',
      content: `确认通过 ${application.name} 的画师申请？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            // ✅ 云端更新申请状态为approved
            const appId = application.id || application._id
            const result = await cloudAPI.updateArtistApplicationStatus(appId, 'approved')
            
            if (!result.success) {
              throw new Error(result.error || '审核失败')
            }
            
            // ✅ 如果是当前登录用户，更新全局角色
            const currentUserId = app.globalData.userId
            if (application.userId === currentUserId) {
              const rolesRes = await app.getUserRoles()
              let userRoles = rolesRes || ['customer']
              if (!userRoles.includes('artist')) {
                userRoles.push('artist')
                app.globalData.userRoles = userRoles
              }
            }
            
            wx.showToast({
              title: '审核通过',
              icon: 'success'
            })
            
            // 返回上一页并刷新
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (err) {
            console.error('❌ 审核通过失败:', err)
            wx.showToast({
              title: err.message || '审核失败',
              icon: 'none'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // ✅ 驳回申请（云端版）
  async rejectApplication() {
    const { application } = this.data
    
    wx.showModal({
      title: '驳回申请',
      editable: true,
      placeholderText: '请输入驳回原因（可选）',
      content: `确认驳回 ${application.name} 的画师申请？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            // ✅ 云端更新申请状态为rejected
            const appId = application.id || application._id
            const rejectReason = res.content ? res.content.trim() : '未通过审核'
            const result = await cloudAPI.updateArtistApplicationStatus(appId, 'rejected', rejectReason)
            
            if (!result.success) {
              throw new Error(result.error || '驳回失败')
            }
            
            wx.showToast({
              title: '已驳回',
              icon: 'success'
            })
            
            // 返回上一页并刷新
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (err) {
            console.error('❌ 驳回失败:', err)
            wx.showToast({
              title: err.message || '驳回失败',
              icon: 'none'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  }
})
