# WarungAI Code Review Notes

## Receipt retry safety

When a scanned receipt contains multiple items, the app saves them one by one.

If some items save successfully but a later item fails, pressing Save again can save the earlier items a second time. This can duplicate revenue, profit, and stock deductions.

Suggested direction:

- Mark successfully saved receipt rows as complete, or remove them from the retry list.
- Let the user retry only the failed rows.
- Longer term, save a multi-item receipt as one atomic transaction.

## Sales and inventory synchronization

A sale is currently saved first, then inventory is adjusted separately.

This means a sale can be recorded even if the stock update fails. On deletion, the sale is deleted first and stock restoration is attempted afterward. Two devices selling the same item at the same time can also overwrite each other’s stock values.

Suggested direction:

- Move stock validation, sale creation, stock deduction, sale deletion, and stock restoration into atomic Supabase database functions.
- Ensure either the complete operation succeeds or nothing changes.

## Email confirmation flow

When Supabase email confirmation is enabled, registration can return a user profile without creating an authenticated session.

The current flow checks only whether a user exists, then opens the app. This can show a workspace before the user has confirmed their email and actually signed in.

Suggested direction:

- After sign-up, check for an authenticated session as well as a user.
- If there is no session, show the “check your email to verify” message and keep the user on the login screen.

## Multi-item order support

The database has `sales` and `sale_items`, but the front end currently reads only the first item inside each sale.

This works while every saved sale has one product. However, if one customer buys multiple products in one order, Records and Analytics would incorrectly treat the entire order as only the first item.

Suggested direction:

- Treat one sale as an order header.
- Display its products as multiple item lines.
- Calculate revenue, cost, profit, stock changes, edits, and deletion across all lines.
- This is the foundation for the future “edit or delete one five-item sale” workflow.

## Tomorrow Preparation refresh

The Tomorrow Preparation card loads when Analytics opens, but it does not refresh after a new sale, sale deletion, or Undo action while Analytics is already open.

Suggested direction:

- Pass the Analytics refresh key into Tomorrow Preparation.
- Reload the recommendation whenever sales or stock-related activity changes.

## README environment variable

The README currently tells developers to use:

```env
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

The application actually expects:

```env
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Suggested direction:

- Update the README so a new developer can run the app without receiving a missing environment-variable error.

## Legacy local-storage code

The project still contains an older local-storage data architecture:

- `src/lib/storage.js`
- `src/lib/auth.js`
- `src/lib/insights.js`
- `src/components/Dashboard/`

The current app uses Supabase services instead. Keeping both systems creates duplicate business logic and can cause confusion later.

Suggested direction:

- Confirm which old modules are still needed.
- Remove or clearly label unused legacy modules.
- Keep one trusted source for sales, inventory, expenses, and analytics calculations.

## Test coverage to add

The current automated test suite passes, but the highest-risk bookkeeping flows need more coverage.

Recommended tests:

- A receipt partially saves, then retrying does not duplicate prior items.
- Undo restores every saved item’s stock, revenue, cost, and profit.
- Undo expiry after 10 minutes.
- Undo failure keeps a retry option visible.
- Deleting a sale restores inventory.
- A multi-item order displays and calculates correctly.
- Registration with email confirmation does not open the authenticated workspace early.
- Analytics and Tomorrow Preparation refresh after sales are added, deleted, or undone.
