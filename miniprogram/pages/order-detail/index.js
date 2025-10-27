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
    const { order } = this.data
    
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' })
        
        const tempFilePaths = res.tempFilePaths
        
        // TODO: 这里应该上传到云存储或服务器
        // 目前先模拟上传成功
        
        setTimeout(() => {
          wx.hideLoading()
          
          // 标记作品已上传
          order.workUploaded = true
          order.workUploadTime = new Date().toLocaleString()
          
          // 更新本地存储
          this.updateOrderInStorage(order)
          
          this.setData({ order })
          
          wx.showModal({
            title: '上传成功',
            content: '作品已上传，是否立即通知客户确认订单？',
            confirmText: '立即通知',
            cancelText: '稍后通知',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 发送模板消息通知客户
                this.sendOrderCompleteNotice(order)
              } else {
                wx.showToast({
                  title: '上传成功',
                  icon: 'success'
                })
              }
            }
          })
        }, 1500)
      }
    })
  },

  // 发送订单完成通知（模板消息）
  sendOrderCompleteNotice(order) {
    console.log('📨 准备发送模板消息通知')
    console.log('订单信息:', {
      orderId: order.id,
      productName: order.productName,
      buyerOpenId: order.buyerOpenId || '待获取',
      artistName: order.artistName
    })
    
    // TODO: 调用云函数发送模板消息
    // 接口设计如下：
    /*
    wx.cloud.callFunction({
      name: 'sendTemplateMessage',
      data: {
        type: 'orderComplete',
        toUser: order.buyerOpenId,  // 买家的 openid
        data: {
          orderId: order.id,
          productName: order.productName,
          artistName: order.artistName,
          completeTime: order.workUploadTime,
          page: `pages/order-detail/index?id=${order.id}&source=customer`
        }
      },
      success: res => {
        console.log('✅ 模板消息发送成功:', res)
        wx.showToast({
          title: '已通知客户',
          icon: 'success'
        })
      },
      fail: err => {
        console.error('❌ 模板消息发送失败:', err)
        wx.showToast({
          title: '通知发送失败',
          icon: 'none'
        })
      }
    })
    */
    
    // 模拟发送成功
    wx.showLoading({ title: '发送通知中...' })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '已通知客户确认',
        icon: 'success',
        duration: 2000
      })
      
      console.log('✅ 模板消息已发送（模拟）')
      console.log('📱 客户将收到：')
      console.log('   标题: 您的作品已完成')
      console.log('   内容: 订单号：' + order.id)
      console.log('   内容: 商品名称：' + order.productName)
      console.log('   内容: 画师：' + order.artistName)
      console.log('   内容: 完成时间：' + order.workUploadTime)
      console.log('   提示: 点击查看详情并确认完成')
    }, 1000)
  },

  // 更新订单到本地存储
  updateOrderInStorage(order) {
    const pendingOrders = wx.getStorageSync('pending_orders') || []
    const index = pendingOrders.findIndex(o => o.id === order.id)
    
    if (index !== -1) {
      pendingOrders[index] = order
      wx.setStorageSync('pending_orders', pendingOrders)
      console.log('✅ 订单已更新到本地存储')
    }
  },

  // 联系买家
  contactCustomer() {
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
