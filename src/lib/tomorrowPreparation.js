function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

/**
 * Recommend tomorrow's preparation from sales on matching weekdays. Products
 * with no sales still contribute zero to the average, avoiding inflated
 * suggestions from a single busy day.
 */
export function createTomorrowPreparation({
  sales,
  products,
  matchingDates,
}) {
  const dateSet = new Set(matchingDates);
  const totals = new Map(
    products.map((product) => [
      product.id,
      { productId: product.id, name: product.name, quantity: 0 },
    ]),
  );

  for (const sale of sales) {
    if (!dateSet.has(sale.date)) continue;
    const item = totals.get(sale.productId);
    if (!item) continue;
    item.quantity += Number(sale.quantity) || 0;
  }

  const sampleSize = matchingDates.length;
  const items = [...totals.values()]
    .map((item) => {
      const average = sampleSize > 0
        ? round1(item.quantity / sampleSize)
        : 0;
      return {
        ...item,
        average,
        recommended: Math.ceil(average * 1.1),
      };
    })
    .filter((item) => item.average >= 1)
    .sort((first, second) => second.average - first.average)
    .slice(0, 3);

  return { sampleSize, items };
}
