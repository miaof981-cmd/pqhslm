/**
 * 订单可见性问题 - 诊断脚本
 * 
 * 使用方法：
 * 1. 打开微信开发者工具 Console
 * 2. 复制整个脚本内容
 * 3. 粘贴并按回车执行
 * 4. 查看输出结果，截图发送给开发者
 * 
 * 生成时间：2025-11-11
 */

console.log('╔═══════════════════════════════════════════╗')
console.log('║     订单可见性问题 - 全面诊断脚本       ║')
console.log('╚═══════════════════════════════════════════╝\n')

// ===== 1. 检查订单分布 =====
console.log('【1️⃣ 订单存储分布检查】')
console.log('─'.repeat(50))

const storageKeys = ['mock_orders', 'orders', 'pending_orders', 'completed_orders']
const allOrdersData = {}
let totalOrders = 0

storageKeys.forEach(key => {
  const data = wx.getStorageSync(key) || []
  allOrdersData[key] = data
  totalOrders += data.length
  console.log(`${key.padEnd(20)}: ${data.length} 个订单`)
})
console.log(`${'总计'.padEnd(20)}: ${totalOrders} 个订单\n`)

// ===== 2. 获取所有订单（模拟 orderHelper.getAllOrders）=====
console.log('【2️⃣ 订单合并结果】')
console.log('─'.repeat(50))

const orderMap = new Map()
Object.values(allOrdersData).forEach(orderArray => {
  orderArray.forEach(order => {
    if (!order || !order.id) return
    if (!orderMap.has(order.id)) {
      orderMap.set(order.id, order)
    } else {
      // 简单合并（保留更新的数据）
      const existing = orderMap.get(order.id)
      orderMap.set(order.id, { ...existing, ...order })
    }
  })
})

const mergedOrders = Array.from(orderMap.values())
console.log(`合并后总订单数: ${mergedOrders.length}`)

// 检查重复订单
const duplicateCheck = {}
Object.entries(allOrdersData).forEach(([key, orders]) => {
  orders.forEach(o => {
    if (!o.id) return
    if (!duplicateCheck[o.id]) {
      duplicateCheck[o.id] = []
    }
    duplicateCheck[o.id].push(key)
  })
})

const duplicates = Object.entries(duplicateCheck).filter(([id, sources]) => sources.length > 1)
if (duplicates.length > 0) {
  console.warn(`⚠️ 发现 ${duplicates.length} 个重复订单:`)
  duplicates.forEach(([id, sources]) => {
    console.log(`  订单 ${id}: 存在于 ${sources.join(', ')}`)
  })
} else {
  console.log('✅ 无重复订单\n')
}

// ===== 3. 检查最近5个订单的关键字段 =====
console.log('【3️⃣ 最近5个订单详细检查】')
console.log('─'.repeat(50))

const recentOrders = mergedOrders.slice(-5).reverse()
recentOrders.forEach((order, index) => {
  console.log(`\n订单 ${index + 1}/${recentOrders.length}:`)
  console.log(`  订单ID: ${order.id}`)
  console.log(`  商品名: ${order.productName || '未知'}`)
  console.log(`  商品ID: ${order.productId || '未设置'}`)
  console.log(`  订单状态: ${order.status || '未设置'}`)
  
  // 关键字段检查
  const buyerId = order.buyerId
  const artistId = order.artistId
  const serviceId = order.serviceId
  
  console.log(`\n  🔑 关键字段:`)
  console.log(`    buyerId: "${buyerId}" (${typeof buyerId})`)
  console.log(`    artistId: "${artistId}" (${typeof artistId})`)
  console.log(`    serviceId: "${serviceId || '无'}" (${typeof serviceId})`)
  
  // 问题检测
  const issues = []
  if (!buyerId || buyerId === '' || buyerId === 'undefined') {
    issues.push('❌ buyerId 缺失或无效')
  }
  if (!artistId || artistId === '' || artistId === 'undefined') {
    issues.push('❌ artistId 缺失或无效（画师端看不到）')
  }
  
  if (issues.length > 0) {
    console.log(`\n  ⚠️ 发现问题:`)
    issues.forEach(issue => console.log(`    ${issue}`))
  } else {
    console.log(`\n  ✅ 关键字段完整`)
  }
})

// ===== 4. 统计 artistId 为空的订单 =====
console.log(`\n\n【4️⃣ artistId 缺失检查】`)
console.log('─'.repeat(50))

