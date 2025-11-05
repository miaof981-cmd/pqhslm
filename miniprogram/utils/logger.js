const STORAGE_KEY = '__app_verbose_log__'
let verboseCache

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    return value === 'true' || value === '1'
  }
  return false
}

function readVerboseFlag() {
  if (typeof verboseCache === 'boolean') {
    return verboseCache
  }

  try {
    const stored = wx.getStorageSync(STORAGE_KEY)
    if (stored === '' || stored === undefined || stored === null) {
      verboseCache = false
    } else {
      verboseCache = normalizeBoolean(stored)
    }
  } catch (error) {
    verboseCache = false
  }

  return verboseCache
}

function setVerboseLogging(enabled) {
  verboseCache = !!enabled
  try {
    wx.setStorageSync(STORAGE_KEY, verboseCache)
  } catch (error) {
    // ignore storage error
  }
}

function logWithLevel(level, scope, args) {
  const consoleMethod = console[level] || console.log

  if ((level === 'debug' || level === 'info') && !readVerboseFlag()) {
    return
  }

  if (scope) {
    consoleMethod.apply(console, [`[${scope}]`, ...args])
  } else {
    consoleMethod.apply(console, args)
  }
}

function createLogger(scope = '') {
  return {
    debug: (...args) => logWithLevel('debug', scope, args),
    info: (...args) => logWithLevel('info', scope, args),
    warn: (...args) => logWithLevel('warn', scope, args),
    error: (...args) => logWithLevel('error', scope, args)
  }
}

module.exports = {
  createLogger,
  setVerboseLogging,
  isVerboseLoggingEnabled: readVerboseFlag
}
