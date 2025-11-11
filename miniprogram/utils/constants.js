// miniprogram/utils/constants.js

/**
 * 默认头像 - 使用 HTTPS 图片 URL（兼容所有小程序版本）
 * 避免 /assets/default-avatar.png 加载失败导致的 500 错误
 * 
 * 使用公共 CDN 的默认头像图片
 */
const DEFAULT_AVATAR_DATA = 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132';

module.exports = {
  DEFAULT_AVATAR_DATA
};

