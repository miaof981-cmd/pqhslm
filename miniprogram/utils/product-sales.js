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
  // ✅ 已废弃：库存扣减应通过云函数productManager.updateStock完成
  console.warn('[DEPRECATED] decreaseStock 已废弃，应调用云函数 productManager.updateStock')
  return { success: true, message: '已废弃，请使用云函数', remainingStock: 0 }
}

/**
 * 🎯 退款时回退库存（新增）
 * @param {string} productId - 商品ID
 * @param {number} quantity - 退回数量
 * @returns {boolean}
 */
function increaseStock(productId, quantity = 1) {
  // ✅ 已废弃：库存回退应通过云函数productManager.updateStock完成
  console.warn('[DEPRECATED] increaseStock 已废弃，应调用云函数 productManager.updateStock')
  return true
}

/**
 * 更新商品销量（订单完成时调用）
 * @param {Object} order - 订单对象
 * @param {string} order.productId - 商品ID
 * @param {number} order.quantity - 购买数量
 */
function updateProductSales(order) {
  // ✅ 已废弃：销量更新应通过云函数productManager.updateSales完成
  console.warn('[DEPRECATED] updateProductSales 已废弃，应调用云函数 productManager.updateSales')
  return true
}

/**
 * 批量更新商品销量（多商品订单）
 * @param {Array} orderItems - 订单商品列表
 */
function updateBatchProductSales(orderItems = []) {
  // ✅ 已废弃：批量销量更新应通过云函数productManager.updateSales完成
  console.warn('[DEPRECATED] updateBatchProductSales 已废弃，应调用云函数 productManager.updateSales')
  return true
}

module.exports = {
  updateProductSales,
  updateBatchProductSales,
  decreaseStock,    // 🎯 新增：下单时扣减库存
  increaseStock     // 🎯 新增：退款时回退库存
}

