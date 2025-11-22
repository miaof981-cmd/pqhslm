const DEFAULT_CATEGORIES = [
  { id: 'portrait', name: '头像设计', icon: '👤', status: 'active' },
  { id: 'illustration', name: '插画设计', icon: '🎨', status: 'active' },
  { id: 'logo', name: 'LOGO设计', icon: '🏷️', status: 'active' },
  { id: 'poster', name: '海报设计', icon: '🖼️', status: 'active' },
  { id: 'emoticon', name: '表情包', icon: '😊', status: 'active' },
  { id: 'ui', name: 'UI设计', icon: '📱', status: 'active' },
  { id: 'animation', name: '动画设计', icon: '🎬', status: 'active' },
  { id: 'banner', name: '横幅设计', icon: '📐', status: 'active' }
]

function normalizeCategory(raw) {
  if (!raw) return null

  const id = String(raw.id || raw._id || '').trim()
  if (!id) return null

  return {
    id,
    name: (raw.name || '').trim() || '未命名分类',
    icon: raw.icon || '',
    status: raw.status || 'active'
  }
}

async function getRawCategoryList() {
  // ✅ 从云端获取分类列表
  try {
    const cloudAPI = require('./cloud-api.js')
    const res = await cloudAPI.getCategoryList()
    
    if (res.success) {
      // 🛡️ 安全数组解析
      const categories = cloudAPI.safeArray(res)
      const normalized = categories
        .map(normalizeCategory)
        .filter(Boolean)

      if (normalized.length > 0) {
        return normalized
      }
    }
  } catch (error) {
    console.warn('[category-service] 从云端读取分类失败:', error)
  }

  return DEFAULT_CATEGORIES.slice()
}

async function getAvailableCategories(options = {}) {
  const { includeDisabled = false } = options
  const rawList = await getRawCategoryList()
  return rawList.filter(category => includeDisabled || category.status !== 'disabled')
}

async function getSelectableCategories(currentId = 'all') {
  const categories = await getAvailableCategories()
  const list = categories.map(category => ({
    ...category,
    active: category.id === currentId
  }))

  return [
    {
      id: 'all',
      name: '全部',
      icon: '',
      status: 'active',
      active: currentId === 'all'
    },
    ...list
  ]
}

function getCategoryOptions() {
  return getAvailableCategories().map(category => ({
    id: category.id,
    name: category.name,
    icon: category.icon
  }))
}

function getCategoryNameById(categoryId) {
  if (!categoryId) return ''
  const categories = getRawCategoryList()
  // 🔧 修复：使用String()确保类型匹配
  const idStr = String(categoryId)
  const matched = categories.find(category => 
    String(category.id) === idStr || String(category._id) === idStr
  )
  return matched ? matched.name : ''
}

module.exports = {
  getSelectableCategories,
  getCategoryOptions,
  getCategoryNameById
}
