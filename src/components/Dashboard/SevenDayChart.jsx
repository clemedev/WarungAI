import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

/** 7-day sales trend bar chart. */
export default function SevenDayChart({ trend }) {
  const { t } = useTranslation();

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
        label: t('chart.legend'),
        data: trend.map((d) => d.total),
        backgroundColor: trend.map((_, i) =>
          i === trend.length - 1 ? '#1a7f4b' : '#a8c9b8',
        ),
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => ` RM${Number(ctx.parsed.y).toFixed(2)}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{t('chart.title')}</h3>
      <div className={styles.chartBox}>
        {ready && <Bar data={data} options={options} />}
      </div>
    </div>
  );
}
