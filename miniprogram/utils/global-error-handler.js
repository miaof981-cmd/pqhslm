/**
 * 全局错误捕获模块
 * 捕获所有未处理的错误、Promise异常、云函数失败、本地缓存异常等
 */

class GlobalErrorHandler {
  constructor() {
    this.errorLog = []
    this.maxLogSize = 100 // 最多保留100条错误日志
  }

  /**
   * 初始化错误捕获
   */
  init() {
    this.captureUnhandledRejection()
    this.captureConsoleError()
    console.log('[GLOBAL ERROR HANDLER] 全局错误捕获已启动')
  }

  /**
   * 捕获未处理的 Promise 错误
   */
  captureUnhandledRejection() {
    // 小程序环境下，通过 App 的 onError 和 onUnhandledRejection 捕获
    const originalOnError = App.prototype.onError
    const originalOnUnhandledRejection = App.prototype.onUnhandledRejection

    // 覆盖 App.onError
    App.prototype.onError = function(error) {
      globalErrorHandler.logError({
        type: 'APP_ERROR',
        error: error,
        message: error,
        stack: new Error().stack
      })
      
      if (originalOnError) {
        originalOnError.call(this, error)
      }
    }

    // 覆盖 App.onUnhandledRejection
    App.prototype.onUnhandledRejection = function(res) {
      globalErrorHandler.logError({
        type: 'UNHANDLED_REJECTION',
        reason: res.reason,
        promise: res.promise,
        message: res.reason?.message || res.reason,
        stack: res.reason?.stack || new Error().stack
      })
      
      if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection.call(this, res)
      }
    }
  }

  /**
   * 捕获控制台错误（包装 console.error）
   */
  captureConsoleError() {
    // ✅ 保存原始 console.error 到实例变量
    this.originalConsoleError = console.error
    
    console.error = (...args) => {
      // ✅ 避免递归：只记录用户代码的错误，不记录全局错误处理器自身的日志
      const isInternalLog = args.length > 0 && args[0] === '[GLOBAL ERROR]'
      
      if (!isInternalLog) {
        globalErrorHandler.logError({
          type: 'CONSOLE_ERROR',
          args: args,
          message: args.join(' '),
          stack: new Error().stack
        })
      }
      
      this.originalConsoleError.apply(console, args)
    }
  }

  /**
   * 云函数调用包装器
   * @param {string} functionName - 云函数名称
   * @param {object} data - 云函数参数
   * @returns {Promise}
   */
  async wrapCloudFunction(functionName, data) {
    console.log('[API CALL]', functionName, data)
    
    try {
      const startTime = Date.now()
      const res = await wx.cloud.callFunction({
        name: functionName,
        data
      })
      
      const duration = Date.now() - startTime
      console.log('[API RESULT]', functionName, {
        duration: `${duration}ms`,
        success: res.result?.success,
        data: res.result
      })
      
      // 检查业务逻辑错误
      if (res.result && !res.result.success) {
        this.logError({
          type: 'CLOUD_FUNCTION_BUSINESS_ERROR',
          functionName,
          data,
          result: res.result,
          message: res.result.message || '云函数业务逻辑失败'
        })
      }
      
      return res.result
    } catch (error) {
      console.error('[API ERROR]', functionName, error)
      
      this.logError({
        type: 'CLOUD_FUNCTION_ERROR',
        functionName,
        data,
        error: error,
        message: error.errMsg || error.message,
        stack: error.stack
      })
      
      throw error
    }
  }

  /**
   * wx.request 包装器
   * @param {object} options - 请求参数
   * @returns {Promise}
   */
  async wrapRequest(options) {
    console.log('[HTTP REQUEST]', options.url, options)
    
    try {
      const startTime = Date.now()
      const res = await new Promise((resolve, reject) => {
        wx.request({
          ...options,
          success: resolve,
          fail: reject
        })
      })
      
      const duration = Date.now() - startTime
      console.log('[HTTP RESULT]', options.url, {
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        data: res.data
      })
      
      if (res.statusCode >= 400) {
        this.logError({
          type: 'HTTP_ERROR',
          url: options.url,
          method: options.method || 'GET',
          statusCode: res.statusCode,
          response: res.data,
          message: `HTTP ${res.statusCode} - ${options.url}`
        })
      }
      
      return res
    } catch (error) {
      console.error('[HTTP ERROR]', options.url, error)
      
      this.logError({
        type: 'HTTP_REQUEST_FAIL',
        url: options.url,
        method: options.method || 'GET',
        error: error,
        message: error.errMsg || error.message
      })
      
      throw error
    }
  }

  /**
   * 本地缓存读取包装器
   * @param {string} key - 缓存键名
   * @returns {any}
   */
  safeGetStorage(key) {
    try {
      const value = wx.getStorageSync(key)
      console.log('[STORAGE READ]', key, value)
      return value
    } catch (error) {
      console.error('[STORAGE READ ERROR]', key, error)
      
      this.logError({
        type: 'STORAGE_READ_ERROR',
        key,
        error: error,
        message: `读取缓存失败: ${key}`
      })
      
      return null
    }
  }

  /**
   * 本地缓存写入包装器
   * @param {string} key - 缓存键名
   * @param {any} value - 缓存值
   */
  safeSetStorage(key, value) {
    try {
      wx.setStorageSync(key, value)
      console.log('[STORAGE WRITE]', key, value)
    } catch (error) {
      console.error('[STORAGE WRITE ERROR]', key, error)
      
      this.logError({
        type: 'STORAGE_WRITE_ERROR',
        key,
        value,
        error: error,
        message: `写入缓存失败: ${key}`
      })
    }
  }

  /**
   * 字段未定义检查
   * @param {object} obj - 对象
   * @param {string} field - 字段名
   * @param {string} context - 上下文（文件名、函数名等）
   * @returns {boolean}
   */
  checkFieldDefined(obj, field, context = '') {
    if (!obj || obj[field] === undefined) {
      this.logError({
        type: 'FIELD_UNDEFINED',
        context,
        field,
        object: obj,
        message: `字段未定义: ${field} in ${context}`
      })
      return false
    }
    return true
  }

  /**
   * 记录错误日志
   * @param {object} errorInfo - 错误信息
   */
  logError(errorInfo) {
    try {
      const errorRecord = {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ...errorInfo,
        // 提取调用栈信息
        caller: this.extractCaller(errorInfo.stack)
      }

      // 保存到内存日志
      this.errorLog.unshift(errorRecord)
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog.pop()
      }

      // ✅ 使用原始 console.error 避免递归
      const logFn = this.originalConsoleError || console.log
      logFn.call(console, '[GLOBAL ERROR]', {
        type: errorRecord.type,
        file: errorRecord.caller?.file || 'unknown',
        line: errorRecord.caller?.line || 'unknown',
        message: errorRecord.message
      })

      // 可选：上报到云端
      this.reportToCloud(errorRecord)
    } catch (err) {
      // ✅ 防止错误处理器自身出错导致崩溃
      const fallbackLog = this.originalConsoleError || console.log
      fallbackLog.call(console, '[ERROR HANDLER FAILED]', err)
    }
  }

  /**
   * 提取调用栈中的文件名和行号
   * @param {string} stack - 错误栈
   * @returns {object|null}
   */
  extractCaller(stack) {
    if (!stack) return null

    // 匹配格式: at functionName (file:line:column)
    const match = stack.match(/at\s+.*?\s+\((.+?):(\d+):(\d+)\)/)
    if (match) {
      return {
        file: match[1].split('/').pop(), // 只保留文件名
        line: match[2],
        column: match[3]
      }
    }

    // 匹配格式: at file:line:column
    const match2 = stack.match(/at\s+(.+?):(\d+):(\d+)/)
    if (match2) {
      return {
        file: match2[1].split('/').pop(),
        line: match2[2],
        column: match2[3]
      }
    }

    return null
  }

  /**
   * 上报错误到云端（可选）
   * @param {object} errorRecord - 错误记录
   */
  async reportToCloud(errorRecord) {
    // 仅上报严重错误
    const criticalTypes = [
      'CLOUD_FUNCTION_ERROR',
      'UNHANDLED_REJECTION',
      'HTTP_ERROR',
      'STORAGE_WRITE_ERROR'
    ]

    if (!criticalTypes.includes(errorRecord.type)) {
      return
    }

    try {
      // 可选：调用云函数记录错误日志
      // await wx.cloud.callFunction({
      //   name: 'errorLogger',
      //   data: {
      //     action: 'log',
      //     error: errorRecord
      //   }
      // })
    } catch (err) {
      console.warn('[ERROR REPORT FAILED]', err)
    }
  }

  /**
   * 获取错误日志
   * @param {number} limit - 返回条数
   * @returns {Array}
   */
  getErrorLog(limit = 20) {
    return this.errorLog.slice(0, limit)
  }

  /**
   * 清空错误日志
   */
  clearErrorLog() {
    this.errorLog = []
    console.log('[GLOBAL ERROR HANDLER] 错误日志已清空')
  }

  /**
   * 生成错误报告
   * @returns {string}
   */
  generateReport() {
    const report = []
    report.push('=== 错误日志报告 ===')
    report.push(`总错误数: ${this.errorLog.length}`)
    report.push('')

    // 按类型统计
    const typeCount = {}
    this.errorLog.forEach(err => {
      typeCount[err.type] = (typeCount[err.type] || 0) + 1
    })

    report.push('错误类型统计:')
    Object.entries(typeCount).forEach(([type, count]) => {
      report.push(`  ${type}: ${count}`)
    })
    report.push('')

    // 最近20条错误
    report.push('最近错误:')
    this.errorLog.slice(0, 20).forEach((err, index) => {
      report.push(`${index + 1}. [${err.timestamp}] ${err.type}`)
      report.push(`   文件: ${err.caller?.file || 'unknown'}:${err.caller?.line || '?'}`)
      report.push(`   消息: ${err.message}`)
      report.push('')
    })

    return report.join('\n')
  }
}

// 创建全局实例
const globalErrorHandler = new GlobalErrorHandler()

module.exports = {
  globalErrorHandler,
  GlobalErrorHandler
}

