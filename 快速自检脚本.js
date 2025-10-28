// ====================================
// 多端一致性·快速自检脚本
// ====================================
// 请在微信开发者工具 Console 执行

console.log("=== 多端一致性·快速自检 ===");

// 1) 客服数据是否存在
const svcList = wx.getStorageSync('customer_service_list') || [];
console.log("[客服列表] 数量:", svcList.length, svcList);

// 2) 默认头像资源是否存在
const DEFAULT_AVATAR = "/assets/default-avatar.png";
console.log("[默认头像路径]", DEFAULT_AVATAR);

// 3) 随机抽一笔订单，检查四端关键关系列
const buckets = [
  'orders',                // 用户主表
  'pending_orders',        // 待处理订单
];
const pool = [];
buckets.forEach(k => {
  const arr = wx.getStorageSync(k) || [];
  if (Array.isArray(arr)) pool.push(...arr);
});
console.log("[订单池] 总数:", pool.length);

if (pool.length) {
  const o = pool[0];
  console.log("[抽检订单]", {
    orderId: o.id,
    artistId: o.artistId,
    serviceId: o.serviceId,
    buyerId: o.buyerId,
    status: o.status,
    statusText: o.statusText,
    serviceName: o.serviceName,
    serviceAvatar: o.serviceAvatar
  });
} else {
  console.warn("⚠️ 没有可抽检订单，请先手动下单一笔用于联调。");
}

// 4) 状态映射一致性巡检
const GLOBAL_STATUS_MAP = {
  pending: "待支付",
  inProgress: "进行中",
  nearDeadline: "临近截稿",
  overdue: "已拖稿",
  waitingConfirm: "待确认",
  completed: "已完成",
  refunded: "已退款"
};
console.log("[预期全局状态映射]", GLOBAL_STATUS_MAP);

// 5) UI页是否使用相同状态字段
const pagesToCheck = [
  "pages/order-list/index",
  "pages/workspace/index",
  "pages/service-workspace/index",
  "pages/admin/index"
];
console.log("[需要人工核对的页面列表]", pagesToCheck, "→ 确认均从同一字段(status/statusText)渲染，不要硬编码中文。");
console.log("=== 自检结束 ===");

