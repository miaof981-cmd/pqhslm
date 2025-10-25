Page({
  data: {
    artistId: '',
    artistName: '',
    statusFilter: 'all',
    products: [],
    allProducts: [],
    stats: {
      all: 0,
      online: 0,
      offline: 0
    }
  },

  onLoad(options) {
    if (options.artistId) {
      this.setData({
        artistId: options.artistId,
        artistName: options.artistName || '画师'
      })
      this.loadProducts()
    }
  },

  loadProducts() {
    console.log('=== 商品管理页加载数据 ===')
    
    // 从本地存储加载商品
    let products = wx.getStorageSync('mock_products') || []
    console.log('从本地存储加载商品数量:', products.length)
    
    // 如果本地没有商品，使用默认数据
    if (products.length === 0) {
      console.log('本地无数据，使用默认 mock 数据')
      products = [
        {
          _id: '1',
          id: '1',
          name: '精美头像设计',
          image: 'https://via.placeholder.com/200',
          images: ['https://via.placeholder.com/200'],
          price: '88.00',
          basePrice: '88.00',
          status: 'online',
          isOnSale: true,
          sales: 45,
          stock: 100
        },
        {
          _id: '2',
          id: '2',
          name: '创意插画作品',
          image: 'https://via.placeholder.com/200',
          images: ['https://via.placeholder.com/200'],
          price: '168.00',
          basePrice: '168.00',
          status: 'online',
          isOnSale: true,
          sales: 23,
          stock: 50
        },
        {
          _id: '3',
          id: '3',
          name: '企业LOGO设计',
          image: 'https://via.placeholder.com/200',
          images: ['https://via.placeholder.com/200'],
          price: '299.00',
          basePrice: '299.00',
          status: 'offline',
          isOnSale: false,
          sales: 12,
          stock: 30
        },
        {
          _id: '4',
          id: '4',
          name: '卡通形象设计',
          image: 'https://via.placeholder.com/200',
          images: ['https://via.placeholder.com/200'],
          price: '128.00',
          basePrice: '128.00',
          status: 'online',
          isOnSale: true,
          sales: 56,
          stock: 80
        }
      ]
    } else {
      // 转换本地存储的商品格式为页面显示格式
      products = products.map(p => ({
        _id: p.id || p._id,
        id: p.id || p._id,
        name: p.name || '未命名商品',
        image: (p.images && p.images[0]) || 'https://via.placeholder.com/200',
        images: p.images || [],
        price: p.price || p.basePrice || '0.00',
        basePrice: p.basePrice || '0.00',
        status: p.isOnSale ? 'online' : 'offline',
        isOnSale: p.isOnSale !== false,
        sales: p.sales || 0,
        stock: p.stock || 0
      }))
      console.log('转换后的商品数据:', products)
    }

    const stats = {
      all: products.length,
      online: products.filter(p => p.status === 'online').length,
      offline: products.filter(p => p.status === 'offline').length
    }

    console.log('统计数据:', stats)

    this.setData({
      allProducts: products,
      products: products,
      stats: stats
    })
  },

  filterByStatus(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ statusFilter: filter })

    if (filter === 'all') {
      this.setData({ products: this.data.allProducts })
    } else {
      const filtered = this.data.allProducts.filter(p => p.status === filter)
      this.setData({ products: filtered })
    }
  },

  editProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-edit/index?id=${id}`
    })
  },

  toggleProductStatus(e) {
    const id = e.currentTarget.dataset.id
    const currentStatus = e.currentTarget.dataset.status
    const newStatus = currentStatus === 'online' ? 'offline' : 'online'
    const actionText = newStatus === 'online' ? '上架' : '下架'

    wx.showModal({
      title: `确认${actionText}`,
      content: `确认${actionText}此商品？`,
      success: (res) => {
        if (res.confirm) {
          // 实际应调用后端API更新状态
          const products = this.data.allProducts.map(p => {
            if (p._id === id) {
              return { ...p, status: newStatus }
            }
            return p
          })

          // 重新计算统计
          const stats = {
            all: products.length,
            online: products.filter(p => p.status === 'online').length,
            offline: products.filter(p => p.status === 'offline').length
          }

          this.setData({
            allProducts: products,
            stats: stats
          })

          // 刷新当前显示的列表
          this.filterByStatus({ currentTarget: { dataset: { filter: this.data.statusFilter } } })

          wx.showToast({
            title: `已${actionText}`,
            icon: 'success'
          })
        }
      }
    })
  }
})

