// /utils/order-visual-status.js
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function ts(v){
  if(!v) return NaN;
  if(typeof v === 'number') return v;
  // iOS兼容：将 "yyyy-MM-dd HH:mm:ss" 转为 "yyyy/MM/dd HH:mm:ss"
  const iosCompatible = typeof v === 'string' ? v.replace(/-/g, '/') : v;
  const d = new Date(iosCompatible);
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

function computeProgressPercent(order, nowTs){
  const start = ts(order.startDate || order.createdAt || order.orderDate || order.createTime);
  const end   = ts(order.deadline || order.dueDate || order.cutoffDate);
  if(isNaN(start) || isNaN(end)) return 0;
  const denom = end - start;
  if(denom <= 0) return 100;
  const num = nowTs - start;
  return clamp(Math.round(num / denom * 100), 0, 100);
}

function computeVisualStatus(order){
  const now = Date.now();
  const end = ts(order.deadline || order.dueDate || order.cutoffDate);
  let statusKey = 'normal';
  let statusColor = '#4CAF50'; // 绿
  let progressPercent = computeProgressPercent(order, now);

  // 已完成订单：检查wasOverdue标记
  if(order.status === 'completed' && order.wasOverdue){
    statusKey = 'overdue';
    statusColor = '#E74C3C'; // 红
    progressPercent = 100;
  }
  // 进行中订单：按实时时间判断
  else if(!isNaN(end)){
    const diffDays = Math.ceil((end - now)/86400000);
    if(diffDays < 0){
      statusKey = 'overdue';
      statusColor = '#E74C3C'; // 红
      progressPercent = 100;   // 超时强制满格
    }else if(diffDays <= 2){
      statusKey = 'nearDeadline';
      statusColor = '#F39C12'; // 橙
    }
  }

  return { statusKey, statusColor, progressPercent };
}

module.exports = { computeVisualStatus };

