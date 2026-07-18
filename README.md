# WarungAI 🍛

WarungAI is a mobile-friendly business workspace for Malaysian warung and hawker operators. It makes daily sales, inventory, expenses, and business performance easier to record and understand.

The app is designed to be practical at the stall: capture a sale quickly, keep stock accurate, then turn that activity into simple next-step insights.

## What it does

- Record sales from typed text, voice input, receipt scanning, or a manual form.
- Keep inventory in sync with sales and restore stock when a sale is deleted.
- Prevent sales that would make an item’s stock go below zero.
- Track product cost, selling price, profit, expenses, payment method, and units sold.
- Surface low-stock items, slow movers, top products, profit leaks, and expense breakdowns.
- Show daily closing summaries, business health, weekly stories, and tomorrow-preparation suggestions.
- Export a print-friendly weekly report that matches light or dark mode.
- Switch between Bahasa Melayu, English, and Chinese, with saved language and theme preferences.
- Support keyboard navigation, clearer focus states, reduced motion, responsive layouts, and mobile touch targets.

## Demo Stall

Use **Try the Demo Stall** on the login screen for a judge-ready walkthrough. It loads five weeks of realistic local data for a Malaysian food stall, including food and drinks, expenses, stock levels, margins, and daily sales patterns.

Demo Stall data stays in the browser only. It does not read from or write to a real account or Supabase database. Use **Demo guide** in the app for a short suggested walkthrough, and **Exit demo** to leave it.

The included handwritten receipt image is available at:

`/demo-receipt-warung-kak-lina.png`

It can be used to demonstrate receipt scanning with items such as Nasi Lemak and Teh Tarik.

## Suggested judge flow

1. Start **Demo Stall** from the login screen.
2. On **Overview**, show today's sales, net profit, closing summary, business health, and low-stock warning.
3. Record a sale using text, voice, receipt scan, or the manual form.
4. Open **Inventory** to show that stock has reduced automatically; try selling more than available to show the stock safeguard.
5. Open **Analytics** to explain top products, slow movers, costs versus selling price, expenses, profit leaks, and tomorrow's preparation list.
6. Use **Print / Save PDF** to show the shareable weekly report.

For a fuller presentation plan, read [HACKATHON_DEMO_GUIDE.md](HACKATHON_DEMO_GUIDE.md) and [PROJECT_AND_JUDGE_DEMO.md](PROJECT_AND_JUDGE_DEMO.md).

## Technology

- React 18 and Vite
- Supabase for normal-account authentication and data storage
- Chart.js for charts
- Tesseract.js for receipt OCR
- Web Speech API for voice capture
- CSS modules with shared light/dark design tokens

## Run locally

```bash
npm install
```

Create `.env.local` for normal-account mode:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

Then start the app:

```bash
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Useful commands

```bash
npm test       # Run unit and feature tests
npm run build  # Create a production build
```

The project includes automated checks for sales parsing, i18n, weekly insights, tomorrow preparation, and core app behaviour.

## Project notes

WarungAI keeps human review in the loop: OCR and typed/voice parsing propose sale details, while the user confirms the final record. Business insights are calculated from recorded data and are intended as clear operational prompts, not hidden automation.

The recent UI and demo improvements are codebase-only changes; they do not require a Supabase schema update, Vercel change, or external deployment configuration.

## License

© clemedev, dashvink. All rights reserved.
