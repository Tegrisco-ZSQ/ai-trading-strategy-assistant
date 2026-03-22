# AI Trading Strategy Assistant

A modern AI-powered trading strategy assistant that combines quantitative signals, market data, and LLM-based reasoning to generate actionable trading insights.

## Features

- Quantitative signals
  - 10-day momentum
  - 20-day annualized volatility
  - Position sizing
  - Next-day probability prediction

- News analysis
  - Google News RSS integration
  - AI-based sentiment classification
  - Headline impact scoring

- AI strategy generation
  - LLM-generated trading plans
  - Risk-aware recommendations
  - Entry / exit / stop-loss logic

- Modern UI
  - Next.js + React + TypeScript
  - Tailwind CSS
  - Dashboard-style layout

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- OpenAI API
- Zod (validation)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Tegrisco-ZSQ/ai-trading-strategy-assistant.git
cd ai-trading-strategy-assistant
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a file named `.env.local` in the root folder and add:

```env
OPENAI_API_KEY=your_openai_key_here
FINANCIAL_DATASETS_API_KEY=your_key_here
```

### 4. Run the app locally

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Deployment

This app is ready for deployment on Vercel.

Steps:
1. Push the project to GitHub
2. Import the repository into Vercel
3. Add environment variables in Vercel
4. Deploy

## Notes

- Do not commit `.env.local`
- Keep API keys secure
- This is a research and educational tool, not financial advice

## Future Improvements

- Real-time data streaming
- Portfolio optimization
- Backtesting engine
- Advanced ML models

## Author

Francis Zhang