# Sigil

AI-native data analysis tool that automatically detects, parses, and visualises various data formats with natural language chat interface.

## Features

- **Auto-format detection**: Supports JSON (including GeoJSON), CSV, YAML, XML
- **AI-powered analysis**: Claude analyses your data structure and recommends optimal visualisations
- **Interactive chat**: Ask questions about your data using natural language
- **Data manipulation tools**: Filter, aggregate, sort, and analyse data through conversational interface
- **Smart visualisations**: Table, tree, and map views (chart and cards views coming soon)
- **Session storage**: Persists analysis sessions with vector embeddings for future RAG capabilities

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **UI**: shadcn/ui with Tailwind CSS v4
- **AI**: Anthropic Claude (Sonnet 4.5) with tool calling
- **Database**: Supabase (PostgreSQL with pgvector)
- **Embeddings**: OpenAI text-embedding-3-small
- **Parsers**: papaparse (CSV), js-yaml (YAML), fast-xml-parser (XML)

## Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required variables:

1. **ANTHROPIC_API_KEY**: Get from [Anthropic Console](https://console.anthropic.com/settings/keys)
2. **OPENAI_API_KEY**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
3. **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
4. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anon/public key

### Supabase Setup

1. Create a new Supabase project
2. Run the following SQL in the Supabase SQL Editor:

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create sessions table
create table sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  format text not null,
  data jsonb not null,
  analysis jsonb not null,
  embedding vector(1536) not null
);

-- Disable RLS for internal tool usage
alter table sessions disable row level security;

-- Create vector similarity index
create index on sessions using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create similarity search function (for future RAG implementation)
create or replace function match_sessions(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  format text,
  data jsonb,
  analysis jsonb,
  similarity float
)
language sql stable
as $$
  select
    sessions.id,
    sessions.format,
    sessions.data,
    sessions.analysis,
    1 - (sessions.embedding <=> query_embedding) as similarity
  from sessions
  where 1 - (sessions.embedding <=> query_embedding) > match_threshold
  order by sessions.embedding <=> query_embedding
  limit match_count;
$$;
```

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (see Environment Setup above)

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Development Commands

```bash
npm run dev        # Start development server with Turbopack
npm run build      # Production build
npm start          # Start production server
npm run lint       # Run ESLint
```

## Deployment

### Vercel (Recommended)

1. **Push to GitHub** (if not already done)

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your repository
   - Vercel will auto-detect Next.js configuration

3. **Configure Environment Variables**:
   - In Vercel project settings → Environment Variables
   - Add all variables from `.env.example`
   - Make sure to add them for all environments (Production, Preview, Development)

4. **Deploy**:
   - Vercel will automatically deploy on every push to main
   - Preview deployments created for pull requests

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

The application will be available on port 3000.

## Usage

1. **Paste data**: Copy and paste JSON, CSV, YAML, XML, or GeoJSON into the input area
2. **Analyse**: Click "Analyse" to detect format and generate AI analysis
3. **Explore**: View your data in the recommended visualisation
4. **Chat**: Ask questions about your data in natural language
   - "How many records are there?"
   - "What's the average of column A?"
   - "Show me only rows where B > 10"
   - "What unique values exist in field X?"
