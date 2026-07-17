export function createBusinessHealth({ stats, lowStockItems = [] }) {
  let score = 100;
  const sales = Number(stats?.todayTotal) || 0;
  const profit = Number(stats?.todayProfit) || 0;
  if (sales <= 0) score -= 45;
  if (profit < 0) score -= 35;
  else if (profit === 0) score -= 20;
  if (sales > 0 && (Number(stats?.targetProgress) || 0) < 0.5) score -= 12;
  score = Math.max(0, score - Math.min(24, lowStockItems.length * 8));
  return { score, type: score >= 75 ? 'healthy' : score >= 45 ? 'attention' : 'critical' };
}
