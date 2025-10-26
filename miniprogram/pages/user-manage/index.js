Page({
  data: {
    searchKeyword: '',
    currentUser: null,
    originalRoles: [],
    allRoles: [
      { id: 'customer', name: '普通用户' },
      { id: 'artist', name: '画师' },
      { id: 'service', name: '客服' },
      { id: 'admin', name: '管理员' }
    ],
    recentLogs: []
  },

  onLoad() {
    this.loadRecentLogs()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 搜索用户
  searchUser() {
    const { searchKeyword } = this.data
    
    if (!searchKeyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '搜索中...' })

    // 模拟搜索 - 实际应该调用云函数
    setTimeout(() => {
      // 模拟用户数据
      const mockUser = {
        userId: searchKeyword,
        name: '张三',
        wechat: 'zhangsan123',
        roles: ['customer'],
        createTime: '2024-10-26 12:00:00'
      }

      this.setData({
        currentUser: mockUser,
        originalRoles: [...mockUser.roles]
      })

      wx.hideLoading()
      wx.showToast({
        title: '搜索成功',
        icon: 'success'
      })
    }, 500)
  },

  // 切换角色
  toggleRole(e) {
    const { role } = e.currentTarget.dataset
    const { currentUser } = this.data
    
    if (!currentUser) return

    const roles = [...currentUser.roles]
    const index = roles.indexOf(role)

    if (index > -1) {
      // 移除角色
      roles.splice(index, 1)
    } else {
      // 添加角色
      roles.push(role)
    }

    // 确保至少保留customer角色
    if (roles.length === 0) {
      roles.push('customer')
    }

    this.setData({
      'currentUser.roles': roles
    })
  },

  // 保存权限
  savePermissions() {
    const { currentUser, originalRoles } = this.data

    if (!currentUser) {
      wx.showToast({
        title: '请先搜索用户',
        icon: 'none'
      })
      return
    }

    // 检查是否有变化
    const hasChanged = JSON.stringify(currentUser.roles.sort()) !== JSON.stringify(originalRoles.sort())
    
    if (!hasChanged) {
      wx.showToast({
        title: '权限未变化',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认保存',
      content: `确定要修改用户 ${currentUser.name}(ID:${currentUser.userId}) 的权限吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doSavePermissions()
        }
      }
    })
  },

  // 执行保存
  doSavePermissions() {
    const { currentUser } = this.data

    wx.showLoading({ title: '保存中...' })

    // 模拟保存 - 实际应该调用云函数
    setTimeout(() => {
      // 更新本地存储（测试用）
      if (currentUser.userId === wx.getStorageSync('userId')) {
        wx.setStorageSync('userRoles', currentUser.roles)
      }

      // 添加操作记录
      const log = {
        id: Date.now(),
        time: new Date().toLocaleString(),
        content: `修改用户 ${currentUser.name}(ID:${currentUser.userId}) 的权限为：${currentUser.roles.map(r => this.getRoleName(r)).join('、')}`
      }

      const logs = [log, ...this.data.recentLogs].slice(0, 10)
      this.setData({
        recentLogs: logs,
        originalRoles: [...currentUser.roles]
      })

      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    }, 500)
  },

  // 重置权限
  resetPermissions() {
    const { originalRoles } = this.data

    this.setData({
      'currentUser.roles': [...originalRoles]
    })

    wx.showToast({
      title: '已重置',
      icon: 'success'
    })
  },

  // 获取角色名称
  getRoleName(roleId) {
    const role = this.data.allRoles.find(r => r.id === roleId)
    return role ? role.name : roleId
  },

  // 加载最近操作记录
  loadRecentLogs() {
    // 模拟数据 - 实际应该从云数据库读取
    const logs = []
    this.setData({ recentLogs: logs })
  }
})
