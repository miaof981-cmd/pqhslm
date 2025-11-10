/**
 * 商品销量更新工具
 * 用于订单完成时更新商品销量
 */

/**
 * 🎯 下单时扣减库存（新增）
 * @param {string} productId - 商品ID
 * @param {number} quantity - 购买数量
 * @returns {Object} { success: boolean, message: string, remainingStock: number }
 */
function decreaseStock(productId, quantity = 1) {
  if (!productId) {
    console.warn('⚠️ 商品ID为空，无法扣减库存')
    return { success: false, message: '商品ID无效', remainingStock: 0 }
  }

  const products = wx.getStorageSync('mock_products') || []
  if (!Array.isArray(products) || products.length === 0) {
    console.warn('⚠️ 商品列表为空')
    return { success: false, message: '商品列表为空', remainingStock: 0 }
  }

  const normalizedProductId = String(productId)
  const qty = Number(quantity) || 1
  
  const targetIndex = products.findIndex(product => 
    String(product.id || product._id) === normalizedProductId
  )

  if (targetIndex === -1) {
    console.warn(`⚠️ 未找到商品 ID: ${normalizedProductId}`)
    return { success: false, message: '商品不存在', remainingStock: 0 }
  }

  const product = products[targetIndex]
  const currentStock = Number(product.stock) || 0
  
  // 🎯 库存为0表示无限库存，不扣减
  if (currentStock === 0) {
    console.log(`♾️ 无限库存商品，不扣减: ${product.name || '商品'}`)
    return { success: true, message: '无限库存', remainingStock: Infinity }
  }

  // 🎯 检查库存是否足够
  if (currentStock < qty) {
    console.warn(`⚠️ 库存不足: ${product.name || '商品'} (需要${qty}，剩余${currentStock})`)
    return { success: false, message: `库存不足，仅剩${currentStock}件`, remainingStock: currentStock }
  }

  // 🎯 扣减库存
  products[targetIndex].stock = currentStock - qty
  wx.setStorageSync('mock_products', products)
  
  console.log(`📦 库存已扣减: ${product.name || '商品'} -${qty} (剩余: ${products[targetIndex].stock})`)
  return { success: true, message: '库存扣减成功', remainingStock: products[targetIndex].stock }
}

/**
 * 🎯 退款时回退库存（新增）
 * @param {string} productId - 商品ID
 * @param {number} quantity - 退回数量
 * @returns {boolean}
 */
function increaseStock(productId, quantity = 1) {
  if (!productId) {
    console.warn('⚠️ 商品ID为空，无法回退库存')
    return false
  }

  const products = wx.getStorageSync('mock_products') || []
  if (!Array.isArray(products) || products.length === 0) {
    console.warn('⚠️ 商品列表为空')
    return false
  }

  const normalizedProductId = String(productId)
  const qty = Number(quantity) || 1
  
  const targetIndex = products.findIndex(product => 
    String(product.id || product._id) === normalizedProductId
  )

  if (targetIndex === -1) {
    console.warn(`⚠️ 未找到商品 ID: ${normalizedProductId}`)
    return false
  }

  const product = products[targetIndex]
  const currentStock = Number(product.stock) || 0
  
  // 🎯 库存为0表示无限库存，不回退
  if (currentStock === 0) {
    console.log(`♾️ 无限库存商品，无需回退: ${product.name || '商品'}`)
    return true
  }

  // 🎯 回退库存
  products[targetIndex].stock = currentStock + qty
  wx.setStorageSync('mock_products', products)
  
  console.log(`📦 库存已回退: ${product.name || '商品'} +${qty} (当前: ${products[targetIndex].stock})`)
  return true
}

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

  // 🎯 更新销量（库存在下单时已扣减，完成时只更新销量）
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

    // 🎯 更新销量
    const currentSales = Number(products[targetIndex].sales) || 0
    products[targetIndex].sales = currentSales + quantity

    // 🎯 新增：减少库存（如果库存不是0，即不是无限库存）
    const currentStock = Number(products[targetIndex].stock) || 0
    if (currentStock > 0) {
      products[targetIndex].stock = Math.max(0, currentStock - quantity)
      console.log(`📦 库存已减少: ${products[targetIndex].name || '商品'} -${quantity} (剩余库存: ${products[targetIndex].stock})`)
    }

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
  updateBatchProductSales,
  decreaseStock,    // 🎯 新增：下单时扣减库存
  increaseStock     // 🎯 新增：退款时回退库存
}

