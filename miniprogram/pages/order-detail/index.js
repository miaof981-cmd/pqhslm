const orderStatusUtil = require('../../utils/order-status')

Page({
  data: {
    loading: true,
    orderId: '',
    order: null,
    userRole: 'customer', // customer 或 artist
    
    // 打赏选项
    rewardOptions: [6, 10, 20, 50, 100],
    selectedReward: 0
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ orderId: id })
      this.loadOrderDetail(id)
    }
    
    // 获取用户角色 - 默认为顾客视角
    // 注意：订单详情页应该根据订单归属来判断，而不是用户角色
    // 如果是从"我的订单"进入，显示顾客视角
    // 如果是从"工作台"进入，显示画师视角
    const source = options.source || 'customer' // customer 或 artist
    this.setData({ userRole: source })
  },

  // 加载订单详情
  loadOrderDetail(orderId) {
    // 模拟从本地存储加载
    const allOrders = wx.getStorageSync('pending_orders') || []
    const completedOrders = wx.getStorageSync('completed_orders') || []
    const orders = [...allOrders, ...completedOrders]
    
    // 如果本地没有，使用工作台的模拟数据
    if (orders.length === 0) {
      this.loadMockOrder(orderId)
      return
    }
    
    let order = orders.find(o => o.id === orderId)
    
    if (order) {
      // 自动计算订单状态
      order = orderStatusUtil.calculateOrderStatus(order)
      
      // 计算进度步骤
      let step = 1
      if (order.status === 'inProgress' || order.status === 'nearDeadline' || order.status === 'overdue') {
        step = 2
      } else if (order.status === 'completed') {
        step = 3
      }
      
      this.setData({
        order: { ...order, step },
        loading: false
      })
      
      console.log('订单详情:', {
        id: order.id,
        deadline: order.deadline,
        status: order.status,
        statusText: order.statusText
      })
    } else {
      this.loadMockOrder(orderId)
    }
  },
  
  // 加载模拟订单数据
  loadMockOrder(orderId) {
    const mockOrder = {
      id: orderId,
      productName: 'Q版头像定制',
      productImage: '/assets/default-product.png',
      spec: '大头/手机壁纸',
      price: '88.00',
      status: 'inProgress',
      statusText: '进行中',
      createTime: '2025-10-25 14:32',
      deadline: '2025-10-30 23:59',
      urgent: false,
      step: 2,
      buyerName: '用户_' + orderId.slice(-4),
      artistName: '画师小明'
    }
    
    this.setData({
      order: mockOrder,
      loading: false
    })
  },

  // 选择打赏金额
  selectReward(e) {
    const amount = e.currentTarget.dataset.amount
    this.setData({
      selectedReward: amount
    })
  },

  // 自定义打赏金额
  showCustomReward() {
    wx.showModal({
      title: '自定义打赏金额',
      editable: true,
      placeholderText: '请输入金额（元）',
      success: (res) => {
        if (res.confirm && res.content) {
          const amount = parseFloat(res.content)
          if (amount > 0 && amount <= 500) {
            this.setData({
              selectedReward: amount
            })
          } else {
            wx.showToast({
              title: '金额范围：1-500元',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 确认打赏
  confirmReward() {
    const { selectedReward, order } = this.data
    
    if (!selectedReward) {
      wx.showToast({
        title: '请选择打赏金额',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认打赏',
      content: `确认打赏 ¥${selectedReward} 给画师？`,
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用后端接口
          wx.showLoading({ title: '处理中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            
            // 保存打赏记录
            const rewards = wx.getStorageSync('reward_records') || []
            rewards.push({
              id: Date.now(),
              orderId: order.id,
              amount: selectedReward,
              time: new Date().toLocaleString(),
              artistName: order.artistName
            })
            wx.setStorageSync('reward_records', rewards)
            
            wx.showToast({
              title: '打赏成功',
              icon: 'success'
            })
            
            this.setData({
              selectedReward: 0
            })
          }, 1000)
        }
      }
    })
  },

  // 上传作品
  uploadWork() {
    wx.showToast({
      title: '上传作品功能开发中',
      icon: 'none'
    })
  },

  // 联系买家
  contactCustomer() {
    wx.showToast({
      title: '查看客服二维码',
      icon: 'none'
    })
  },

  // 联系画师
  contactArtist() {
    wx.showToast({
      title: '查看客服二维码',
      icon: 'none'
    })
  },

  // 确认完成
  confirmComplete() {
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成？',
      success: (res) => {
        if (res.confirm) {
          const order = this.data.order
          order.status = 'completed'
          order.statusText = '已完成'
          order.step = 3
          order.completedTime = new Date().toLocaleString()
          
          this.setData({ order })
          
          wx.showToast({
            title: '已确认完成',
            icon: 'success'
          })
        }
      }
    })
  }
})
