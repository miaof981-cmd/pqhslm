/**
 * 图片工具，负责将 base64 数据转换为可直接渲染的本地路径。
 * 统一缓存转换结果，避免重复写入文件系统。
 */

const DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0VFRkZFRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiBmaWxsPSIjY2NjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+'

function safeTrim(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function isRenderableDirectly(url) {
  if (!url) return false
  
  // ❌ 排除临时路径（小程序重启后失效）
  if (url.startsWith('http://tmp/') || 
      url.startsWith('https://tmp/') ||
      url.startsWith('wxfile://tmp')) {
    return false
  }
  
  // ❌ 排除微信临时域名（会过期）
  if (url.includes('thirdwx.qlogo.cn')) {
    return false
  }
  
  return /^(https?:|cloud:|wxfile:|file:|\/|\.\/)/i.test(url)
}

function hashString(str) {
  if (!str) return 'empty'
  const sample = str.length > 1024
    ? str.slice(0, 512) + str.slice(-512)
    : str

  let hash = 0
  for (let i = 0; i < sample.length; i++) {
    hash = (hash * 31 + sample.charCodeAt(i)) >>> 0
  }
  return (hash + sample.length).toString(16)
}

function ensureRenderableImage(source, options = {}) {
  const fallback = typeof options.fallback === 'string'
    ? options.fallback
    : DEFAULT_PLACEHOLDER

  const namespace = options.namespace || 'img'
  const value = safeTrim(source)
  if (!value) return fallback

  // ⚠️ 如果是失效的临时路径，直接返回占位符（但不影响其他逻辑）
  if (value.startsWith('http://tmp/') || 
      value.startsWith('https://tmp/') ||
      value.startsWith('wxfile://tmp') ||
      value.includes('thirdwx.qlogo.cn')) {
    console.warn('[image-helper] 检测到失效的临时路径，使用占位符')
    return fallback
  }

  // ✅ 如果已经是可渲染的URL，直接返回
  if (isRenderableDirectly(value)) {
    return value
  }

  // ✅ 如果是 base64，直接返回（不转换，避免文件系统问题）
  if (value.startsWith('data:image')) {
    // 🎯 直接使用 base64，性能和兼容性更好
    return value
  }

  // 其他情况返回占位符
  return fallback
}

module.exports = {
  ensureRenderableImage,
  DEFAULT_PLACEHOLDER
}
