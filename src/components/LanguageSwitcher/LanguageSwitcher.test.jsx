import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, expect, test } from 'vitest';

import i18n from '../../i18n/config.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

beforeEach(async () => {
  await i18n.changeLanguage('ms');
});

test('cycles BM → BI → BC → BM with one button', async () => {
  const user = userEvent.setup();

  render(
    <I18nextProvider i18n={i18n}>
      <LanguageSwitcher />
    </I18nextProvider>,
  );

  const button = screen.getByRole('button');
  expect(button.textContent).toContain('BM');

  await user.click(button);
  await waitFor(() => expect(button.textContent).toContain('BI'));

  await user.click(button);
  await waitFor(() => expect(button.textContent).toContain('BC'));

  await user.click(button);
  await waitFor(() => expect(button.textContent).toContain('BM'));
});
