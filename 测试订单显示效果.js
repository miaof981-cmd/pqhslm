/**
 * 📋 用户订单页面显示效果测试脚本
 * 
 * 🎯 测试内容:
 * 1. 进度条是否正常显示
 * 2. 进度条颜色是否根据状态变化（正常/临近/脱稿）
 * 3. 脱稿天数是否正确显示
 * 4. 操作按钮是否正确显示
 * 5. 人员信息（画师、客服）是否正确显示
 * 
 * 🔧 使用方法:
 * 1. 在微信开发者工具的控制台粘贴此脚本
 * 2. 回车执行
 * 3. 查看控制台输出的诊断报告
 * 4. 手动验证页面显示是否符合预期
 */

console.log('\n\n═══════════════════════════════════════════')
console.log('📋 用户订单页面显示效果诊断')
console.log('═══════════════════════════════════════════\n')

// 获取订单数据
const orders = wx.getStorageSync('orders') || []
const pendingOrders = wx.getStorageSync('pending_orders') || []
const allOrders = [...orders, ...pendingOrders]

console.log(`✅ 订单总数: ${allOrders.length}`)

if (allOrders.length === 0) {
  console.log('⚠️  没有订单数据！请先下单再测试。\n')
  console.log('建议: 去首页随便下个订单，然后再运行此脚本。')
} else {
  // 分析每个订单的显示状态
  allOrders.forEach((order, index) => {
    console.log(`\n--- 订单 ${index + 1} ---`)
    console.log(`订单号: ${order.id}`)
    console.log(`商品: ${order.productName}`)
    console.log(`状态: ${order.status}`)
    
    // 判断进度条是否应该显示
    const shouldShowProgress = ['processing', 'inProgress', 'overdue', 'nearDeadline'].includes(order.status)
    console.log(`进度条显示: ${shouldShowProgress ? '✅ 是' : '❌ 否'}`)
    
    if (shouldShowProgress) {
      // 计算进度
      const createTime = new Date(order.createTime.replace(/-/g, '/'))
      const deliveryDays = order.deliveryDays || 7
      const deadline = new Date(createTime.getTime() + deliveryDays * 24 * 60 * 60 * 1000)
      const now = new Date()
      
      const totalMs = deadline - createTime
      const elapsedMs = now - createTime
      const percent = Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100)
      
      const timeLeft = deadline - now
      const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000))
      const isOverdue = timeLeft < 0
      const isNearDeadline = daysLeft <= 2 && !isOverdue
      
      console.log(`  进度: ${percent.toFixed(1)}%`)
      
      if (isOverdue) {
        const overdueDays = Math.floor(-timeLeft / (24 * 60 * 60 * 1000))
        console.log(`  状态: 🔴 已脱稿 ${overdueDays} 天`)
        console.log(`  颜色: 红色`)
      } else if (isNearDeadline) {
        console.log(`  状态: 🟠 临近截稿 (剩余${daysLeft}天)`)
        console.log(`  颜色: 橙色`)
      } else {
        console.log(`  状态: 🟢 正常进行中`)
        console.log(`  颜色: 绿色`)
      }
    }
    
    // 操作按钮状态
    console.log(`操作按钮:`)
    if (order.status === 'unpaid') {
      console.log(`  - 取消订单`)
      console.log(`  - 立即支付`)
    } else if (['paid', 'processing', 'inProgress', 'overdue', 'nearDeadline'].includes(order.status)) {
      console.log(`  - 联系客服`)
      console.log(`  - 投诉`)
    } else if (order.status === 'waitingConfirm') {
      console.log(`  - 联系客服`)
      console.log(`  - 🎉 确认完成 (金色光效)`)
    } else if (order.status === 'completed') {
      console.log(`  - 删除订单`)
      console.log(`  - 评价`)
    }
    
    // 人员信息
    console.log(`人员信息:`)
    console.log(`  画师: ${order.artistName || '未分配'} ${order.artistAvatar ? '✅' : '❌ 缺少头像'}`)
    console.log(`  客服: ${order.serviceName || '未分配'} ${order.serviceAvatar ? '✅' : '❌ 缺少头像'}`)
  })
}

console.log('\n\n═══════════════════════════════════════════')
console.log('📝 测试建议')
console.log('═══════════════════════════════════════════\n')

console.log('1️⃣  打开"我的订单"页面，检查:')
console.log('   - 进度条是否显示')
console.log('   - 进度条颜色是否符合预期（绿/橙/红）')
console.log('   - 时间轴是否显示（下单时间、截稿时间）')
console.log('   - 脱稿天数是否显示')

console.log('\n2️⃣  测试不同状态订单:')
console.log('   - 正常订单: 绿色进度条')
console.log('   - 临近截稿: 橙色进度条')
console.log('   - 已脱稿: 红色进度条 + 红色背景')
console.log('   - 待确认: 金色流动光效边框')

console.log('\n3️⃣  检查操作按钮:')
console.log('   - 按钮是否显示正确')
console.log('   - 点击是否正常工作')

console.log('\n4️⃣  检查人员信息:')
console.log('   - 画师头像和名称是否显示')
console.log('   - 客服头像和名称是否显示')
console.log('   - 布局是否美观')

console.log('\n═══════════════════════════════════════════')
console.log('✅ 诊断完成！')
console.log('═══════════════════════════════════════════\n\n')

