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
      // 模拟数据
      const mockData = [];
      for (let i = 1; i <= 5; i++) {
        mockData.push({
          _id: i.toString(),
          name: '公告' + i,
          title: '公告标题' + i
        });
      }
      this.setData({ items: mockData });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  showAddModal() {
    wx.showToast({ title: '添加功能开发中', icon: 'none' });
  },

  editItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: '编辑功能开发中', icon: 'none' });
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个公告吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadData();
        }
      }
    });
  }
});