Page({
  data: {
    currentTab: 'all',
    tabs: [
      { label: '全部', value: 'all', count: 0 },
      { label: '待支付', value: 'unpaid', count: 0 },
      { label: '制作中', value: 'processing', count: 0 },
      { label: '已完成', value: 'completed', count: 0 }
    ],
    orders: [],
    allOrders: [],
    loading: true,
    emptyText: '暂无订单'
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ currentTab: options.status })
    }
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
  },

  // 加载订单列表
  async loadOrders() {
    this.setData({ loading: true })
    
    try {
      // 模拟加载订单数据
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 从本地存储加载真实订单
      const pendingOrders = wx.getStorageSync('pending_orders') || []
      const completedOrders = wx.getStorageSync('completed_orders') || []
      
      console.log('========================================')
      console.log('📦 我的订单页 - 数据加载')
      console.log('========================================')
      console.log('进行中订单数量:', pendingOrders.length)
      console.log('已完成订单数量:', completedOrders.length)
      
      if (pendingOrders.length === 0 && completedOrders.length === 0) {
        console.error('❌ 没有加载到任何订单！')
        console.log('可能原因:')
        console.log('1. 订单未保存到 pending_orders')
        console.log('2. 本地存储被清空')
        console.log('3. 订单保存逻辑未执行')
      } else {
        console.log('✅ 成功加载订单数据')
        if (pendingOrders.length > 0) {
          console.log('\n进行中订单详情:')
          pendingOrders.forEach((o, i) => {
            console.log(`  ${i + 1}. ID: ${o.id}, 商品: ${o.productName}, 价格: ${o.price}`)
          })
        }
      }
      
      // 合并所有订单
      let allOrders = [...pendingOrders, ...completedOrders]
      
      // 转换为订单列表需要的格式
      const mockOrders = allOrders.map(order => {
        // 映射状态
        let status = 'processing'
        let statusText = '制作中'
        
        if (order.status === 'completed') {
          status = 'completed'
          statusText = '已完成'
        } else if (order.status === 'inProgress' || order.status === 'nearDeadline' || order.status === 'overdue') {
          status = 'processing'
          statusText = '制作中'
        }
        
        // 画师信息兜底逻辑
        let artistName = order.artistName
        if (!artistName || artistName === '待分配') {
          // 尝试从用户信息获取
          const userInfo = wx.getStorageSync('userInfo')
          artistName = userInfo?.nickName || '画师'
          console.log('⚠️ 订单缺少画师信息，使用兜底:', artistName)
        }
        
        // 截稿时间格式化显示
        let deadlineDisplay = order.deadline
        if (deadlineDisplay) {
          // 如果是完整日期时间，只显示日期部分
          // "2025-11-03 14:11" → "2025-11-03"
          deadlineDisplay = deadlineDisplay.split(' ')[0]
        }
        
        // 下单时间格式化显示
        let createTimeDisplay = order.createTime
        if (createTimeDisplay) {
          // "2025-10-27 14:11:43" → "2025-10-27 14:11"
          const parts = createTimeDisplay.split(' ')
          if (parts.length === 2) {
            const timePart = parts[1].split(':')
            createTimeDisplay = `${parts[0]} ${timePart[0]}:${timePart[1]}`
          }
        }
        
        // 计算进度百分比和是否脱稿
        const progressData = this.calculateProgress(order)
        
        return {
          _id: order.id,
          orderNo: order.id,
          productId: order.productId || '',
          productName: order.productName,
          productImage: order.productImage,
          artistName: artistName,
          deliveryDays: order.deliveryDays || 7,
          amount: order.price,
          status: status,
          statusText: statusText,
          progress: status === 'completed' ? 100 : 60,
          createTime: createTimeDisplay,
          deadline: deadlineDisplay,
          progressPercent: progressData.percent,
          isOverdue: progressData.isOverdue,
          reviewed: false
        }
      })
      
      console.log('=== 转换后订单详情 ===')
      console.log('订单数量:', mockOrders.length)
      mockOrders.forEach(o => {
        console.log(`\n订单: ${o.orderNo}`)
        console.log(`- 商品: ${o.productName}`)
        console.log(`- 状态: ${o.statusText}`)
        console.log(`- 图片: ${o.productImage}`)
        console.log(`- 是否临时路径: ${o.productImage ? o.productImage.includes('tmp') : '无'}`)
      })

      // 计算各状态数量
      const statusCounts = {
        unpaid: 0,
        processing: 0,
        completed: 0
      }
      
      mockOrders.forEach(order => {
        if (statusCounts[order.status] !== undefined) {
          statusCounts[order.status]++
        }
      })

      const tabs = this.data.tabs.map(tab => {
        if (tab.value === 'all') {
          return { ...tab, count: mockOrders.length }
        }
        return { ...tab, count: statusCounts[tab.value] || 0 }
      })

      this.setData({
        allOrders: mockOrders,
        tabs
      })

      this.filterOrders()
    } catch (error) {
      console.error('加载订单失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.filterOrders()
  },

  // 筛选订单
  filterOrders() {
    const { currentTab, allOrders } = this.data
    let orders = allOrders
    let emptyText = '暂无订单'

    if (currentTab !== 'all') {
      orders = allOrders.filter(order => order.status === currentTab)
      const tabItem = this.data.tabs.find(t => t.value === currentTab)
      emptyText = `暂无${tabItem ? tabItem.label : ''}订单`
    }

    this.setData({ orders, emptyText })
  },

  // 查看订单详情
  viewOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}&source=customer`
    })
  },

  // 支付订单
  payOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '支付订单',
      content: '确认支付此订单？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '支付中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrders()
          }, 1000)
        }
      }
    })
  },

  // 取消订单
  cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消订单',
      content: '确定要取消此订单吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadOrders()
          }, 500)
        }
      }
    })
  },

  // 联系客服
  contactService(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    })
    wx.showToast({ title: '请在订单详情页查看客服二维码', icon: 'none', duration: 2000 })
  },

  // 申请退款
  applyRefund(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '申请退款',
      content: '确认申请退款？退款后订单将被取消',
      confirmColor: '#FF9800',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已提交退款申请', icon: 'success' })
          this.loadOrders()
        }
      }
    })
  },

  // 删除订单
  deleteOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除订单',
      content: '确定要删除此订单吗？删除后无法恢复',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            this.loadOrders()
          }, 500)
        }
      }
    })
  },

  // 评价订单
  reviewOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '评价订单',
      content: '请对本次服务进行评价（评价功能待完善）',
      confirmText: '去评价',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到评价页面或显示评价弹窗
          wx.showToast({ title: '感谢您的评价', icon: 'success' })
        }
      }
    })
  },

  // 查看评价
  viewReview(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    })
  },

  // 再次购买
  buyAgain(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/index?id=${productId}`
    })
  },

  // 查看退款进度
  viewRefund(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    })
  },

  // 去逛逛
  goShopping() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOrders()
    wx.stopPullDownRefresh()
  },
  
  // 图片加载失败处理
  onImageError(e) {
    const orderId = e.currentTarget.dataset.id
    console.error('❌ 图片加载失败 - 订单ID:', orderId)
    
    // 查找对应订单并清空图片路径（显示占位符）
    const orders = this.data.orders
    const index = orders.findIndex(o => o._id === orderId)
    
    if (index !== -1) {
      const failedImage = orders[index].productImage
      console.error('失败的图片路径:', failedImage)
      console.log('原因分析:', {
        是否临时路径: failedImage ? failedImage.includes('tmp') : false,
        是否为空: !failedImage,
        路径内容: failedImage
      })
      console.log('✅ 已清空图片路径，将显示占位符')
      
      // 清空图片路径，让 wx:if 显示占位符
      orders[index].productImage = ''
      this.setData({ orders })
    }
  },
  
  // 计算订单进度百分比
  calculateProgress(order) {
    if (order.status === 'completed') {
      return { percent: 100, isOverdue: false }
    }
    
    try {
      const createTime = new Date(order.createTime).getTime()
      const deadline = new Date(order.deadline).getTime()
      const now = Date.now()
      
      if (isNaN(createTime) || isNaN(deadline)) {
        return { percent: 50, isOverdue: false }
      }
      
      const totalTime = deadline - createTime
      const elapsedTime = now - createTime
      
      let percent = Math.round((elapsedTime / totalTime) * 100)
      
      // 限制范围在 0-100%
      if (percent < 0) percent = 0
      if (percent > 100) percent = 100
      
      const isOverdue = now > deadline
      
      return { percent, isOverdue }
    } catch (error) {
      console.error('计算进度失败:', error)
      return { percent: 50, isOverdue: false }
    }
  }
})
