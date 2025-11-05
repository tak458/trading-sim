# Technology Stack & Build System

## Core Technologies
- **TypeScript** - Primary language with strict type checking enabled
- **Vite** - Build tool and development server
- **Phaser 3** - Game engine for graphics and rendering
- **Vitest** - Testing framework with jsdom environment
- **Biome** - Code formatting and linting (replaces ESLint/Prettier)

## Key Libraries
- **delaunator** - Delaunay triangulation for road generation between villages
- **simplex-noise** - Procedural noise generation for terrain
- **jsdom** - DOM simulation for testing

## Build Commands
```bash
# Development
npm run dev              # Start development server
npm run type-check       # TypeScript type checking without emit

# Code Quality
npm run check            # Run Biome linter and formatter checks
npm run check:fix        # Auto-fix Biome issues

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once and exit
npm run test:ui          # Run tests with UI interface

# Production
npm run build            # Build for production
npm run preview          # Preview production build
npm run deploy           # Deploy to GitHub Pages
```

## Code Style (Biome Configuration)
- **Indentation**: Spaces (not tabs)
- **Quotes**: Double quotes for JavaScript/TypeScript
- **Import organization**: Automatic import sorting enabled
- **Recommended rules**: All Biome recommended linting rules active

## Module Resolution
- **Base URL**: Project root (`.`)
- **Path alias**: `@/*` maps to `src/*`
- **ES Modules**: Full ESM setup with `"type": "module"` in package.json

## Testing Setup
- **Environment**: jsdom for DOM simulation
- **Globals**: Enabled for test functions
- **Setup file**: `src/test/setup.ts`
- **Watch mode**: Disabled by default (use `--run` flag)
- **Path alias**: `@` resolves to `./src` in tests