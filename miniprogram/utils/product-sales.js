/**
 * 商品销量更新工具
 * 用于订单完成时更新商品销量
 */

/**
 * 更新商品销量（订单完成时调用）
 * @param {Object} order - 订单对象
 * @param {string} order.productId - 商品ID
 * @param {number} order.quantity - 购买数量
 */
function updateProductSales(order) {
  if (!order || !order.productId) {
    console.warn('⚠️ 订单信息无效，无法更新销量')
    return false
  }

  const products = wx.getStorageSync('mock_products') || []
  if (!Array.isArray(products) || products.length === 0) {
    console.warn('⚠️ 商品列表为空')
    return false
  }

  const productId = String(order.productId)
  const quantity = Number(order.quantity) || 1
  
  const targetIndex = products.findIndex(product => 
    String(product.id || product._id) === productId
  )

  if (targetIndex === -1) {
    console.warn(`⚠️ 未找到商品 ID: ${productId}`)
    return false
  }

  const currentSales = Number(products[targetIndex].sales) || 0
  products[targetIndex].sales = currentSales + quantity

  wx.setStorageSync('mock_products', products)
  
  console.log(`✅ 销量已更新: ${products[targetIndex].name || '商品'} +${quantity} (总销量: ${products[targetIndex].sales})`)
  return true
}

/**
 * 批量更新商品销量（多商品订单）
 * @param {Array} orderItems - 订单商品列表
 */
function updateBatchProductSales(orderItems = []) {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    console.warn('⚠️ 订单商品列表为空')
    return false
  }

  const products = wx.getStorageSync('mock_products') || []
  if (!Array.isArray(products) || products.length === 0) {
    console.warn('⚠️ 商品列表为空')
    return false
  }

  let changed = false
  let updateCount = 0

  orderItems.forEach(item => {
    if (!item || !item.productId) return

    const productId = String(item.productId)
    const quantity = Number(item.quantity) || 1
    
    const targetIndex = products.findIndex(product => 
      String(product.id || product._id) === productId
    )

    if (targetIndex === -1) {
      console.warn(`⚠️ 未找到商品 ID: ${productId}`)
      return
    }

    const currentSales = Number(products[targetIndex].sales) || 0
    products[targetIndex].sales = currentSales + quantity
    changed = true
    updateCount++

    console.log(`✅ 销量已更新: ${products[targetIndex].name || '商品'} +${quantity} (总销量: ${products[targetIndex].sales})`)
  })

  if (changed) {
    wx.setStorageSync('mock_products', products)
    console.log(`✅ 批量更新完成: ${updateCount}/${orderItems.length} 个商品`)
    return true
  }

  return false
}

module.exports = {
  updateProductSales,
  updateBatchProductSales
}

