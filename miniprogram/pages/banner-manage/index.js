Page({
  data: {
    loading: true,
    items: []
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const cloudAPI = require('../../utils/cloud-api.js')
      const res = await cloudAPI.getBannerList()
      
      if (res.success && res.data) {
        this.setData({ items: res.data });
        console.log('轮播图数量:', res.data.length)
      } else {
        console.error('加载轮播图失败:', res.message)
        this.setData({ items: [] });
      }
    } catch (error) {
      console.error('加载轮播图异常:', error)
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  showAddModal() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0]
        
        // 转换为 base64
        wx.getFileSystemManager().readFile({
          filePath: tempPath,
          encoding: 'base64',
          success: async (fileRes) => {
            const base64 = 'data:image/jpeg;base64,' + fileRes.data
            const cloudAPI = require('../../utils/cloud-api.js')
            
            // 创建轮播图
            const result = await cloudAPI.createBanner({
              image: base64,
              title: '轮播图',
              link: '',
              sort: 0
            })
            
            if (result.success) {
              wx.showToast({ title: '添加成功', icon: 'success' })
              this.loadData()
            } else {
              console.error('创建轮播图失败:', result.message)
              wx.showToast({ title: '添加失败', icon: 'none' })
            }
          },
          fail: (err) => {
            console.error('读取失败:', err)
            wx.showToast({ title: '添加失败', icon: 'none' })
          }
        })
      }
    })
  },

  editItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: '编辑功能开发中', icon: 'none' });
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个轮播图吗？',
      success: async (res) => {
        if (res.confirm) {
          const cloudAPI = require('../../utils/cloud-api.js')
          const result = await cloudAPI.deleteBanner(id)
          
          if (result.success) {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadData();
          } else {
            console.error('删除轮播图失败:', result.message)
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});