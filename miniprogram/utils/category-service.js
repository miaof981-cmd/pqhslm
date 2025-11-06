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

function getRawCategoryList() {
  try {
    const stored = wx.getStorageSync('product_categories')
    if (Array.isArray(stored) && stored.length > 0) {
      const normalized = stored
        .map(normalizeCategory)
        .filter(Boolean)

      if (normalized.length > 0) {
        return normalized
      }
    }
  } catch (error) {
    console.warn('[category-service] 读取 product_categories 失败:', error)
  }

  return DEFAULT_CATEGORIES.slice()
}

function getAvailableCategories(options = {}) {
  const { includeDisabled = false } = options
  return getRawCategoryList().filter(category => includeDisabled || category.status !== 'disabled')
}

function getSelectableCategories(currentId = 'all') {
  const categories = getAvailableCategories()
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
  const matched = categories.find(category => category.id === categoryId || category._id === categoryId)
  return matched ? matched.name : ''
}

module.exports = {
  getSelectableCategories,
  getCategoryOptions,
  getCategoryNameById
}