const emptyArtistIds = mergedOrders.filter(o => !o.artistId || o.artistId === '' || o.artistId === 'undefined')
console.log(`❌ artistId 为空的订单数: ${emptyArtistIds.length}/${mergedOrders.length}`)

if (emptyArtistIds.length > 0) {
  console.log(`\n🚨 画师端将看不到以下订单:`)
  emptyArtistIds.forEach(o => {
    console.log(`  订单 ${o.id}: ${o.productName} (buyerId: ${o.buyerId}, 状态: ${o.status})`)
  })
} else {
  console.log('✅ 所有订单都有 artistId')
}

// ===== 5. 商品 artistId 检查 =====
console.log(`\n\n【5️⃣ 商品 artistId 检查】`)
console.log('─'.repeat(50))

const products = wx.getStorageSync('mock_products') || []
console.log(`总商品数: ${products.length}`)

const productsWithoutArtist = products.filter(p => !p.artistId || p.artistId === '' || p.artistId === 'undefined')
console.log(`❌ 无 artistId 的商品数: ${productsWithoutArtist.length}/${products.length}`)

if (productsWithoutArtist.length > 0) {
  console.log(`\n🚨 这些商品生成的订单画师端将看不到:`)
  productsWithoutArtist.slice(0, 10).forEach(p => {
    console.log(`  商品 "${p.name}" (ID: ${p.id}): artistId=${p.artistId || '未设置'}`)
  })
  if (productsWithoutArtist.length > 10) {
    console.log(`  ... 还有 ${productsWithoutArtist.length - 10} 个商品`)
  }
} else {
  console.log('✅ 所有商品都有 artistId')
}

// ===== 6. 订单-商品 ID 匹配检查 =====
console.log(`\n\n【6️⃣ 订单-商品 ID 匹配检查】`)
console.log('─'.repeat(50))

const productIds = new Set(products.map(p => String(p.id)))
const mismatchOrders = mergedOrders.filter(o => {
  if (!o.productId) return true // 无 productId
  return !productIds.has(String(o.productId))
})

console.log(`❌ productId 不匹配的订单数: ${mismatchOrders.length}/${mergedOrders.length}`)

if (mismatchOrders.length > 0) {
  console.log(`\n⚠️ 这些订单的商品不存在或已删除:`)
  mismatchOrders.slice(0, 5).forEach(o => {
    console.log(`  订单 ${o.id}: productId="${o.productId}", 商品名="${o.productName}"`)
  })
  if (mismatchOrders.length > 5) {
    console.log(`  ... 还有 ${mismatchOrders.length - 5} 个订单`)
  }
} else {
  console.log('✅ 所有订单的 productId 都有效')
}

// ===== 7. 用户端视角模拟 =====
console.log(`\n\n【7️⃣ 用户端可见性检查】`)
console.log('─'.repeat(50))

const currentUserId = wx.getStorageSync('userId')
console.log(`当前用户ID: ${currentUserId} (${typeof currentUserId})`)

const userVisibleOrders = mergedOrders.filter(o => {
  return String(o.buyerId).trim() === String(currentUserId).trim()
})

console.log(`用户端可见订单数: ${userVisibleOrders.length}/${mergedOrders.length}`)

if (userVisibleOrders.length === 0 && mergedOrders.length > 0) {
  console.warn(`\n🚨 用户端看不到任何订单！`)
  console.log(`\n可能原因:`)
  console.log(`  1. 当前用户ID "${currentUserId}" 与订单的 buyerId 不匹配`)
  console.log(`  2. 类型不一致（数字 vs 字符串）`)
  console.log(`\n订单的 buyerId 示例:`)
  mergedOrders.slice(0, 3).forEach(o => {
    console.log(`  订单 ${o.id}: buyerId="${o.buyerId}" (${typeof o.buyerId})`)
  })
} else {
  console.log(`✅ 用户端能看到 ${userVisibleOrders.length} 个订单`)
}

// ===== 8. 画师端视角模拟 =====
console.log(`\n\n【8️⃣ 画师端可见性检查】`)
console.log('─'.repeat(50))

console.log(`当前用户ID: ${currentUserId} (${typeof currentUserId})`)

const artistVisibleOrders = mergedOrders.filter(o => {
  return String(o.artistId).trim() === String(currentUserId).trim()
})

console.log(`画师端可见订单数: ${artistVisibleOrders.length}/${mergedOrders.length}`)

