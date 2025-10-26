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

  // 加载申请详情
  loadApplication() {
    const allApplications = wx.getStorageSync('artist_applications') || []
    const application = allApplications.find(app => app.id === this.data.applicationId)
    
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

    console.log('申请详情:', application)
  },

  // 预览图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({
      urls: urls,
      current: current
    })
  },

  // 通过申请
  approveApplication() {
    const { application } = this.data
    
    wx.showModal({
      title: '通过申请',
      content: `确认通过 ${application.name} 的画师申请？`,
      success: (res) => {
        if (res.confirm) {
          // 更新申请状态
          let allApplications = wx.getStorageSync('artist_applications') || []
          const index = allApplications.findIndex(app => app.id === application.id)
          
          if (index !== -1) {
            allApplications[index].status = 'approved'
            allApplications[index].approveTime = new Date().toLocaleString('zh-CN')
            wx.setStorageSync('artist_applications', allApplications)
            
            // 给用户添加画师权限
            const userId = allApplications[index].userId
            const currentUserId = wx.getStorageSync('userId')
            
            if (userId === currentUserId) {
              let userRoles = wx.getStorageSync('userRoles') || ['customer']
              if (!userRoles.includes('artist')) {
                userRoles.push('artist')
                wx.setStorageSync('userRoles', userRoles)
                
                const app = getApp()
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
          }
        }
      }
    })
  },

  // 驳回申请
  rejectApplication() {
    const { application } = this.data
    
    wx.showModal({
      title: '驳回申请',
      content: `确认驳回 ${application.name} 的画师申请？`,
      success: (res) => {
        if (res.confirm) {
          // 更新申请状态
          let allApplications = wx.getStorageSync('artist_applications') || []
          const index = allApplications.findIndex(app => app.id === application.id)
          
          if (index !== -1) {
            allApplications[index].status = 'rejected'
            allApplications[index].rejectTime = new Date().toLocaleString('zh-CN')
            wx.setStorageSync('artist_applications', allApplications)
            
            wx.showToast({
              title: '已驳回',
              icon: 'success'
            })
            
            // 返回上一页并刷新
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }
        }
      }
    })
  }
})

