# Project Structure & Architecture

## Design Principles
- **Separation of Concerns**: Game logic (business logic) is completely separated from graphics/rendering
- **Centralized Configuration**: All settings managed through `src/settings.ts` with type safety and validation
- **Functional Organization**: Files grouped by feature/domain rather than technical layer
- **Type Safety**: Comprehensive TypeScript interfaces and strict type checking

## Directory Structure

```
src/
├── settings.ts                    # Centralized settings system (singleton)
├── main.ts                        # Application entry point
├── config-example.ts              # Configuration examples
├── game-systems/                  # Pure business logic (no graphics)
│   ├── shared-types.ts            # Common type definitions
│   ├── economy/                   # Economic simulation
│   │   ├── village-economy.ts     # Village economic management
│   │   ├── resource-manager.ts    # Resource production/consumption
│   │   ├── supply-demand-balancer.ts # Supply/demand calculations
│   │   └── economy-error-handler.ts  # Economic error handling
│   ├── population/                # Population & building systems
│   │   ├── population-manager.ts  # Population growth/decline
│   │   └── building-manager.ts    # Building construction logic
│   ├── world/                     # World simulation
│   │   ├── map.ts                 # Map generation and tile management
│   │   ├── village.ts             # Village entities and behavior
│   │   └── trade.ts               # Trade route calculation
│   ├── time/                      # Time management
│   │   └── time-manager.ts        # Game time and tick system
│   └── integration/               # System coordination
│       ├── village-economy-manager.ts    # Village-economy integration
│       ├── final-integration-system.ts  # Master system coordinator
│       └── performance-optimizer.ts     # Performance management
├── graphics/                      # Phaser 3 rendering (presentation layer)
│   ├── interfaces/                # Graphics-specific interfaces
│   ├── scenes/                    # Phaser game scenes
│   │   ├── map-scene.ts           # Main game view
│   │   └── ui-scene.ts            # User interface overlay
│   └── ui/                        # UI components
│       ├── village-status-ui.ts   # Village information display
│       └── resource-config-ui.ts  # Resource configuration interface
└── test/                          # Comprehensive test suite
    ├── setup.ts                   # Test environment setup
    └── (various test files)       # Unit, integration, and system tests
```

## Architecture Patterns

### Settings System
- **Singleton pattern** for global settings management
- **Validation and sanitization** of all configuration values
- **Change listeners** for reactive updates
- **Preset system** for different difficulty levels

### System Integration
- **FinalIntegrationSystem** coordinates all game systems
- **Performance optimization** with batched updates and memory management
- **Error handling** with graceful degradation
- **Modular design** allowing systems to be independently tested

### File Naming Conventions
- **kebab-case** for file names (e.g., `village-economy.ts`)
- **PascalCase** for class names (e.g., `VillageEconomyManager`)
- **camelCase** for functions and variables
- **SCREAMING_SNAKE_CASE** for constants

### Import Organization
- **Absolute imports** using `@/` alias for src directory
- **Grouped imports**: external libraries, then internal modules
- **Automatic import sorting** via Biome configuration