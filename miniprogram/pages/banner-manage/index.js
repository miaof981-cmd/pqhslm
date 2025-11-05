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
      // 从存储读取轮播图
      const banners = wx.getStorageSync('home_banners') || []
      
      this.setData({ items: banners });
      console.log('轮播图数量:', banners.length)
    } catch (error) {
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
          success: (fileRes) => {
            const base64 = 'data:image/jpeg;base64,' + fileRes.data
            
            // 获取现有轮播图
            let banners = wx.getStorageSync('home_banners') || []
            
            // 添加新轮播图
            const newBanner = {
              id: Date.now(),
              image: base64,
              title: '轮播图' + (banners.length + 1),
              link: '',
              createTime: new Date().toLocaleString('zh-CN')
            }
            
            banners.push(newBanner)
            wx.setStorageSync('home_banners', banners)
            
            wx.showToast({ title: '添加成功', icon: 'success' })
            this.loadData()
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
      success: (res) => {
        if (res.confirm) {
          let banners = wx.getStorageSync('home_banners') || []
          banners = banners.filter(b => b.id != id)
          wx.setStorageSync('home_banners', banners)
          
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadData();
        }
      }
    });
  }
});