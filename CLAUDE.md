# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sigil is an AI-native data analysis tool built with Next.js 15, designed to automatically detect and parse various data formats (JSON, CSV, YAML, XML) and display them in a clean interface.

## Development Commands

```bash
npm run dev        # Start development server with Turbopack
npm run build      # Production build with Turbopack
npm start          # Start production server
npm run lint       # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **UI**: shadcn/ui with Tailwind CSS v4, dark theme by default
- **AI Integration**: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **Parsers**: papaparse (CSV), js-yaml (YAML), fast-xml-parser (XML)

## Architecture

### Data Flow

The application follows a unidirectional data flow:

1. **Input** (`components/DataInput.tsx`): Client component with textarea that captures user input
2. **Detection** (`lib/formatDetector.ts`): Attempts to parse input in order: JSON → XML → CSV → YAML
3. **Parsing** (`lib/parsers.ts`): Individual parser functions for each format
4. **Display** (`components/DataCanvas.tsx`): Renders parsed data as pretty-printed JSON

State management happens at the root page level (`app/page.tsx`) using React hooks, passing detection results from DataInput to DataCanvas via callbacks.

### Format Detection Logic

**Critical ordering**: Format detection tries parsers in a specific sequence because some parsers (especially YAML) are permissive and may incorrectly match other formats.

Detection order in `lib/formatDetector.ts`:
1. JSON (strict, fails fast)
2. XML (moderate strictness)
3. CSV (moderate strictness)
4. YAML (very permissive, catches most text)

**Parser validation rules** (`lib/parsers.ts`):
- All parsers return `null` on failure (never `undefined` or empty objects)
- Empty objects `{}` are treated as parse failures
- Empty arrays `[]` are treated as parse failures for CSV
- This prevents false positives where parsers succeed with meaningless results

### API Routes

- `/app/api/analyze/route.ts`: Placeholder for future Claude Agent SDK integration (not yet implemented)

## Configuration

- **Environment**: `.env.local` requires `ANTHROPIC_API_KEY` (currently unused, placeholder for future AI features)
- **Import alias**: `@/*` maps to project root
- **Theme**: Dark mode enforced via `className="dark"` on `<html>` element in `app/layout.tsx`

## File Naming Conventions

**CRITICAL**: All file and folder names MUST follow these conventions (enforced by ESLint):

### Component Files
- **React components**: `PascalCase.tsx` (e.g., `DataInput.tsx`, `DataCanvas.tsx`)
- **UI components** (shadcn/ui): `kebab-case.tsx` in `components/ui/` only (e.g., `button.tsx`, `card.tsx`)
- **Test files**: `ComponentName.spec.tsx` (PascalCase with `.spec` suffix)
- **Fixture files**: `ComponentName.fixtures.tsx` (PascalCase with `.fixtures` suffix)

### Non-Component Files
- **Utilities**: `camelCase.ts` (e.g., `utils.ts`, `formatDetector.ts`)
- **Type definitions**: `camelCase.ts` (e.g., `types.ts`)
- **Library files**: `camelCase.ts` in `lib/` directory

### Folders
- **Component folders**: `PascalCase` (except `ui/`)
- **Common directories**: `common/` (lowercase)
- **UI directory**: `ui/` (lowercase, for shadcn/ui components)

### Next.js Special Files (Exceptions)
These files MUST keep their required lowercase names:
- `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `template.tsx`

**Run `npm run lint` after creating new files to verify compliance.**

## Key Constraints

- CSV parser uses `header: true` and `dynamicTyping: true` - assumes first row is headers
- XML parser preserves attributes with `@_` prefix
- Client components are explicitly marked with `'use client'` directive (DataInput, root page)
