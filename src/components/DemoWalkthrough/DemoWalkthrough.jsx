import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './DemoWalkthrough.module.css';

const steps = [
  { id: 'busy', view: 'overview', composer: 'quick' },
  { id: 'safe', view: 'overview', composer: 'receipt' },
  { id: 'closing', view: 'overview' },
  { id: 'analytics', view: 'insights' },
  { id: 'report', view: 'insights' },
];

export default function DemoWalkthrough({ onClose, onNavigate }) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function openStep(index) {
    const next = steps[index];
    setStepIndex(index);
    onNavigate(next);
  }

  function next() {
    if (isLast) {
      onClose();
      return;
    }
    openStep(stepIndex + 1);
  }

  return (
    <aside className={styles.panel} aria-label={t('walkthrough.title')}>
      <div className={styles.header}>
        <div>
          <p>{t('walkthrough.eyebrow')}</p>
          <h2>{t('walkthrough.title')}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={t('walkthrough.close')}>×</button>
      </div>
      <ol className={styles.steps}>
        {steps.map((item, index) => (
          <li key={item.id} className={index === stepIndex ? styles.active : ''}>
            <button type="button" onClick={() => openStep(index)}>
              <span>{index + 1}</span>
              <div><strong>{t(`walkthrough.${item.id}Title`)}</strong><small>{t(`walkthrough.${item.id}Hint`)}</small></div>
            </button>
          </li>
        ))}
      </ol>
      <p className={styles.script}>{t(`walkthrough.${step.id}Script`)}</p>
      <button type="button" className={styles.next} onClick={next}>
        {isLast ? t('walkthrough.done') : t('walkthrough.next')}
      </button>
    </aside>
  );
}
