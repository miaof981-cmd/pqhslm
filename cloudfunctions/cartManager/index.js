// 购物车管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, userId, cartItem, cartItemId, updates, cartItemIds } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  console.log('[cartManager] 请求:', { action, openid })
  
  try {
    switch (action) {
      case 'getList':
        return await getCartList(openid, userId)
      case 'add':
        return await addToCart(openid, userId, cartItem)
      case 'update':
        return await updateCartItem(openid, cartItemId, updates)
      case 'remove':
        return await removeFromCart(openid, cartItemId)
      case 'batchRemove':
        return await batchRemoveFromCart(openid, cartItemIds)
      case 'clear':
        return await clearCart(openid, userId)
      default:
        return { success: false, message: '未知操作: ' + action }
    }
  } catch (error) {
    console.error('[cartManager] 错误:', error)
    return { 
      success: false, 
      message: error.message || '操作失败',
      error: error.toString()
    }
  }
}

// 获取购物车列表
async function getCartList(openid, userId) {
  try {
    const res = await db.collection('carts')
      .where({ _openid: openid })
      .orderBy('addTime', 'desc')
      .get()
    
    console.log('[getCartList] 成功:', res.data.length, '项')
    return { success: true, data: res.data || [] }
  } catch (error) {
    console.error('[getCartList] 失败:', error)
    throw error
  }
}

// 添加商品到购物车
async function addToCart(openid, userId, cartItem) {
  try {
    const now = new Date().toISOString()
    
    // 检查是否已存在相同商品和规格
    const existingRes = await db.collection('carts')
      .where({
        _openid: openid,
        productId: cartItem.productId,
        spec1: cartItem.spec1 || '',
        spec2: cartItem.spec2 || ''
      })
      .get()
    
    if (existingRes.data && existingRes.data.length > 0) {
      // 已存在，增加数量
      const existing = existingRes.data[0]
      await db.collection('carts').doc(existing._id).update({
        data: {
          quantity: _.inc(cartItem.quantity || 1),
          updateTime: now
        }
      })
      
      console.log('[addToCart] 更新数量:', existing._id)
      return { 
        success: true, 
        data: { 
          cartItemId: existing._id, 
          action: 'updated',
          quantity: existing.quantity + (cartItem.quantity || 1)
        } 
      }
    } else {
      // 不存在，添加新项
      const res = await db.collection('carts').add({
        data: {
          _openid: openid,
          userId: userId || '',
          productId: cartItem.productId,
          productName: cartItem.productName || '',
          productImage: cartItem.productImage || '',
          artistName: cartItem.artistName || '',
          price: cartItem.price || '0.00',
          quantity: cartItem.quantity || 1,
          spec1: cartItem.spec1 || '',
          spec2: cartItem.spec2 || '',
          deliveryDays: cartItem.deliveryDays || 7,
          selected: false,
          addTime: now,
          updateTime: now
        }
      })
      
      console.log('[addToCart] 新增:', res._id)
      return { 
        success: true, 
        data: { 
          cartItemId: res._id, 
          action: 'added',
          quantity: cartItem.quantity || 1
        } 
      }
    }
  } catch (error) {
    console.error('[addToCart] 失败:', error)
    throw error
  }
}

// 更新购物车项
async function updateCartItem(openid, cartItemId, updates) {
  try {
    const now = new Date().toISOString()
    
    const res = await db.collection('carts')
      .where({
        _id: cartItemId,
        _openid: openid
      })
      .update({
        data: {
          ...updates,
          updateTime: now
        }
      })
    
    console.log('[updateCartItem] 成功:', cartItemId, '更新数:', res.stats.updated)
    return { 
      success: true, 
      data: { 
        updated: res.stats.updated,
        cartItemId: cartItemId
      } 
    }
  } catch (error) {
    console.error('[updateCartItem] 失败:', error)
    throw error
  }
}

// 删除购物车项
async function removeFromCart(openid, cartItemId) {
  try {
    const res = await db.collection('carts')
      .where({
        _id: cartItemId,
        _openid: openid
      })
      .remove()
    
    console.log('[removeFromCart] 成功:', cartItemId, '删除数:', res.stats.removed)
    return { 
      success: true, 
      data: { 
        deleted: res.stats.removed,
        cartItemId: cartItemId
      } 
    }
  } catch (error) {
    console.error('[removeFromCart] 失败:', error)
    throw error
  }
}

// 批量删除购物车项
async function batchRemoveFromCart(openid, cartItemIds) {
  try {
    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return { success: true, data: { count: 0 } }
    }
    
    const res = await db.collection('carts')
      .where({
        _id: _.in(cartItemIds),
        _openid: openid
      })
      .remove()
    
    console.log('[batchRemoveFromCart] 成功:', cartItemIds.length, '项，删除数:', res.stats.removed)
    return { 
      success: true, 
      data: { 
        count: res.stats.removed,
        requestedIds: cartItemIds
      } 
    }
  } catch (error) {
    console.error('[batchRemoveFromCart] 失败:', error)
    throw error
  }
}

// 清空购物车
async function clearCart(openid, userId) {
  try {
    const res = await db.collection('carts')
      .where({ _openid: openid })
      .remove()
    
    console.log('[clearCart] 成功:', openid, '删除数:', res.stats.removed)
    return { 
      success: true, 
      data: { 
        count: res.stats.removed
      } 
    }
  } catch (error) {
    console.error('[clearCart] 失败:', error)
    throw error
  }
}

