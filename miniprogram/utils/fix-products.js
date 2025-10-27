/**
 * 商品数据修复工具
 * 用于清理空规格和修复价格
 */

/**
 * 清理商品的空规格
 * @param {Object} product - 商品对象
 * @returns {Object} 修复后的商品对象
 */
function cleanProductSpecs(product) {
  if (!product.specs || product.specs.length === 0) {
    return product
  }
  
  const cleanedSpecs = []
  
  product.specs.forEach(spec => {
    // 过滤掉无效的规格值
    const validValues = spec.values.filter(v => 
      v.name && v.name.trim() && v.addPrice
    )
    
    // 只保存有有效值的规格
    if (validValues.length > 0) {
      cleanedSpecs.push({
        name: spec.name,
        values: validValues
      })
    }
  })
  
  return {
    ...product,
    specs: cleanedSpecs
  }
}

/**
 * 重新计算商品价格
 * @param {Object} product - 商品对象
 * @returns {Number} 计算后的价格
 */
function recalculatePrice(product) {
  const basePrice = parseFloat(product.basePrice) || 0
  
  // 检查是否有有效规格
  if (!product.specs || product.specs.length === 0) {
    return basePrice
  }
  
  const spec1 = product.specs[0]
  if (!spec1 || !spec1.values || spec1.values.length === 0) {
    return basePrice
  }
  
  let minPrice = Infinity
  
  if (product.specs.length > 1 && product.specs[1].values && product.specs[1].values.length > 0) {
    // 两级规格
    spec1.values.forEach(v1 => {
      product.specs[1].values.forEach(v2 => {
        const price1 = parseFloat(v1.addPrice) || 0
        const price2 = parseFloat(v2.addPrice) || 0
        const totalPrice = price1 + price2
        if (totalPrice < minPrice) {
          minPrice = totalPrice
        }
      })
    })
  } else {
    // 一级规格
    spec1.values.forEach(v1 => {
      const price1 = parseFloat(v1.addPrice) || 0
      if (price1 < minPrice) {
        minPrice = price1
      }
    })
  }
  
  return minPrice === Infinity ? basePrice : minPrice
}

/**
 * 修复所有商品数据
 */
function fixAllProducts() {
  try {
    // 读取商品列表
    let products = wx.getStorageSync('mock_products') || []
    
    console.log('=== 开始修复商品数据 ===')
    console.log('商品总数:', products.length)
    
    let fixedCount = 0
    let cleanedSpecsCount = 0
    let priceUpdatedCount = 0
    
    // 修复每个商品
    products = products.map(product => {
      const originalSpecsLength = product.specs ? product.specs.length : 0
      const originalPrice = product.price
      
      // 清理空规格
      const cleanedProduct = cleanProductSpecs(product)
      
      // 重新计算价格
      const newPrice = recalculatePrice(cleanedProduct)
      cleanedProduct.price = newPrice
      
      // 统计修复情况
      const newSpecsLength = cleanedProduct.specs ? cleanedProduct.specs.length : 0
      if (originalSpecsLength !== newSpecsLength) {
        cleanedSpecsCount++
        console.log(`✅ 商品 ${product.name}: 清理了空规格`)
      }
      
      if (originalPrice !== newPrice) {
        priceUpdatedCount++
        console.log(`✅ 商品 ${product.name}: 价格 ${originalPrice} → ${newPrice}`)
      }
      
      if (originalSpecsLength !== newSpecsLength || originalPrice !== newPrice) {
        fixedCount++
      }
      
      return cleanedProduct
    })
    
    // 保存修复后的数据
    wx.setStorageSync('mock_products', products)
    
    console.log('=== 修复完成 ===')
    console.log('修复商品数:', fixedCount)
    console.log('清理空规格:', cleanedSpecsCount)
    console.log('更新价格:', priceUpdatedCount)
    
    return {
      success: true,
      total: products.length,
      fixed: fixedCount,
      cleanedSpecs: cleanedSpecsCount,
      priceUpdated: priceUpdatedCount
    }
  } catch (error) {
    console.error('❌ 修复失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

module.exports = {
  cleanProductSpecs,
  recalculatePrice,
  fixAllProducts
}

