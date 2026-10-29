# Chai-Shai Tycoon — Architecture Documentation

## 1. Overview & Clean Architecture Boundaries

Chai-Shai Tycoon enforces strict inward dependency direction:
**`presentation` → `application` → `domain`**, with **`infrastructure`** implementing ports declared in `domain`.

- **`src/domain/`**: Pure TypeScript (`strict: true`) with **zero** imports from React, React Native, Expo, Skia, SQLite, or Zustand. Enforced by automated integration test (`tests/integration/persistenceAndFlow.test.ts`).
  - `value-objects/`: `Money`, `GameTime`, `RecipeId`, `IngredientId`, `CustomerArchetypeId`, `StationId`, `StationState`, `OrderState`, `UpgradeId`.
  - `entities/`: `Order`, `BrewStation`, `Wallet`, `Inventory`, `UpgradeState`.
  - `services/`: `BrewingRules`, `EconomyRules`, `QueueRules`.
  - `events/`: Typed `GameEvent` union and listener contracts.
  - `ports/`: `ClockPort`, `RandomPort`, `FeedbackPort`, `SaveRepositoryPort`.
- **`src/application/`**:
  - `use-cases/`: `CreateOrderUseCase`, `StartBrewUseCase`, `ServeOrderUseCase`, `BuyUpgradeUseCase`, `RestockIngredientUseCase`.
  - `engine/`: `GameEngine` deterministic fixed-timestep (`50ms`) simulation with bounded catch-up (`max 5 steps`) and throttled UI snapshot publishing (`100ms` / dirty state trigger).
  - `dto/`: Immutable UI ViewModels (`GameUiSnapshot`, `OrderViewModel`, `StationViewModel`, `UpgradeViewModel`, `SessionSummaryDTO`).
- **`src/infrastructure/`**:
  - `persistence/`: `SqliteSaveRepository` with versioned SQL schema migrations (`schema_migrations`, `player_progress`, `inventory`, `upgrade_levels`, `settings`, `sessions`, `completed_orders`), transactional writes (`withTransactionAsync`), and Zod validation (`schemas.ts`).
  - `platform/`: `SystemClockAdapter`, `SeededRandomAdapter` (Mulberry32 deterministic PRNG), `ExpoFeedbackAdapter` (`expo-haptics` + synthesized audio).
  - `assets/`: Deterministic sprite/visual manifest (`RECIPE_VISUAL_MANIFEST`, `CUSTOMER_VISUAL_MANIFEST`).
- **`src/presentation/`**:
  - `game/`: `ChaiStallScene.tsx` (`@shopify/react-native-skia` 2D stall scene with animated steam, tea liquid progress, marigold garlands, and accessible `>= 48dp` overlay hitboxes).
  - `screens/`: `HomeScreen`, `GameplayScreen`, `UpgradeShopScreen`, `ResultsScreen`, `SettingsScreen`.
  - `components/`: `TutorialOverlay`.
  - `state/`: `useGameStore` (Zustand store consuming throttled snapshots from `GameEngine`).
  - `theme/`: Saffron, Cardamom Green, Cream, Terracotta, and Deep Tea Brown design tokens.
- **`src/content/`**: Declarative catalogs for `recipes`, `customers`, `upgrades`, and `levels`.

## 2. Verified Package Versions (Expo SDK 58)

| Package | Version | Role |
|---|---|---|
| `expo` | `~58.0.21` | Core SDK runtime |
| `react` / `react-native` | `19.3.0` / `0.88.1` | Mobile UI runtime |
| `expo-router` | `~58.0.28` | Screen navigation (`app/`) |
| `@shopify/react-native-skia` | `2.14.0` | 2D stall canvas, burners, steam & decor rendering |
| `react-native-reanimated` | `4.7.1` | Smooth animations & worklets (`0.13.0`) |
| `expo-sqlite` | `~58.0.14` | Offline SQLite persistence & transactions |
| `expo-audio` / `expo-haptics` | `~58.0.10` / `~58.0.7` | Audio & tactile feedback |
| `zustand` | `^5.0.16` | Throttled UI state selector store |
| `zod` | `^4.6.7` | Runtime schema validation & corruption recovery |
| `typescript` | `~6.0.3` | Strict static typechecking |
| `jest` / `jest-expo` | `~30.5.2` / `~58.0.13` | Automated unit, integration & UI test runner |
