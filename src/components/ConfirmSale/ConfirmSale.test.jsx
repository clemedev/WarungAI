import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import i18n from '../../i18n/config.js';
import { todayISO } from '../../lib/dates.js';
import ConfirmSale from './ConfirmSale.jsx';

const product = {
  id: 'nasi-lemak',
  name: 'Nasi Lemak',
  sellPrice: 4,
};

test('saves the reviewed sale details', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <I18nextProvider i18n={i18n}>
      <ConfirmSale
        draft={{
          productId: product.id,
          productName: product.name,
          quantity: 2,
          total: 8,
          needsReview: false,
        }}
        products={[product]}
        source="chat"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    </I18nextProvider>,
  );

  await user.click(
    screen.getByRole('button', { name: i18n.t('confirm.save') }),
  );

  expect(onSave).toHaveBeenCalledWith({
    date: todayISO(),
    productId: product.id,
    quantity: 2,
    total: 8,
    source: 'chat',
    paymentMethod: 'cash',
  });
});
