const orderHelper = require('../../utils/order-helper.js')
const { DEFAULT_AVATAR_DATA } = require('../../utils/constants.js')

const DAY_MS = 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * DAY_MS

function parseTimestamp(value) {
  if (!value) return null

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed)
      return Number.isNaN(num) ? null : num
    }

    const normalized = trimmed.replace(/-/g, '/')
    const date = new Date(normalized)
    const ts = date.getTime()
    return Number.isNaN(ts) ? null : ts
  }

  return null
}

function formatDate(ts) {
  if (!ts) return '时间未知'
  const date = new Date(ts)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

function buildRewardMap(records = []) {
  const map = new Map()

  records.forEach(record => {
    if (!record || !record.orderId) return
    const key = String(record.orderId)
    const existing = map.get(key)
    const existingTs = existing ? parseTimestamp(existing.time) || existing.id || 0 : 0
    const currentTs = parseTimestamp(record.time) || record.id || 0

    if (!existing || currentTs >= existingTs) {
      map.set(key, record)
    }
  })

  return map
}

Page({
  data: {
    loading: true,
    pendingOrders: [],      // 可打赏订单
    rewardedOrders: [],     // 已打赏订单
    rewardOptions: [6, 10, 20, 50, 100],
    defaultAvatar: DEFAULT_AVATAR_DATA,
    showRewardModal: false,
    currentOrder: {},
    selectedAmount: null
  },

  onShow() {
    this.loadRewardOrders()
  },

  loadRewardOrders() {
    this.setData({ loading: true })

    try {
      const app = getApp()
      const userId = app?.globalData?.userId || wx.getStorageSync('userId')
      const userKey = userId != null ? String(userId) : ''

      // 优先使用统一工具函数获取订单
      let orders = orderHelper.prepareOrdersForPage({
        role: 'customer',
        userId
      })

      const orderMap = new Map()
      orders.forEach(order => {
        if (!order || !order.id) return
        orderMap.set(String(order.id), { ...order })
      })

      // 合并已完成订单的额外信息，确保 30 天前的数据也能显示
      const completedOrdersRaw = wx.getStorageSync('completed_orders') || []
      const normalizedCompleted = orderHelper.normalizeOrders(completedOrdersRaw)
      normalizedCompleted.forEach(order => {
        if (!order || !order.id) return
        const key = String(order.id)

        const buyerKey = order.buyerId != null ? String(order.buyerId) : ''
        const customerKey = order.customerId != null ? String(order.customerId) : ''
        const belongsToUser = !userKey || buyerKey === userKey || customerKey === userKey

        if (!belongsToUser && !orderMap.has(key)) {
          return
        }

        if (orderMap.has(key)) {
          orderMap.set(key, { ...orderMap.get(key), ...order })
        } else {
          orderMap.set(key, { ...order })
        }
      })

      orders = Array.from(orderMap.values())

      if (userKey) {
        orders = orders.filter(order => {
          const buyerKey = order.buyerId != null ? String(order.buyerId) : ''
          const customerKey = order.customerId != null ? String(order.customerId) : ''
          return buyerKey === userKey || customerKey === userKey
        })
      }

      // 🎯 修复画师头像：从商品信息和用户信息中获取正确的头像
      const products = wx.getStorageSync('mock_products') || []
      const productMap = new Map()
      products.forEach(p => {
        if (p.id) productMap.set(String(p.id), p)
      })

      const serviceList = wx.getStorageSync('service_list') || []
      const userInfoMap = new Map()
      serviceList.forEach(s => {
        if (s.userId) userInfoMap.set(String(s.userId), s)
      })

      // 从 artist_applications 获取画师头像
      const artistApps = wx.getStorageSync('artist_applications') || []
      const artistMap = new Map()
      artistApps.forEach(app => {
        if (app.userId) artistMap.set(String(app.userId), app)
      })

      const rewardRecords = wx.getStorageSync('reward_records') || []
      const rewardMap = buildRewardMap(rewardRecords)

      const now = Date.now()
      const pendingOrders = []   // 未打赏的30天内订单
      const rewardedOrders = []  // 已打赏的30天内订单

      orders.forEach(order => {
        if (!order || order.status !== 'completed') return

        const completedTs =
          parseTimestamp(order.completedAt) ||
          parseTimestamp(order.completeTime) ||
          parseTimestamp(order.completedTime) ||
          parseTimestamp(order.finishTime) ||
          parseTimestamp(order.deliveryTime) ||
          parseTimestamp(order.updateTime) ||
          parseTimestamp(order.createTime)

        // 🎯 只显示30天内的订单
        if (!completedTs || now - completedTs > THIRTY_DAYS_MS) {
          return
        }

        // 🎯 修复画师头像：尝试从多个来源获取有效头像
        let finalArtistAvatar = order.artistAvatar || ''
        
        // 如果是临时URL或无效URL，尝试从其他来源获取
        if (!finalArtistAvatar || 
            finalArtistAvatar.startsWith('http://tmp/') || 
            finalArtistAvatar.startsWith('https://thirdwx.qlogo.cn/') ||
            finalArtistAvatar.startsWith('wxfile://')) {
          
          // 1. 尝试从商品信息获取
          if (order.productId) {
            const product = productMap.get(String(order.productId))
            if (product && product.artistAvatar && product.artistAvatar.startsWith('data:image')) {
              finalArtistAvatar = product.artistAvatar
              console.log('✅ 从商品获取画师头像')
            }
          }
          
          // 2. 尝试从画师ID获取
          if (!finalArtistAvatar || !finalArtistAvatar.startsWith('data:image')) {
            if (order.artistId) {
              const artist = artistMap.get(String(order.artistId))
              if (artist && artist.avatarUrl && artist.avatarUrl.startsWith('data:image')) {
                finalArtistAvatar = artist.avatarUrl
                console.log('✅ 从画师申请获取头像')
              }
              
              // 3. 尝试从用户信息获取
              if (!finalArtistAvatar || !finalArtistAvatar.startsWith('data:image')) {
                const userInfo = userInfoMap.get(String(order.artistId))
                if (userInfo && userInfo.avatar && userInfo.avatar.startsWith('data:image')) {
                  finalArtistAvatar = userInfo.avatar
                  console.log('✅ 从用户信息获取头像')
                }
              }
            }
          }
        }
        
        // 如果还是没有有效头像，使用默认头像
        if (!finalArtistAvatar || !finalArtistAvatar.startsWith('data:image')) {
          finalArtistAvatar = DEFAULT_AVATAR_DATA
          console.log('⚠️ 使用默认头像')
        }

        const display = {
          id: order.id,
          artistName: order.artistName || '未知画师',
          artistAvatar: finalArtistAvatar,
          productName: order.productName ? `橱窗：${order.productName}` : `订单 #${order.id}`,
          completedAt: completedTs,
          completedText: completedTs ? formatDate(completedTs) : '时间未知',
          rewarded: false,
          rewardAmount: '',
          rewardTime: ''
        }

        console.log('🎖️ 打赏订单信息:', {
          orderId: order.id,
          artistName: order.artistName,
          artistId: order.artistId,
          productId: order.productId,
          avatarType: finalArtistAvatar.startsWith('data:image') ? 'base64' : 
                      finalArtistAvatar.startsWith('http') ? 'URL' : '默认',
          productName: order.productName
        })

        const rewardRecord = rewardMap.get(String(order.id))
        if (rewardRecord) {
          display.rewarded = true
          display.rewardAmount = rewardRecord.amount
          display.rewardTime = rewardRecord.time || ''
          rewardedOrders.push(display)
        } else {
          pendingOrders.push(display)
        }
      })

      pendingOrders.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      rewardedOrders.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

      this.setData({
        pendingOrders,
        rewardedOrders
      })
    } catch (error) {
      console.error('[reward-records] 加载打赏数据失败', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onRewardTap(event) {
    const orderId = event.currentTarget.dataset.orderId
    const target = this.data.pendingOrders.find(item => String(item.id) === String(orderId))

    if (!target) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }

    // 显示美观弹窗
    this.setData({
      showRewardModal: true,
      currentOrder: target,
      selectedAmount: null
    })
  },

  hideRewardModal() {
    this.setData({
      showRewardModal: false,
      currentOrder: {},
      selectedAmount: null
    })
  },

  stopPropagation() {
    // 阻止事件冒泡，避免点击弹窗内容关闭弹窗
  },

  selectAmount(event) {
    const amount = event.currentTarget.dataset.amount
    this.setData({ selectedAmount: amount })
  },

  selectCustomAmount() {
    wx.showModal({
      title: '自定义金额',
      editable: true,
      placeholderText: '请输入1-500元',
      success: (res) => {
        if (!res.confirm) return

        const value = parseFloat(res.content)
        if (!value || value <= 0 || value > 500) {
          wx.showToast({
            title: '金额范围：1-500元',
            icon: 'none'
          })
          return
        }

        this.setData({ 
          selectedAmount: Math.round(value * 100) / 100
        })
      }
    })
  },

  confirmRewardFromModal() {
    const { selectedAmount, currentOrder } = this.data

    if (!selectedAmount) {
      wx.showToast({
        title: '请选择打赏金额',
        icon: 'none'
      })
      return
    }

    this.hideRewardModal()
    
    wx.showLoading({
      title: '打赏中...',
      mask: true
    })

    setTimeout(() => {
      wx.hideLoading()
      this.persistReward(currentOrder, selectedAmount)
      wx.showToast({
        title: '打赏成功！',
        icon: 'success',
        duration: 2000
      })
    }, 800)
  },

  persistReward(order, amount) {
    const rewards = wx.getStorageSync('reward_records') || []
    const now = Date.now()
    const record = {
      id: now,
      orderId: order.id,
      amount,
      artistName: order.artistName,
      artistAvatar: order.artistAvatar,
      productName: order.productName,
      time: formatDateTime(now)
    }

    rewards.push(record)
    wx.setStorageSync('reward_records', rewards)

    // 将订单从可打赏移动到已打赏
    const pendingOrders = this.data.pendingOrders.filter(item => String(item.id) !== String(order.id))
    const rewardedOrders = [{
      ...order,
      rewarded: true,
      rewardAmount: amount,
      rewardTime: record.time
    }, ...this.data.rewardedOrders]

    this.setData({ 
      pendingOrders,
      rewardedOrders
    })
  }
})
