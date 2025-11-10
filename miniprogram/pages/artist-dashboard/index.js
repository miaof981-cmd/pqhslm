const orderHelper = require('../../utils/order-helper.js')

Page({
  data: {
    currentTab: 'products',
    products: [],
    orders: [],
    memberInfo: null,
    loading: true
  },

  onLoad() {
    this.checkPermission()
  },

  onShow() {
    this.loadData()
  },

  // 检查权限
  checkPermission() {
    const app = getApp()
    if (!app.checkPermission('artist')) {
      wx.showModal({
        title: '权限不足',
        content: '您还不是画师，请先申请画师资格',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/apply/index'
          })
        }
      })
      return
    }
    this.loadData()
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadProducts(),
        this.loadOrders(),
        this.loadMemberInfo()
      ])
    } catch (error) {
      console.error('加载数据失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载商品
  async loadProducts() {
    // 暂时使用模拟数据
    this.setData({
      products: [
        {
          _id: 'product-1',
          name: '我的商品1',
          price: 100,
          deliveryDays: 3,
          status: 'active',
          images: ['https://via.placeholder.com/300x200.png?text=我的商品1']
        },
        {
          _id: 'product-2',
          name: '我的商品2',
          price: 200,
          deliveryDays: 5,
          status: 'active',
          images: ['https://via.placeholder.com/300x200.png?text=我的商品2']
        }
      ]
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const app = getApp()
    //   const res = await wx.cloud.database().collection('products')
    //     .where({ artistId: app.globalData.openid })
    //     .orderBy('createTime', 'desc')
    //     .get()
    //   
    //   this.setData({ products: res.data })
    // } catch (error) {
    //   console.error('加载商品失败', error)
    // }
  },

  // 加载订单
  async loadOrders() {
    const userId = wx.getStorageSync('userId')
    
    console.log('========================================')
    console.log('📦 [画师端] 使用统一工具加载订单')
    console.log('========================================')
    console.log('当前画师ID:', userId)
    
    // 🎯 使用统一工具函数获取并标准化订单
    let myOrders = orderHelper.prepareOrdersForPage({
      role: 'artist',
      userId: userId
    })
    
    console.log('✅ 订单加载完成:', myOrders.length, '个')
    
    this.setData({
      orders: myOrders
    })
  },

  // 加载会员信息
  async loadMemberInfo() {
    // 暂时使用模拟数据
    this.setData({
      memberInfo: {
        isValid: true,
        endDate: '2024-12-31',
        daysLeft: 365,
        amount: 100
      }
    })
    
    // 云开发版本（需要先开通云开发）
    // try {
    //   const app = getApp()
    //   const res = await wx.cloud.database().collection('members')
    //     .where({ artistId: app.globalData.openid })
    //     .orderBy('endDate', 'desc')
    //     .limit(1)
    //     .get()
    //   
    //   if (res.data.length > 0) {
    //     const member = res.data[0]
    //     const now = new Date()
    //     const endDate = new Date(member.endDate)
    //     
    //     this.setData({
    //       memberInfo: {
    //         ...member,
    //         isValid: now <= endDate,
    //         daysLeft: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    //       }
    //     })
    //   }
    // } catch (error) {
    //   console.error('加载会员信息失败', error)
    // }
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 添加商品
  addProduct() {
    wx.navigateTo({
      url: '/pages/product-edit/index'
    })
  },

  // 编辑商品
  editProduct(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-edit/index?id=${productId}`
    })
  },

  // 续费会员
  renewMember() {
    wx.navigateTo({
      url: '/pages/member-renew/index'
    })
  }
})