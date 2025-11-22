/**
 * 自动修复所有"在非 async 函数中使用 await"的错误
 */

const fs = require('fs')
const path = require('path')

const report = {
  scannedFiles: 0,
  fixedFiles: 0,
  totalFixes: 0,
  details: []
}

// 需要扫描的文件列表
const filesToScan = [
  'miniprogram/pages/admin/index.js',
  'miniprogram/pages/withdraw/index.js',
  'miniprogram/utils/category-service.js',
  'miniprogram/pages/category-manage/index.js',
  'miniprogram/pages/order-success/index.js',
  'miniprogram/pages/service-qr-manage/index.js',
  'miniprogram/pages/home/index.js',
  'miniprogram/pages/income-detail/index.js',
  'miniprogram/pages/debug-order/index.js',
  'miniprogram/pages/order-diagnosis/index.js',
  'miniprogram/pages/user-center/index.js',
  'miniprogram/pages/artist-qrcode/index.js',
  'miniprogram/pages/product-edit/index.js',
  'miniprogram/pages/artist-products-manage/index.js',
  'miniprogram/pages/artist-detail/index.js',
  'miniprogram/pages/artist-application-detail/index.js',
  'miniprogram/pages/review-manage/index.js',
  'miniprogram/pages/report/index.js',
  'miniprogram/pages/buyer-show/publish/index.js',
  'miniprogram/pages/product-detail/index.js',
  'miniprogram/pages/search/index.js',
  'miniprogram/pages/reward-records/index.js',
  'miniprogram/app.js',
  'miniprogram/pages/cart/index.js',
  'miniprogram/pages/data-stats/index.js',
  'miniprogram/pages/service-workspace/index.js',
  'miniprogram/pages/workspace/index.js',
  'miniprogram/pages/order-detail/index.js',
  'miniprogram/pages/order-list/index.js',
  'miniprogram/pages/product-manage/index.js',
  'miniprogram/pages/apply/index.js',
  'miniprogram/pages/login/index.js',
  'miniprogram/pages/banner-manage/index.js',
  'miniprogram/pages/artist-dashboard/index.js',
  'miniprogram/pages/service-dashboard/index.js'
]

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')
  
  const fixes = []
  let modified = false
  
  // 查找所有包含 await 的行
  const awaitLines = []
  lines.forEach((line, index) => {
    if (line.includes('await ')) {
      awaitLines.push(index)
    }
  })
  
  if (awaitLines.length === 0) {
    return { modified: false, fixes: [] }
  }
  
  // 对每个 await 所在的行，向上查找函数定义
  awaitLines.forEach(awaitLineNum => {
    let funcLineNum = -1
    let funcLine = ''
    
    // 向上查找函数定义（最多往上查50行）
    for (let i = awaitLineNum; i >= Math.max(0, awaitLineNum - 50); i--) {
      const line = lines[i]
      
      // 匹配各种函数定义模式
      const patterns = [
        /^\s*(\w+)\s*\([^)]*\)\s*\{/,                    // onLoad() {
        /^\s*async\s+(\w+)\s*\([^)]*\)\s*\{/,           // async onLoad() {
        /^\s*(\w+):\s*function\s*\([^)]*\)\s*\{/,       // method: function() {
        /^\s*(\w+):\s*async\s*function\s*\([^)]*\)\s*\{/, // method: async function() {
        /^\s*(\w+):\s*\([^)]*\)\s*=>\s*\{/,             // method: () => {
        /^\s*(\w+):\s*async\s*\([^)]*\)\s*=>\s*\{/,     // method: async () => {
        /^\s*function\s+(\w+)\s*\([^)]*\)\s*\{/,        // function name() {
        /^\s*async\s+function\s+(\w+)\s*\([^)]*\)\s*\{/, // async function name() {
        /success:\s*\([^)]*\)\s*=>\s*\{/,               // success: () => {
        /success:\s*async\s*\([^)]*\)\s*=>\s*\{/,       // success: async () => {
        /fail:\s*\([^)]*\)\s*=>\s*\{/,                  // fail: () => {
        /complete:\s*\([^)]*\)\s*=>\s*\{/               // complete: () => {
      ]
      
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          funcLineNum = i
          funcLine = line
          break
        }
      }
      
      if (funcLineNum !== -1) break
    }
    
    if (funcLineNum === -1) return
    
    // 检查是否已经有 async
    if (funcLine.includes('async ')) return
    
    // 添加 async
    const originalLine = lines[funcLineNum]
    let fixedLine = originalLine
    
    // 各种模式的修复
    if (/^\s*(\w+)\s*\(/.test(originalLine)) {
      // onLoad() { => async onLoad() {
      fixedLine = originalLine.replace(/^(\s*)(\w+)(\s*\()/, '$1async $2$3')
    } else if (/^\s*(\w+):\s*function\s*\(/.test(originalLine)) {
      // method: function() { => method: async function() {
      fixedLine = originalLine.replace(/(:\s*)function(\s*\()/, '$1async function$2')
    } else if (/^\s*(\w+):\s*\(/.test(originalLine)) {
      // method: () => { => method: async () => {
      fixedLine = originalLine.replace(/(:\s*)(\()/, '$1async $2')
    } else if (/^\s*function\s+(\w+)/.test(originalLine)) {
      // function name() { => async function name() {
      fixedLine = originalLine.replace(/^(\s*)function(\s+)/, '$1async function$2')
    } else if (/success:\s*\(/.test(originalLine)) {
      // success: () => { => success: async () => {
      fixedLine = originalLine.replace(/(success:\s*)(\()/, '$1async $2')
    } else if (/fail:\s*\(/.test(originalLine)) {
      // fail: () => { => fail: async () => {
      fixedLine = originalLine.replace(/(fail:\s*)(\()/, '$1async $2')
    } else if (/complete:\s*\(/.test(originalLine)) {
      // complete: () => { => complete: async () => {
      fixedLine = originalLine.replace(/(complete:\s*)(\()/, '$1async $2')
    }
    
    if (fixedLine !== originalLine) {
      lines[funcLineNum] = fixedLine
      modified = true
      
      // 提取函数名
      const match = originalLine.match(/(\w+)/)
      const funcName = match ? match[1] : `line ${funcLineNum + 1}`
      
      fixes.push({
        line: funcLineNum + 1,
        function: funcName,
        before: originalLine.trim(),
        after: fixedLine.trim()
      })
    }
  })
  
  if (modified) {
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
  }
  
  return { modified, fixes }
}

// 执行修复
console.log('🔍 开始扫描项目...\n')

filesToScan.forEach(filePath => {
  report.scannedFiles++
  
  try {
    const result = fixFile(filePath)
    
    if (result.modified) {
      report.fixedFiles++
      report.totalFixes += result.fixes.length
      report.details.push({
        file: filePath,
        fixes: result.fixes
      })
      
      console.log(`✅ ${filePath}`)
      result.fixes.forEach(fix => {
        console.log(`   行${fix.line}: ${fix.function}`)
        console.log(`     修复前: ${fix.before}`)
        console.log(`     修复后: ${fix.after}`)
      })
      console.log('')
    }
  } catch (err) {
    console.error(`❌ ${filePath}: ${err.message}`)
  }
})

// 生成报告
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📊 修复报告')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
console.log(`扫描文件: ${report.scannedFiles} 个`)
console.log(`修复文件: ${report.fixedFiles} 个`)
console.log(`修复函数: ${report.totalFixes} 处\n`)

if (report.details.length > 0) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 详细列表')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  report.details.forEach(detail => {
    console.log(`📁 ${detail.file}`)
    detail.fixes.forEach(fix => {
      console.log(`   • ${fix.function} (行${fix.line})`)
    })
    console.log('')
  })
}

// 保存报告
fs.writeFileSync(
  path.join(__dirname, 'await-async-fix-report.json'),
  JSON.stringify(report, null, 2)
)

console.log('📄 详细报告已保存到: await-async-fix-report.json\n')

