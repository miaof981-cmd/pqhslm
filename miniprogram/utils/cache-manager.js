/**
 * 缓存管理器
 * 支持内存缓存和Storage缓存
 */

class CacheManager {
  constructor() {
    this.memoryCache = new Map()
  }
  
  /**
   * 设置内存缓存
   * @param {string} key 缓存键
   * @param {any} data 缓存数据
   * @param {number} ttl 过期时间（毫秒），默认5分钟
   */
  setMemory(key, data, ttl = 5 * 60 * 1000) {
    this.memoryCache.set(key, {
      data,
      expireTime: Date.now() + ttl
    })
  }
  
  /**
   * 获取内存缓存
   * @param {string} key 缓存键
   * @returns {any} 缓存数据或null
   */
  getMemory(key) {
    const cache = this.memoryCache.get(key)
    
    if (!cache) return null
    
    // 检查过期
    if (Date.now() > cache.expireTime) {
      this.memoryCache.delete(key)
      return null
    }
    
    return cache.data
  }
  
  /**
   * 设置Storage缓存
   * @param {string} key 缓存键
   * @param {any} data 缓存数据
   * @param {number} ttl 过期时间（毫秒），默认30分钟
   */
  setStorage(key, data, ttl = 30 * 60 * 1000) {
    try {
      wx.setStorageSync(`cache_${key}`, {
        data,
        expireTime: Date.now() + ttl,
        cachedAt: Date.now()
      })
    } catch (error) {
      console.error('设置Storage缓存失败:', error)
    }
  }
  
  /**
   * 获取Storage缓存
   * @param {string} key 缓存键
   * @returns {any} 缓存数据或null
   */
  getStorage(key) {
    try {
      const cache = wx.getStorageSync(`cache_${key}`)
      
      if (!cache) return null
      
      // 检查过期
      if (Date.now() > cache.expireTime) {
        wx.removeStorageSync(`cache_${key}`)
        return null
      }
      
      return cache.data
    } catch (error) {
      console.error('获取Storage缓存失败:', error)
      return null
    }
  }
  
  /**
   * 清除指定缓存
   * @param {string} key 缓存键
   * @param {string} type 缓存类型 'memory' | 'storage' | 'all'
   */
  clear(key, type = 'all') {
    if (type === 'memory' || type === 'all') {
      this.memoryCache.delete(key)
    }
    
    if (type === 'storage' || type === 'all') {
      try {
        wx.removeStorageSync(`cache_${key}`)
      } catch (error) {
        console.error('清除Storage缓存失败:', error)
      }
    }
  }
  
  /**
   * 清除所有缓存
   */
  clearAll() {
    // 清空内存缓存
    this.memoryCache.clear()
    
    // 清空Storage中的所有缓存（以cache_前缀）
    try {
      const res = wx.getStorageInfoSync()
      res.keys.forEach(key => {
        if (key.startsWith('cache_')) {
          wx.removeStorageSync(key)
        }
      })
    } catch (error) {
      console.error('清除所有Storage缓存失败:', error)
    }
  }
  
  /**
   * 获取缓存统计
   */
  getStats() {
    const memorySize = this.memoryCache.size
    
    let storageSize = 0
    try {
      const res = wx.getStorageInfoSync()
      storageSize = res.keys.filter(k => k.startsWith('cache_')).length
    } catch (error) {
      console.error('获取缓存统计失败:', error)
    }
    
    return {
      memoryCache: memorySize,
      storageCache: storageSize,
      total: memorySize + storageSize
    }
  }
}

module.exports = new CacheManager()

