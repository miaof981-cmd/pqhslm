Page({
  data: {
    orderInfo: null,
    productInfo: null,
    serviceQR: null,
    countdown: 3 // 倒计时秒数
  },

  onLoad(options) {
    // 从URL参数获取订单信息
    const orderInfo = {
      orderNo: this.generateOrderNo(),
      productName: options.productName || '商品',
      spec1: options.spec1 || '',
      spec2: options.spec2 || '',
      quantity: parseInt(options.quantity) || 1,
      price: parseFloat(options.price) || 0,
      totalAmount: parseFloat(options.totalAmount) || 0,
      createTime: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    console.log('订单信息:', orderInfo)

    this.setData({
      orderInfo: orderInfo,
      serviceQR: {
        imageUrl: 'https://via.placeholder.com/400x400.png?text=客服二维码'
      }
    })

    // 禁止用户返回（可选）
    // wx.hideHomeButton() // 隐藏返回首页按钮
  },

  // 生成订单号
  generateOrderNo() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    
    return `${year}${month}${day}${hours}${minutes}${seconds}${random}`
  },

  // 长按保存二维码
  onLongPressQR() {
    const { serviceQR } = this.data
    if (!serviceQR || !serviceQR.imageUrl) return

    wx.showModal({
      title: '保存二维码',
      content: '长按二维码可以保存到相册，或使用微信扫一扫识别',
      showCancel: false,
      confirmText: '知道了'
    })

    // 真实场景：下载并保存图片
    // wx.downloadFile({
    //   url: serviceQR.imageUrl,
    //   success: (res) => {
    //     wx.saveImageToPhotosAlbum({
    //       filePath: res.tempFilePath,
    //       success: () => {
    //         wx.showToast({ title: '已保存到相册', icon: 'success' })
    //       }
    //     })
    //   }
    // })
  },

  // 复制订单号
  copyOrderNo() {
    wx.setClipboardData({
      data: this.data.orderInfo.orderNo,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        })
      }
    })
  },

  // 查看订单详情
  viewOrderDetail() {
    wx.showToast({
      title: '订单功能开发中',
      icon: 'none'
    })
    
    // 真实场景：跳转到订单详情页
    // wx.navigateTo({
    //   url: `/pages/order-detail/index?id=${this.data.orderInfo.orderNo}`
    // })
  },

  // 返回首页
  backToHome() {
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  // 联系客服（预留方法）
  contactService() {
    wx.showModal({
      title: '温馨提示',
      content: '请长按二维码添加客服微信，客服将为您提供专属服务',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})

