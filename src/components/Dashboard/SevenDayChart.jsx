import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { shortLabel } from '../../lib/dates';
import styles from './SevenDayChart.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * Draws the RM value above each bar (matching the design mockup), in the
 * accent colour for today and muted for the earlier days. Passed inline to
 * <Bar> so it only applies to this chart, not globally.
 */
const valueLabelPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0].data;

    meta.data.forEach((bar, i) => {
      const value = values[i];
      if (value == null) return;

      ctx.save();
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle =
        i === values.length - 1 ? '#ff9a5a' : '#c9b9a9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(Math.round(value), bar.x, bar.y - 6);
      ctx.restore();
    });
  },
};

/** 7-day sales trend bar chart. */
export default function SevenDayChart({ trend }) {
  // Mount the chart one frame after first paint: if Chart.js measures the
  // container mid page-load it can capture a transient 0px width and the
  // chart stays invisible until the next real resize.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const data = {
    labels: trend.map((d) => shortLabel(d.date)),
    datasets: [
      {
        label: 'Jualan (RM)',
        data: trend.map((d) => d.total),
        backgroundColor: trend.map((_, i) =>
          i === trend.length - 1 ? '#e8672c' : '#8a7362',
        ),
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 34,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 26 } },
    plugins: {
      tooltip: { enabled: false },
    },
    scales: {
      y: { display: false, beginAtZero: true },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#c9b9a9', font: { size: 11 } },
      },
    },
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>Trend 7 hari</h3>
        <span className={styles.unit}>jualan (RM)</span>
      </div>
      <div className={styles.chartBox}>
        {ready && (
          <Bar
            data={data}
            options={options}
            plugins={[valueLabelPlugin]}
          />
        )}
      </div>
    </div>
  );
}
