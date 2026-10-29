# Chai-Shai Tycoon — Test & Verification Report

## 1. Automated Verification Summary

| Verification Gate | Command | Result | Details |
|---|---|---|---|
| **TypeScript Strict Check** | `npm run typecheck` (`tsc --noEmit`) | **PASS** (`0` errors) | Strict mode enabled across `src/`, `app/`, and `tests/` |
| **ESLint Check** | `npm run lint` (`eslint .`) | **PASS** (`0` errors, `0` warnings) | Clean code & hook dependencies verified |
| **Unit Tests** | `npm run test:unit` | **PASS** (`11/11` passed) | `tests/unit/domain.test.ts` |
| **Integration Tests** | `npm run test:integration` | **PASS** (`3/3` passed) | `tests/integration/persistenceAndFlow.test.ts` |
| **UI / E2E Component Flow** | `npm run test:e2e` | **PASS** (`1/1` passed) | `tests/e2e/uiFlow.test.tsx` |
| **Expo Doctor** | `npx expo-doctor` | **PASS** (`20/20` checks passed) | All SDK 58 peer dependencies and config validated |

## 2. Detailed Test Coverage Matrix (Section 10 Requirements)

### Unit Tests (`tests/unit/domain.test.ts`)
1. **Wallet rejects negatives & overspend**: Verifies `Money.of(-5)` throws, negative credits throw, and debits exceeding balance return `false` without mutating coins.
2. **Reward credited once**: Verifies `wallet.credit(12, 'serve_order_1')` credits once and rejects duplicate transaction IDs.
3. **Order expires exactly once**: Verifies `order.tickPatience()` returns `true` only on the exact transition tick to `Expired`, and subsequent ticks or `markServed()` calls return `false`.
4. **Inventory deducted once**: Verifies `StartBrewUseCase` deducts recipe ingredients atomically when transitioning `Idle -> Brewing`, and ignores duplicate taps while brewing.
5. **Wrong recipe never rewards**: Verifies serving `Cutting Chai` to an `Adrak Chai` order emits `ORDER_MISMATCH`, awards `0` coins, and preserves both the `Pending` order and `Ready` cup.
6. **Idempotent served events**: Verifies serving the same order twice only credits the wallet once.
7. **Bounded tip calculation**: Verifies tips scale with remaining patience and customer archetype multiplier while strictly respecting the `0–30%` cap of base reward.
8. **Upgrade max-level enforcement**: Verifies `BuyUpgradeUseCase` unlocks `second_burner` at level 1 and rejects further purchases at max level without deducting coins.
9. **Rush-hour spawn multipliers**: Verifies `QueueRules.isRushHour()` activates between `90,000ms` and `120,000ms` and halves spawn interval down to the `2,500ms` floor.
10. **Game clock pause**: Verifies pausing the session freezes order patience and station timers even when the wall clock advances by 60 seconds.
11. **Deterministic customer spawning**: Verifies identical PRNG seeds produce identical customer archetype and recipe sequences.

### Integration Tests (`tests/integration/persistenceAndFlow.test.ts`)
1. **Zero Framework Imports in Domain**: Scans all `.ts` files under `src/domain/` and asserts zero imports from `react`, `react-native`, `expo*`, `@shopify/react-native-skia`, or `zustand`.
2. **SQLite Migrations & Process Restart Persistence**: Verifies `SqliteSaveRepository` runs `SQL_MIGRATION_V1`, seeds initial 100 coins and inventory, persists `second_burner` purchase transactionally, and restores the exact state into a new `GameEngine` instance after simulated process restart.
3. **10 Mixed Orders Complete Loop**: Simulates 10 sequential customer orders across recipes and customer types, verifying ingredient deduction, brew completion, coin + tip payout, XP level-ups (unlocking `Adrak` and `Elaichi`), and duplicate payout prevention.

### UI / E2E Tests (`tests/e2e/uiFlow.test.tsx` & `tests/e2e/maestro-smoke.yaml`)
- Renders `HomeScreen` → starts session → renders `GameplayScreen` → skips tutorial → steps simulation to spawn customer → selects `Cutting Chai` → taps `Kettle #1` → completes 4s brew → taps customer to serve → verifies coin payout → opens `UpgradeShopScreen` → buys `faster_brewing` → opens `SettingsScreen` → verifies sound & low-motion toggles.
- Includes `tests/e2e/maestro-smoke.yaml` for physical Android device/emulator execution via Maestro.

## 3. Android Device / Build Environment Status

- **ADB Check (`adb devices`)**: No physical Android device or running Android emulator is currently attached (`List of devices attached: empty`).
- **Local Java Toolchain**: System Java is OpenJDK `11.0.16.1`, whereas modern Android Gradle Plugin (React Native `0.88` / Expo SDK `58`) requires **JDK 17** for local Gradle APK compilation.
- **Reproducible Build Instructions**:
  - **Cloud APK Build (EAS)**: Run `npx eas-cli build --platform android --profile preview` (configured in `eas.json` to output an installable `.apk`).
  - **Local Gradle Build**: Ensure JDK 17 is active (`JAVA_HOME` pointing to JDK 17) and an Android emulator/device is connected, then run `npx expo run:android`.
