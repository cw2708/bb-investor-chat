# Blackbird Investor Intelligence Chat Interface

A Next.js-based chat interface that allows investors to query company metrics and data through natural language questions **powered by ChatGPT and Supabase**.

## Features

- **ChatGPT Integration**: Real AI responses powered by OpenAI's GPT models
- **Supabase Database**: Dynamic data storage with PostgreSQL backend
- **SQL Query Generation**: AI automatically generates SQL queries based on natural language
- **Natural Language Queries**: Ask questions about company metrics in plain English
- **Real-time Chat Interface**: Modern, responsive chat UI with message history
- **Interactive Charts**: Dynamic visualizations for company comparisons (bar, line, pie charts)
- **Company Data**: Live database with metrics for portfolio companies including:
  - TechFlow Solutions (ARR: $180M USD)
  - InnovateAI (ARR: $95M USD)
  - DataCore Systems (ARR: $65M USD)
  - GreenTech Innovations (ARR: $42M USD)
  - Nexus Health (ARR: $78M USD)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd investor-chat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

1. Create a `.env.local` file in the project root
2. Add your API keys and database credentials (Connor should have sent you the environment variables):

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Supabase Configuration (Connor will provide these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Open Your Browser

Navigate to [http://localhost:3001](http://localhost:3001) in your browser

## Example Queries

Try asking questions like:

- "What is TechFlow Solutions' current ARR?"
- "Compare InnovateAI and DataCore Systems' valuations with a chart"
- "How many employees does Nexus Health have?"
- "What industry is GreenTech Innovations in?"
- "Which company has the highest ARR?"
- "Show me a pie chart comparing ARR of all companies"
- "Tell me about TechFlow Solutions' metrics"

## How It Works

1. **User Query**: You type a question about company metrics
2. **SQL Generation**: ChatGPT analyzes the query and generates appropriate SQL
3. **Database Query**: The SQL is executed against the Supabase database
4. **AI Processing**: ChatGPT processes the raw data into natural language responses
5. **Chart Detection**: If comparison is requested, charts are automatically generated
6. **Real-time Display**: The response and/or chart appears instantly in the chat interface

## Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **AI**: OpenAI GPT-3.5-turbo (configurable to GPT-4)
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **API**: Next.js API routes for chat processing and SQL execution
- **Charts**: Apache ECharts for interactive visualizations
- **UI Components**: Modular React components for chat interface

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts      # ChatGPT API integration & SQL handling
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main page
│   ├── components/
│   │   ├── ChatInterface.tsx      # Main chat component
│   │   ├── ChatMessage.tsx        # Individual message component
│   │   ├── ChatInput.tsx          # Message input component
│   │   └── ComparisonChart.tsx    # Chart visualization component
│   └── lib/
│       ├── supabase.ts            # Supabase client and types
│       ├── sql-handler.ts         # SQL query execution
│       └── utils.ts               # Utility functions
├── .env.local                     # Environment variables (API keys)
├── package.json                   # Dependencies
└── README.md                      # This file
```
