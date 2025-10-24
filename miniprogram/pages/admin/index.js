Page({
  data: {
    currentTab: 'artists',
    applications: [],
    notices: [],
    serviceQRs: [],
    banners: [],
    loading: true
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    this.loadData()
  },

  // 检查管理员权限
  checkPermission() {
    const app = getApp()
    if (!app.checkPermission('admin')) {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/home/index'
          })
        }
      })
      return
    }
    this.loadData()
  },

  // 加载所有数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadApplications(),
        this.loadNotices(),
        this.loadServiceQRs(),
        this.loadBanners()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载画师申请
  async loadApplications() {
    // 暂时使用模拟数据
    this.setData({
      applications: [
        {
          _id: 'app-1',
          name: '张三',
          phone: '13800138000',
          specialty: '插画设计',
          portfolio: ['https://via.placeholder.com/200x200.png?text=作品1'],
          status: 'pending',
          createTime: '2024-01-01'
        }
      ]
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const res = await wx.cloud.database().collection('applications')
    //     .orderBy('createTime', 'desc')
    //     .get()
    //   
    //   this.setData({ applications: res.data })
    // } catch (error) {
    //   console.error('加载申请失败', error)
    // }
  },

  // 加载公告
  async loadNotices() {
    // 暂时使用模拟数据
    this.setData({
      notices: [
        {
          _id: 'notice-1',
          title: '欢迎使用画师商城',
          content: '这是一个示例公告',
          status: 'active',
          createTime: '2024-01-01'
        }
      ]
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const res = await wx.cloud.database().collection('notices')
    //     .orderBy('createTime', 'desc')
    //     .get()
    //   
    //   this.setData({ notices: res.data })
    // } catch (error) {
    //   console.error('加载公告失败', error)
    // }
  },

  // 加载客服二维码
  async loadServiceQRs() {
    // 暂时使用模拟数据
    this.setData({
      serviceQRs: [
        {
          _id: 'qr-1',
          imageUrl: 'https://via.placeholder.com/200x200.png?text=客服二维码1',
          title: '客服二维码1',
          isActive: true,
          assignedCount: 5
        }
      ]
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const res = await wx.cloud.database().collection('serviceQR')
    //     .orderBy('createTime', 'desc')
    //     .get()
    //   
    //   this.setData({ serviceQRs: res.data })
    // } catch (error) {
    //   console.error('加载客服二维码失败', error)
    // }
  },

  // 加载轮播图
  async loadBanners() {
    // 暂时使用模拟数据
    this.setData({
      banners: [
        {
          _id: 'banner-1',
          imageUrl: 'https://via.placeholder.com/750x300.png?text=轮播图1',
          title: '轮播图1',
          isActive: true,
          sort: 0
        }
      ]
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const res = await wx.cloud.database().collection('banners')
    //     .orderBy('sort', 'asc')
    //     .get()
    //   
    //   this.setData({ banners: res.data })
    // } catch (error) {
    //   console.error('加载轮播图失败', error)
    // }
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 审核画师申请
  async reviewApplication(e) {
    const { id, action } = e.currentTarget.dataset
    
    wx.showToast({
      title: action === 'approved' ? '已通过' : '已驳回',
      icon: 'success'
    })
    
    // 云开发版本（需要先开通云开发）
    // const app = getApp()
    // 
    // try {
    //   wx.showLoading({ title: '处理中...' })
    //   
    //   await wx.cloud.database().collection('applications').doc(id).update({
    //     data: {
    //       status: action,
    //       reviewTime: new Date(),
    //       reviewerId: app.globalData.openid
    //     }
    //   })
    //   
    //   // 如果通过申请，更新用户角色
    //   if (action === 'approved') {
    //     const application = this.data.applications.find(app => app._id === id)
    //     await wx.cloud.database().collection('users').where({
    //       openid: application.openid
    //     }).update({
    //       data: {
    //         role: 'artist'
    //       }
    //     })
    //   }
    //   
    //   wx.hideLoading()
    //   wx.showToast({
    //     title: action === 'approved' ? '已通过' : '已驳回',
    //     icon: 'success'
    //   })
    //   
    //   this.loadApplications()
    //   
    // } catch (error) {
    //   wx.hideLoading()
    //   console.error('审核失败', error)
    //   wx.showToast({
    //     title: '操作失败',
    //     icon: 'none'
    //   })
    // }
  },

  // 添加公告
  async addNotice() {
    wx.showModal({
      title: '添加公告',
      editable: true,
      placeholderText: '请输入公告标题',
      success: async (res) => {
        if (res.confirm && res.content) {
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 添加客服二维码
  async addServiceQR() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 添加轮播图
  async addBanner() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})