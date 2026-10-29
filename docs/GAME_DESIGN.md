# Chai-Shai Tycoon — Game Design Document

## 1. Core Loop
1. **Greet & Read Order**: Customers arrive at the roadside tapri queue (up to 4 by default, expandable to 7 with `larger_queue`). Each customer displays an order bubble (`Cutting`, `Adrak`, `Elaichi`, or `Masala` Chai) and a live patience bar.
2. **Select Recipe & Brew**: Player selects the matching recipe in the bottom tray and taps an `Idle` kettle station. Ingredients are deducted **atomically once** when brewing starts.
3. **Brew Progression**: The Skia kettle animates rising steam and fills with rich tea color over the recipe's duration (`4s`–`9s`, reduced by `faster_brewing`).
4. **Serve & Earn**: When a kettle reaches `Ready`, tapping the matching customer serves the cup, awarding base coins + patience-scaled tip (`0–30%` of base reward) + XP. Mismatched cups trigger clear non-destructive feedback (`Wrong Chai!`) without deleting the order or cup.
5. **Restock & Upgrade**: Players restock pantry tins (free for the first 3 tutorial orders; coin-based thereafter) and invest coins into 6 permanent upgrades across Equipment, Staff, and Decor.

## 2. Recipes Catalog
| ID | Name | Ingredients | Base Brew Time | Base Coins | XP | Unlock Level |
|---|---|---|---:|---:|---:|---:|
| `cutting` | Cutting Chai | Tea 1, Milk 1, Sugar 1 | 4.0s | 10 | 15 | 1 |
| `adrak` | Adrak Chai | Tea 1, Milk 1, Ginger 1 | 6.0s | 15 | 22 | 2 |
| `elaichi` | Elaichi Chai | Tea 1, Milk 1, Cardamom 1 | 7.0s | 18 | 28 | 3 |
| `masala` | Masala Chai | Tea 1, Milk 1, Spices 1 | 9.0s | 24 | 38 | 5 |

## 3. Customer Archetypes
- **Office Worker (`office_worker`)**: `22s` base patience, `1.25x` tip factor, `25%` normal weight / `60%` rush-hour weight.
- **College Student (`student`)**: `32s` base patience, `0.55x` tip factor, `35%` normal weight / `15%` rush-hour weight.
- **Mohalla Regular (`regular`)**: `28s` base patience, `1.00x` tip factor, `40%` normal weight / `25%` rush-hour weight.

## 4. Upgrades Catalog
1. **High-Flame Brass Stove (`faster_brewing`)**: Equipment, Max Lv. 4, `-12%` brew time/level.
2. **Twin Tapri Burner (`second_burner`)**: Equipment, Max Lv. 1, unlocks Kettle #2.
3. **Spiced Copper Tins (`larger_storage`)**: Equipment, Max Lv. 4, `+5` max capacity per ingredient/level.
4. **Friendly Chhotu Helper (`additional_patience`)**: Staff, Max Lv. 4, `+4s` customer patience/level.
5. **Bazaar Bamboo Stools (`larger_queue`)**: Decor, Max Lv. 3, `+1` max customer queue slot/level.
6. **Marigold & Lantern Decor (`better_tips`)**: Decor, Max Lv. 4, `+15%` tip multiplier/level (capped at `30%` max tip).

## 5. Rush Hour Wave
- Triggers at `90s` into each `180s` shift and lasts `30s` (`90s–120s`).
- Halves effective customer spawn interval (`6.5s` → `3.25s`, respecting the `2.5s` minimum floor) and shifts spawn weights toward impatient, high-tipping Office Workers.