if (artistVisibleOrders.length === 0 && mergedOrders.length > 0) {
  console.warn(`\n🚨 画师端看不到任何订单！`)
  console.log(`\n可能原因:`)
  console.log(`  1. 当前用户不是画师`)
  console.log(`  2. 订单的 artistId 与当前用户ID不匹配`)
  console.log(`  3. 订单的 artistId 为空`)
  console.log(`\n订单的 artistId 示例:`)
  mergedOrders.slice(0, 5).forEach(o => {
    console.log(`  订单 ${o.id}: artistId="${o.artistId || '未设置'}" (${typeof o.artistId})`)
  })
} else {
  console.log(`✅ 画师端能看到 ${artistVisibleOrders.length} 个订单`)
}

// ===== 9. 终态订单过滤检查 =====
console.log(`\n\n【9️⃣ 订单状态分布】`)
console.log('─'.repeat(50))

const statusCount = {}
mergedOrders.forEach(o => {
  const status = o.status || '未知'
  statusCount[status] = (statusCount[status] || 0) + 1
})

Object.entries(statusCount).forEach(([status, count]) => {
  console.log(`  ${status.padEnd(20)}: ${count} 个订单`)
})

const terminalStates = ['completed', 'refunded', 'cancelled']
const terminalOrders = mergedOrders.filter(o => terminalStates.includes(o.status))
const activeOrders = mergedOrders.filter(o => !terminalStates.includes(o.status))

console.log(`\n📊 订单分类:`)
console.log(`  进行中订单: ${activeOrders.length}`)
console.log(`  终态订单: ${terminalOrders.length} (${terminalStates.join(', ')})`)

if (terminalOrders.length > 0) {
  console.log(`\n⚠️ 注意：用户端和画师端默认不显示终态订单`)
  console.log(`  如需显示历史订单，需在 prepareOrdersForPage 中传入 includeCompleted: true`)
}

// ===== 10. 总结与建议 =====
console.log(`\n\n【🎯 诊断总结】`)
console.log('═'.repeat(50))

const problems = []
const warnings = []

// 检测问题
if (emptyArtistIds.length > 0) {
  problems.push(`🔴 严重：${emptyArtistIds.length} 个订单缺少 artistId，画师端无法看到`)
}

if (productsWithoutArtist.length > 0) {
  problems.push(`🟡 警告：${productsWithoutArtist.length} 个商品缺少 artistId，新订单将无法分配画师`)
}

if (mismatchOrders.length > 0) {
  warnings.push(`⚠️ ${mismatchOrders.length} 个订单的商品不存在`)
}

if (userVisibleOrders.length === 0 && mergedOrders.length > 0) {
  problems.push(`🔴 严重：用户端看不到任何订单（可能是 userId 不匹配）`)
}

if (artistVisibleOrders.length === 0 && mergedOrders.length > 0) {
  warnings.push(`⚠️ 画师端看不到任何订单（可能当前用户不是画师）`)
}

if (terminalOrders.length > activeOrders.length) {
  warnings.push(`⚠️ 终态订单数量多于进行中订单，可能被用户端/画师端过滤`)
}

// 输出结果
if (problems.length === 0 && warnings.length === 0) {
  console.log(`\n✅✅✅ 恭喜！未发现明显问题 ✅✅✅`)
} else {
  if (problems.length > 0) {
    console.log(`\n🚨 发现 ${problems.length} 个严重问题:`)
    problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`))
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ 发现 ${warnings.length} 个警告:`)
    warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`))
  }
  
  console.log(`\n📝 建议措施:`)
  
  if (emptyArtistIds.length > 0) {
    console.log(`  1. 修复 artistId 为空的订单（高优先级）`)
    console.log(`     - 检查商品详情页 artistId 是否正确传递`)
    console.log(`     - 在下单前验证 artistId 不为空`)
  }
  
  if (productsWithoutArtist.length > 0) {
    console.log(`  2. 为商品补充 artistId（高优先级）`)
    console.log(`     - 批量更新商品的 artistId 字段`)
  }
  
  if (userVisibleOrders.length === 0 && mergedOrders.length > 0) {
    console.log(`  3. 检查 userId 类型匹配（高优先级）`)
    console.log(`     - 确保 order.buyerId 和 currentUserId 类型一致`)
  }
  
  if (terminalOrders.length > activeOrders.length) {
    console.log(`  4. 考虑显示历史订单`)
    console.log(`     - 在 order-list/index.js 和 workspace/index.js 中`)
    console.log(`     - 传入 includeCompleted: true`)
  }
}

console.log(`\n╔═══════════════════════════════════════════╗`)
console.log(`║           诊断完成！请截图保存            ║`)
console.log(`╚═══════════════════════════════════════════╝`)

