// 在微信开发者工具控制台运行此脚本，检查草稿状态

console.log('=== 草稿检查 ===')

try {
  const draft = wx.getStorageSync('product_draft')
  
  if (!draft) {
    console.log('❌ 没有草稿数据')
  } else {
    console.log('✅ 找到草稿！')
    console.log('草稿时间:', new Date(draft.timestamp))
    console.log('当前时间:', new Date())
    const hoursDiff = (Date.now() - draft.timestamp) / (1000 * 60 * 60)
    console.log('草稿年龄:', hoursDiff.toFixed(2), '小时')
    console.log('是否有效（<24小时）:', hoursDiff < 24)
    
    console.log('\n草稿内容:')
    console.log('- 当前步骤:', draft.currentStep)
    console.log('- 商品名称:', draft.formData?.name || '(空)')
    console.log('- 商品图片数量:', draft.formData?.images?.length || 0)
    console.log('- 基础价格:', draft.formData?.basePrice || '(空)')
    console.log('- 分类:', draft.categoryName)
    console.log('- 出稿天数:', draft.deliveryDays)
    
    if (draft.spec1Selected) {
      console.log('- 规格1:', draft.spec1Name, `(${draft.spec1Values?.length || 0}个选项)`)
    }
    if (draft.spec2Selected) {
      console.log('- 规格2:', draft.spec2Name, `(${draft.spec2Values?.length || 0}个选项)`)
    }
  }
} catch (error) {
  console.error('❌ 检查失败:', error)
}
