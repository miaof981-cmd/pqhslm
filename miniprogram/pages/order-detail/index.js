const orderStatusUtil = require('../../utils/order-status')

Page({
  data: {
    loading: true,
    orderId: '',
    order: null,
    userRole: 'customer', // customer 或 artist
    
    // 打赏选项
    rewardOptions: [6, 10, 20, 50, 100],
    selectedReward: 0,
    
    // 二维码弹窗
    showServiceQR: false,
    showComplaintQR: false,
    serviceQRCode: '',
    complaintQRCode: ''
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
      
      // 计算进度百分比和脱稿信息（复用订单列表页的逻辑）
      const progressData = this.calculateProgress(order)
      
      // 添加状态 CSS 类名
      order.statusClass = orderStatusUtil.classOf(order.status)
      
      // 加载客服二维码
      this.loadServiceQRCode(order)
      
      this.setData({
        order: { 
          ...order, 
          ...progressData
        },
        loading: false
      })
      
      console.log('📦 订单详情加载:', {
        id: order.id,
        deadline: order.deadline,
        status: order.status,
        statusText: order.statusText,
        progressPercent: progressData.progressPercent,
        isOverdue: progressData.isOverdue,
        overdueDays: progressData.overdueDays,
        serviceName: order.serviceName,
        serviceId: order.serviceId
      })
    } else {
      this.loadMockOrder(orderId)
    }
  },
  
  // 加载客服二维码
  loadServiceQRCode(order) {
    if (!order.serviceId) {
      console.warn('⚠️ 订单未分配客服，无法加载二维码')
      return
    }
    
    // 从本地存储读取客服列表
    const serviceList = wx.getStorageSync('customer_service_list') || []
    const service = serviceList.find(s => s.id === order.serviceId || s.userId === order.serviceId)
    
    if (service && service.qrCode) {
      console.log('✅ 成功加载客服二维码:', service.name)
      this.setData({
        'order.serviceQRCode': service.qrCode
      })
    } else {
      console.warn('⚠️ 客服二维码未找到:', {
        serviceId: order.serviceId,
        serviceName: order.serviceName,
        找到的客服: service ? service.name : '未找到'
      })
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

  // 画师标记已完成
  markComplete() {
    const { order } = this.data
    
    wx.showModal({
      title: '标记已完成',
      content: '确认作品已在群里交付完成？\n\n标记后将自动通知客户去群里查看作品并确认订单。',
      confirmText: '确认完成',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          // 标记订单为已完成
          order.workCompleted = true
          order.workCompleteTime = this.formatDateTime(new Date())
          
          // 更新本地存储
          this.updateOrderInStorage(order)
          
          this.setData({ order })
          
          setTimeout(() => {
            wx.hideLoading()
            
            // 发送模板消息通知客户
            this.sendOrderCompleteNotice(order)
          }, 500)
        }
      }
    })
  },
  
  // 格式化日期时间
  formatDateTime(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
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
          completeTime: order.workCompleteTime,
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
      wx.showModal({
        title: '通知已发送',
        content: '已通过微信服务通知提醒客户去群里查看作品并确认订单。',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          // 返回上一页
          wx.navigateBack()
        }
      })
      
      console.log('✅ 模板消息已发送（模拟）')
      console.log('📱 客户将收到：')
      console.log('   标题: 您的作品已完成')
      console.log('   内容: 订单号：' + order.id)
      console.log('   内容: 商品名称：' + order.productName)
      console.log('   内容: 画师：' + order.artistName)
      console.log('   内容: 完成时间：' + order.workCompleteTime)
      console.log('   提示: 请前往群聊查看作品，并点击确认完成订单')
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

  // 复制订单号
  copyOrderNo() {
    const orderId = this.data.order.id || this.data.order.orderNumber
    wx.setClipboardData({
      data: orderId.toString(),
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        })
      }
    })
  },

  // 复制群名
  copyGroupName() {
    const order = this.data.order
    if (!order) return

    // 获取订单号后四位
    const orderId = order.id || order.orderNumber || ''
    const last4Digits = orderId.toString().slice(-4)

    // 获取截稿日期（格式：x月x日）- iOS 兼容
    let deadlineText = ''
    if (order.deadline) {
      // 将 "yyyy-MM-dd HH:mm:ss" 转换为 "yyyy/MM/dd HH:mm:ss"（iOS 兼容）
      const iosCompatibleDate = order.deadline.replace(/-/g, '/')
      const deadlineDate = new Date(iosCompatibleDate)
      const month = deadlineDate.getMonth() + 1
      const day = deadlineDate.getDate()
      
      // 检查日期是否有效
      if (!isNaN(month) && !isNaN(day)) {
        deadlineText = `${month}月${day}日`
      } else {
        console.error('❌ 日期解析失败:', order.deadline)
        deadlineText = '日期'
      }
    }

    // 获取商品名
    const productName = order.productName || '商品'

    // 生成群名：【联盟xxxx】x月x日出商品名
    const groupName = `【联盟${last4Digits}】${deadlineText}出${productName}`

    wx.setClipboardData({
      data: groupName,
      success: () => {
        wx.showToast({
          title: '群名已复制',
          icon: 'success'
        })
      }
    })
  },

  // 联系客服
  contactService() {
    // 从本地存储读取客服二维码
    const serviceQRCode = wx.getStorageSync('service_qrcode') || '/assets/default-service-qr.png'
    
    this.setData({
      serviceQRCode: serviceQRCode,
      showServiceQR: true
    })
  },

  // 投诉
  showComplaint() {
    // 从本地存储读取投诉二维码
    const complaintQRCode = wx.getStorageSync('complaint_qrcode') || '/assets/default-complaint-qr.png'
    
    this.setData({
      complaintQRCode: complaintQRCode,
      showComplaintQR: true
    })
  },

  // 隐藏二维码弹窗
  hideQRModal() {
    this.setData({
      showServiceQR: false,
      showComplaintQR: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击弹窗内容时关闭
  },

  // 确认完成
  confirmComplete() {
    const orderId = this.data.order.id
    
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成？完成后将无法撤销',
      confirmColor: '#A8E6CF',
      success: (res) => {
        if (res.confirm) {
          // 从本地存储读取订单
          const orders = wx.getStorageSync('orders') || []
          const pendingOrders = wx.getStorageSync('pending_orders') || []
          
          // 在两个存储中都查找并更新
          let updated = false
          
          const updateOrderStatus = (orderList) => {
            return orderList.map(order => {
              if (order.id === orderId) {
                updated = true
                return {
                  ...order,
                  status: 'completed',
                  completedAt: new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  }).replace(/\//g, '-')
                }
              }
              return order
            })
          }
          
          const updatedOrders = updateOrderStatus(orders)
          const updatedPendingOrders = updateOrderStatus(pendingOrders)
          
          if (updated) {
            // 保存更新后的订单
            wx.setStorageSync('orders', updatedOrders)
            wx.setStorageSync('pending_orders', updatedPendingOrders)
            
            wx.showToast({
              title: '订单已完成',
              icon: 'success'
            })
            
            // 延迟刷新页面
            setTimeout(() => {
              this.loadOrderDetail(orderId)
            }, 500)
          } else {
            wx.showToast({
              title: '订单未找到',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 计算订单进度百分比（复用订单列表页逻辑）
  calculateProgress(order) {
    if (order.status === 'completed') {
      return { 
        progressPercent: 100, 
        isOverdue: false, 
        isNearDeadline: false,
        overdueDays: 0 
      }
    }
    
    try {
      // 将日期字符串转换为 iOS 兼容格式（yyyy/MM/dd HH:mm:ss）
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date()
        return new Date(dateStr.replace(/-/g, '/'))
      }
      
      // 精确到小时和分钟的时间戳
      const createDate = parseDate(order.createTime).getTime()
      const deadlineDate = parseDate(order.deadline).getTime()
      const nowDate = new Date().getTime()
      
      if (isNaN(createDate) || isNaN(deadlineDate)) {
        return { 
          progressPercent: 5, 
          isOverdue: false, 
          isNearDeadline: false,
          overdueDays: 0 
        }
      }
      
      // 计算精确的时间差（毫秒）
      const oneDayMs = 24 * 60 * 60 * 1000
      const totalMs = deadlineDate - createDate
      const elapsedMs = nowDate - createDate
      
      // 按毫秒比例计算进度
      let progressPercent = Math.round((elapsedMs / totalMs) * 100)
      
      // 判断是否脱稿（精确到毫秒）
      const isOverdue = nowDate > deadlineDate
      // 脱稿天数：只有满24小时才算1天
      const overdueDays = isOverdue ? Math.floor((nowDate - deadlineDate) / oneDayMs) : 0
      
      // 判断是否临近截稿（剩余时间 <= 24小时）
      const timeLeft = deadlineDate - nowDate
      const isNearDeadline = !isOverdue && timeLeft <= oneDayMs
      
      // 限制范围
      if (progressPercent < 5) progressPercent = 5    // 最小显示5%
      if (progressPercent > 100) progressPercent = 100
      
      return { progressPercent, isOverdue, isNearDeadline, overdueDays }
    } catch (error) {
      console.error('计算进度失败:', error)
      return { 
        progressPercent: 5, 
        isOverdue: false, 
        isNearDeadline: false,
        overdueDays: 0 
      }
    }
  }
})
