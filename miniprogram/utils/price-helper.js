/**
 * 价格计算工具函数
 * 用于统一处理商品价格显示逻辑，避免不同页面出现价格显示不一致问题
 */

/**
 * 获取商品显示价格
 * @param {Object} product - 商品对象
 * @returns {Number} 显示价格
 * 
 * 价格计算优先级:
 * 1. product.price (编辑时计算的最终价格)
 * 2. product.basePrice (基础价格)
 * 3. 从规格中计算最低价格
 * 4. 0 (默认值)
 */
function getProductDisplayPrice(product) {
  if (!product) {
    console.warn('getProductDisplayPrice: 商品对象为空')
    return 0
  }
  
  // 优先使用已计算的 price
  if (product.price !== undefined && product.price !== null && product.price !== '') {
    const price = parseFloat(product.price)
    if (!isNaN(price) && price > 0) {
      return price
    }
  }
  
  // 其次使用 basePrice
  if (product.basePrice !== undefined && product.basePrice !== null && product.basePrice !== '') {
    const basePrice = parseFloat(product.basePrice)
    if (!isNaN(basePrice) && basePrice > 0) {
      return basePrice
    }
  }
  
  // 最后尝试从规格中计算最低价格
  if (product.specs && Array.isArray(product.specs) && product.specs.length > 0) {
    const minPrice = getMinPriceFromSpecs(product.specs)
    if (minPrice > 0) {
      return minPrice
    }
  }
  
  // 默认返回 0
  return 0
}

/**
 * 从规格数组中获取最低价格
 * @param {Array} specs - 规格数组
 * @returns {Number} 最低价格
 */
function getMinPriceFromSpecs(specs) {
  if (!specs || !Array.isArray(specs) || specs.length === 0) {
    return 0
  }
  
  let minPrice = Infinity
  
  // 遍历所有规格
  for (const spec of specs) {
    // 遍历规格的所有选项
    if (spec.options && Array.isArray(spec.options)) {
      for (const option of spec.options) {
        const price = parseFloat(option.price)
        if (!isNaN(price) && price > 0 && price < minPrice) {
          minPrice = price
        }
      }
    }
  }
  
  return minPrice === Infinity ? 0 : minPrice
}

/**
 * 格式化价格显示
 * @param {Number} price - 价格
 * @param {Boolean} showSymbol - 是否显示货币符号
 * @returns {String} 格式化后的价格字符串
 */
function formatPrice(price, showSymbol = true) {
  const numPrice = parseFloat(price) || 0
  const formatted = numPrice.toFixed(2)
  return showSymbol ? `¥${formatted}` : formatted
}

/**
 * 批量处理商品价格（用于列表页）
 * @param {Array} products - 商品数组
 * @returns {Array} 处理后的商品数组
 */
function processProductsPrices(products) {
  if (!Array.isArray(products)) {
    console.warn('processProductsPrices: 输入不是数组')
    return []
  }
  
  return products.map(product => ({
    ...product,
    price: getProductDisplayPrice(product)
  }))
}

module.exports = {
  getProductDisplayPrice,
  getMinPriceFromSpecs,
  formatPrice,
  processProductsPrices
}

