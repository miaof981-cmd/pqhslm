Page({
  data: {
    orderId: '',
    productId: '',
    productName: '',
    productImage: '',
    comment: '',
    images: [],
    maxImages: 6
  },

  async onLoad(options) {
    const orderId = options.orderId
    if (!orderId) {
      wx.showToast({
        title: '缺少订单信息',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const productId = options.productId || ''
    const productName = options.productName ? decodeURIComponent(options.productName) : ''
    const productImage = options.productImage ? decodeURIComponent(options.productImage) : ''
    const status = options.status || ''

    this.setData({
      orderId,
      productId,
      productName,
      productImage
    })

    await this.ensureOrderCanPublish({ orderId, status })
  },

  async ensureOrderCanPublish({ orderId, status }) {
    const storageKeys = ['orders', 'pending_orders', 'completed_orders']
    let targetOrder = null

    for (const key of storageKeys) {
      const list = wx.getStorageSync(key) || []
      const found = list.find(item => String(item.id) === String(orderId))
      if (found) {
        targetOrder = found
        break
      }
    }

    const orderStatus = status || targetOrder?.status
    const refundStatus = targetOrder?.refundStatus || targetOrder?.status

    if (orderStatus !== 'completed') {
      wx.showToast({
        title: '仅已完成订单可晒稿',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    if (refundStatus === 'refunded') {
      wx.showToast({
        title: '退款订单无法晒稿',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const posts = wx.getStorageSync('buyer_show_posts') || []
    const existed = posts.find(item => String(item.orderId) === String(orderId))
    if (existed) {
      wx.showToast({
        title: '该订单已晒稿',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    if (targetOrder) {
      const name = targetOrder.productName || this.data.productName
      const cover = targetOrder.productImage || this.data.productImage
      this.setData({
        productName: name,
        productImage: cover,
        productId: targetOrder.productId || this.data.productId
      })
    } else if (this.data.productId) {
      // ✅ 从云端获取商品信息
      const cloudAPI = require('../../utils/cloud-api.js')
      const res = await cloudAPI.getProductList({ productId: this.data.productId })
      // 🛡️ 安全数组解析
      const products = cloudAPI.safeArray(res)
      const product = products.find(item => String(item.id || item._id) === String(this.data.productId))
      if (product) {
        this.setData({
          productName: product.name || this.data.productName,
          productImage: (product.images && product.images[0]) || this.data.productImage
        })
      }
    }
  },

  chooseImages() {
    const { images, maxImages } = this.data
    const count = maxImages - images.length
    if (count <= 0) {
      wx.showToast({
        title: `最多上传${maxImages}张`,
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFilePaths || []
        this.setData({
          images: images.concat(newImages).slice(0, maxImages)
        })
      }
    })
  },

  removeImage(event) {
    const index = event.currentTarget.dataset.index
    const { images } = this.data
    const nextImages = images.filter((_, idx) => idx !== index)
    this.setData({ images: nextImages })
  },

  handleCommentInput(event) {
    this.setData({ comment: event.detail.value })
  },

  submitPost() {
    const { orderId, productId, productName, productImage, comment, images } = this.data

    if (!images || images.length === 0) {
      wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none'
      })
      return
    }

    // 🎯 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo') || {}
    const userId = wx.getStorageSync('userId')
    
    console.log('========================================')
    console.log('📝 [买家秀发布] 开始检查用户信息')
    console.log('========================================')
    console.log('userInfo:', userInfo)
    console.log('userId:', userId)
    console.log('nickName:', userInfo.nickName)
    console.log('avatarUrl:', userInfo.avatarUrl ? userInfo.avatarUrl.substring(0, 50) + '...' : '❌ 无')
    
    const { DEFAULT_AVATAR_DATA } = require('../../../utils/constants.js')
    const beautifyAvatar = (avatar) => {
      if (!avatar) return ''
      if (typeof avatar !== 'string') return String(avatar)
      const trimmed = avatar.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith('http://tmp/') || trimmed.startsWith('wxfile://')) {
        return ''
      }
      return trimmed
    }

    const authorName = userInfo.nickName || userInfo.name || '匿名用户'
    const authorAvatar = beautifyAvatar(userInfo.avatarUrl || userInfo.avatar) || DEFAULT_AVATAR_DATA
    
    console.log('✅ 最终使用的用户信息:')
    console.log('  - authorName:', authorName)
    console.log('  - authorAvatar:', authorAvatar ? authorAvatar.substring(0, 50) + '...' : '❌ 无')
    console.log('  - authorId:', userId)

    const now = Date.now()
    const displayTime = this.formatDisplayTime(new Date())

    const newPost = {
      id: `${now}`,
      orderId,
      productId,
      productName,
      productImage,
      comment: comment.trim(),
      images,
      createdAt: now,
      displayTime,
      // ✅ 保存用户信息
      authorName,
      authorAvatar,
      authorId: wx.getStorageSync('userId')
    }

    const posts = wx.getStorageSync('buyer_show_posts') || []
    posts.unshift(newPost)
    wx.setStorageSync('buyer_show_posts', posts)

    this.markOrderHasBuyerShow(newPost)

    wx.showToast({
      title: '晒稿成功',
      icon: 'success',
      duration: 1500
    })

    console.log('✅ 买家秀发布成功:', newPost.id)

    setTimeout(() => {
      wx.switchTab({ 
        url: '/pages/buyer-show/index/index',
        success: () => {
          console.log('✅ 已跳转到买家秀页面')
        },
        fail: (err) => {
          console.error('❌ 跳转失败:', err)
          // 如果switchTab失败，尝试navigateBack
          wx.navigateBack()
        }
      })
    }, 1500)
  },

  formatDisplayTime(date) {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  },

  markOrderHasBuyerShow(post) {
    const keys = ['orders', 'pending_orders', 'completed_orders']
    keys.forEach(key => {
      const list = wx.getStorageSync(key) || []
      let changed = false
      const updated = list.map(item => {
        if (String(item.id) === String(post.orderId)) {
          changed = true
          return {
            ...item,
            hasBuyerShow: true,
            buyerShowId: post.id
          }
        }
        return item
      })
      if (changed) {
        wx.setStorageSync(key, updated)
      }
    })
  }
})
