// 云函数：productManager - 商品管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 商品管理云函数
 * 支持操作：getList, getDetail, search, getCategories, create, update, delete
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'getList':
        return await getProductList(event)
      case 'getDetail':
        return await getProductDetail(event)
      case 'search':
        return await searchProducts(event)
      case 'getCategories':
        return await getCategories()
      case 'create':
        return await createProduct(openid, event)
      case 'update':
        return await updateProduct(openid, event)
      case 'delete':
        return await deleteProduct(openid, event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('商品管理错误:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

/**
 * 获取商品列表
 * 支持分页、筛选、排序
 */
async function getProductList(event) {
  const {
    page = 1,
    pageSize = 10,
    category,
    artistId,
    priceMin,
    priceMax,
    deliveryDaysMax,
    sortBy = 'createTime', // createTime, sales, price
    sortOrder = 'desc' // asc, desc
  } = event

  // 构建查询条件
  let query = db.collection('products')
  const where = {}

  if (category && category !== '全部') {
    where.category = category
  }

  if (artistId) {
    where.artistId = artistId
  }

  if (priceMin !== undefined || priceMax !== undefined) {
    where.price = {}
    if (priceMin !== undefined) where.price[_.gte] = parseFloat(priceMin)
    if (priceMax !== undefined) where.price[_.lte] = parseFloat(priceMax)
  }

  if (deliveryDaysMax) {
    where.deliveryDays = _.lte(parseInt(deliveryDaysMax))
  }

  // 应用查询条件
  if (Object.keys(where).length > 0) {
    query = query.where(where)
  }

  // 获取总数
  const countRes = await query.count()
  const total = countRes.total

  // 排序
  query = query.orderBy(sortBy, sortOrder)

  // 分页
  const skip = (page - 1) * pageSize
  query = query.skip(skip).limit(pageSize)

  // 执行查询
  const res = await query.get()

  return {
    success: true,
    data: {
      list: res.data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

/**
 * 获取商品详情
 */
async function getProductDetail(event) {
  const { productId } = event

  if (!productId) {
    return { success: false, message: '商品ID不能为空' }
  }

  const res = await db.collection('products')
    .where({ productId })
    .get()

  if (res.data.length === 0) {
    return { success: false, message: '商品不存在' }
  }

  // 增加浏览次数
  await db.collection('products')
    .where({ productId })
    .update({
      data: {
        viewCount: _.inc(1)
      }
    })

  return {
    success: true,
    data: res.data[0]
  }
}

/**
 * 搜索商品
 * 支持按商品名、画师名搜索
 */
async function searchProducts(event) {
  const { keyword, page = 1, pageSize = 10 } = event

  if (!keyword) {
    return await getProductList({ page, pageSize })
  }

  // 搜索商品名称
  const nameRes = await db.collection('products')
    .where({
      productName: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 搜索画师名称
  const artistRes = await db.collection('products')
    .where({
      artistName: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 合并结果并去重
  const resultMap = new Map()
  nameRes.data.forEach(item => resultMap.set(item._id, item))
  artistRes.data.forEach(item => resultMap.set(item._id, item))
  
  const list = Array.from(resultMap.values())

  return {
    success: true,
    data: {
      list,
      total: list.length,
      page,
      pageSize
    }
  }
}

/**
 * 获取分类列表
 */
async function getCategories() {
  const res = await db.collection('categories')
    .orderBy('sort', 'asc')
    .get()

  return {
    success: true,
    data: res.data
  }
}

/**
 * 创建商品（仅管理员/画师）
 */
async function createProduct(openid, event) {
  // 检查权限
  const hasPermission = await checkProductPermission(openid)
  if (!hasPermission) {
    return { success: false, message: '无权限操作' }
  }

  const {
    productName,
    category,
    price,
    deliveryDays,
    description,
    images,
    artistId,
    artistName
  } = event

  // 生成商品ID
  const productId = `product_${Date.now()}`
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const product = {
    productId,
    productName,
    category,
    price: parseFloat(price),
    deliveryDays: parseInt(deliveryDays),
    description: description || '',
    images: images || [],
    artistId,
    artistName,
    sales: 0,
    viewCount: 0,
    status: 'active',
    createTime: now,
    updatedAt: now
  }

  await db.collection('products').add({
    data: product
  })

  return {
    success: true,
    data: { productId },
    message: '创建成功'
  }
}

/**
 * 更新商品（仅管理员/商品所属画师）
 */
async function updateProduct(openid, event) {
  const { productId, ...updateData } = event

  if (!productId) {
    return { success: false, message: '商品ID不能为空' }
  }

  // 检查权限
  const hasPermission = await checkProductPermission(openid, productId)
  if (!hasPermission) {
    return { success: false, message: '无权限操作' }
  }

  updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const res = await db.collection('products')
    .where({ productId })
    .update({
      data: updateData
    })

  if (res.stats.updated === 0) {
    return { success: false, message: '更新失败' }
  }

  return {
    success: true,
    message: '更新成功'
  }
}

/**
 * 删除商品（仅管理员）
 */
async function deleteProduct(openid, event) {
  const { productId } = event

  // 检查管理员权限
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length === 0) {
    return { success: false, message: '仅管理员可删除商品' }
  }

  const res = await db.collection('products')
    .where({ productId })
    .remove()

  if (res.stats.removed === 0) {
    return { success: false, message: '删除失败' }
  }

  return {
    success: true,
    message: '删除成功'
  }
}

/**
 * 检查商品操作权限
 */
async function checkProductPermission(openid, productId = null) {
  // 检查是否为管理员
  const adminRes = await db.collection('system_admin')
    .where({ _openid: openid, isAdmin: true })
    .get()

  if (adminRes.data.length > 0) {
    return true
  }

  // 如果是更新操作，检查是否为商品所属画师
  if (productId) {
    const userRes = await db.collection('users')
      .where({ _openid: openid })
      .get()

    if (userRes.data.length > 0) {
      const userId = userRes.data[0].userId
      
      const productRes = await db.collection('products')
        .where({ productId, artistId: userId })
        .get()

      return productRes.data.length > 0
    }
  }

  // 检查用户角色是否为画师
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userRes.data.length > 0) {
    return userRes.data[0].role === 'artist'
  }

  return false
}

