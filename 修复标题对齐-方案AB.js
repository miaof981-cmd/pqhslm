/**
 * 修复标题对齐问题 - 两种方案
 * 测试后如果发现不对齐，选择其中一种方案
 */

// ==================== 方案A：强制两行高度（简单） ====================
/*
优点: 实现简单，所有卡片高度一致
缺点: 短标题会有空白，浪费一点空间

复制以下CSS到 miniprogram/pages/home/index.wxss 的 .product-name 样式中：

.product-name {
  font-size: 26rpx;
  color: #333;
  line-height: 1.4;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  font-weight: 500;
  min-height: 72rpx;  // ← 恢复固定高度（26rpx × 1.4 × 2 = 72.8rpx）
}
*/

// ==================== 方案B：统一卡片高度（推荐） ====================
/*
优点: 卡片整体对齐，视觉更整齐
缺点: 实现稍复杂，但效果最好

原理: 不管标题几行，整个商品卡片高度统一

复制以下CSS到 miniprogram/pages/home/index.wxss：

方法1 - 使用固定卡片高度:
.product-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  height: 280rpx;  // ← 添加固定高度
}

.product-image-wrapper {
  width: 100%;
  padding-top: 100%;
  position: relative;
  overflow: hidden;
  background: #F5F5F5;
  flex-shrink: 0;  // ← 添加：防止图片被压缩
}

.product-info {
  padding: 12rpx;
  flex: 1;  // ← 添加：占据剩余空间
  display: flex;
  flex-direction: column;
  justify-content: space-between;  // ← 添加：价格区域始终在底部
}

.product-name {
  font-size: 26rpx;
  color: #333;
  line-height: 1.4;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  font-weight: 500;
  // 不需要 min-height
}

.product-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;  // ← 添加：始终在底部
}
*/

// ==================== 方案C：网格布局对齐（最佳） ====================
/*
优点: 自动对齐，最灵活
缺点: 需要修改父容器样式

复制以下CSS到 miniprogram/pages/home/index.wxss：

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  padding: 0 12rpx;
  grid-auto-rows: 1fr;  // ← 关键：每行高度相同
}

.product-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  height: 100%;  // ← 关键：填充网格单元格
}

.product-image-wrapper {
  width: 100%;
  padding-top: 100%;
  position: relative;
  overflow: hidden;
  background: #F5F5F5;
  flex-shrink: 0;
}

.product-info {
  padding: 12rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 26rpx;
  color: #333;
  line-height: 1.4;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  font-weight: 500;
}

.product-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}
*/

console.log('━'.repeat(70))
console.log('📋 标题对齐修复方案')
console.log('━'.repeat(70))
console.log('')
console.log('方案A - 强制两行高度（最简单）')
console.log('  添加: min-height: 72rpx')
console.log('  优点: 实现简单')
console.log('  缺点: 短标题有空白')
console.log('')
console.log('方案B - 统一卡片高度（推荐）')
console.log('  设置: .product-card { height: 280rpx }')
console.log('  优点: 卡片整体对齐，视觉整齐')
console.log('  缺点: 需要调整多个样式')
console.log('')
console.log('方案C - 网格布局对齐（最佳）')
console.log('  设置: grid-auto-rows: 1fr')
console.log('  优点: 自动对齐，最灵活')
console.log('  缺点: 需要修改父容器')
console.log('')
console.log('━'.repeat(70))
console.log('💡 请先运行 "测试标题对齐.js" 查看效果')
console.log('   如果发现不对齐，再选择合适的方案')
console.log('━'.repeat(70))

