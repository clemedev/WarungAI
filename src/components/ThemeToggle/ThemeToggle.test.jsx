import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import i18n from '../../i18n/config.js';
import { ThemeProvider } from '../../theme/ThemeContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

test('applies and persists the selected theme', async () => {
  const user = userEvent.setup();

  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    </I18nextProvider>,
  );

  const button = screen.getByRole('button');
  const wasDark = button.getAttribute('aria-pressed') === 'true';

  await user.click(button);

  expect(button.getAttribute('aria-pressed')).toBe(String(!wasDark));
  expect(document.documentElement.dataset.theme).toBe(
    wasDark ? 'light' : 'dark',
  );
  expect(localStorage.getItem('warungai.theme')).toBe(
    wasDark ? 'light' : 'dark',
  );
});
