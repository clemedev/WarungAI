import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import i18n from '../../i18n/config.js';
import { ThemeProvider } from '../../theme/ThemeContext.jsx';
import { signUp } from '../../lib/supabaseAuth.js';
import LoginScreen from './LoginScreen.jsx';

vi.mock('../../lib/supabaseAuth.js', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.clearAllMocks();
});

test('keeps an unverified registration out of the workspace', async () => {
  const user = userEvent.setup();
  const onAuthed = vi.fn();

  signUp.mockResolvedValue({
    user: {
      id: 'new-user',
      email: 'owner@example.com',
      email_confirmed_at: null,
    },
    session: null,
  });

  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <LoginScreen onAuthed={onAuthed} onTryDemo={vi.fn()} />
      </ThemeProvider>
    </I18nextProvider>,
  );

  await user.click(
    screen.getByRole('button', { name: 'Sign up' }),
  );
  await user.type(
    screen.getByLabelText('Stall / seller name'),
    'Warung Ali',
  );
  await user.type(
    screen.getByLabelText('Email address'),
    'owner@example.com',
  );
  await user.type(
    screen.getByLabelText('Password'),
    'password123',
  );
  await user.click(
    screen.getByRole('button', { name: 'Sign up & start' }),
  );

  expect(
    (await screen.findByRole('status')).textContent,
  ).toContain(
    'Check your inbox',
  );
  expect(screen.getByRole('status').textContent).toContain(
    'owner@example.com',
  );
  expect(
    screen.getByRole('button', { name: 'Back to log in' }),
  ).toBeTruthy();
  expect(onAuthed).not.toHaveBeenCalled();
});
