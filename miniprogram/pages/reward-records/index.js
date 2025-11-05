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
    recentOrders: [],
    historyOrders: [],
    rewardOptions: [6, 10, 20, 50, 100],
    defaultAvatar: DEFAULT_AVATAR_DATA
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

      const rewardRecords = wx.getStorageSync('reward_records') || []
      const rewardMap = buildRewardMap(rewardRecords)

      const now = Date.now()
      const recentOrders = []
      const historyOrders = []

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

        const display = {
          id: order.id,
          artistName: order.artistName || '未知画师',
          artistAvatar: order.artistAvatar || '',
          productName: order.productName || `订单 #${order.id}`,
          completedAt: completedTs,
          completedText: completedTs ? formatDate(completedTs) : '时间未知',
          rewarded: false,
          rewardAmount: '',
          rewardTime: ''
        }

        const rewardRecord = rewardMap.get(String(order.id))
        if (rewardRecord) {
          display.rewarded = true
          display.rewardAmount = rewardRecord.amount
          display.rewardTime = rewardRecord.time || ''
        }

        if (completedTs && now - completedTs <= THIRTY_DAYS_MS) {
          recentOrders.push(display)
        } else {
          historyOrders.push(display)
        }
      })

      recentOrders.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      historyOrders.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

      this.setData({
        recentOrders,
        historyOrders
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
    const target = this.data.recentOrders.find(item => String(item.id) === String(orderId))

    if (!target) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }

    if (target.rewarded) {
      wx.showToast({
        title: '已打赏该订单',
        icon: 'none'
      })
      return
    }

    const itemList = [...this.data.rewardOptions.map(amount => `¥${amount}`), '自定义金额']

    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.cancel) return

        if (res.tapIndex === this.data.rewardOptions.length) {
          this.promptCustomAmount(target)
        } else {
          const amount = this.data.rewardOptions[res.tapIndex]
          this.confirmReward(target, amount)
        }
      }
    })
  },

  promptCustomAmount(order) {
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

        this.confirmReward(order, Math.round(value * 100) / 100)
      }
    })
  },

  confirmReward(order, amount) {
    wx.showModal({
      title: '确认打赏',
      content: `确认打赏 ¥${amount} 给 ${order.artistName} 吗？`,
      success: (res) => {
        if (!res.confirm) return

        wx.showLoading({
          title: '打赏中...',
          mask: true
        })

        setTimeout(() => {
          wx.hideLoading()
          this.persistReward(order, amount)
          wx.showToast({
            title: '打赏成功',
            icon: 'success'
          })
        }, 600)
      }
    })
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
      time: formatDateTime(now)
    }

    rewards.push(record)
    wx.setStorageSync('reward_records', rewards)

    const recentOrders = this.data.recentOrders.map(item => {
      if (String(item.id) === String(order.id)) {
        return {
          ...item,
          rewarded: true,
          rewardAmount: amount,
          rewardTime: record.time
        }
      }
      return item
    })

    this.setData({ recentOrders })
  }
})
