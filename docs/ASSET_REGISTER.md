# Chai-Shai Tycoon — Asset Register

Every visual and audio asset in **Chai-Shai Tycoon** is original, created specifically for this project without copyrighted third-party commercial game assets. The architecture decouples asset representation from domain rules via `src/infrastructure/assets/index.ts`.

## 1. Illustrated 2D & Stop-Motion PNG Sprites (40 Total in `assets/sprites/`)

| Asset File | Dimensions | Transparent Alpha | License / Provenance | Usage |
|---|---|---|---|---|
| `stall_backdrop.png` | `640x480` px | Full-bleed | Original project-owned 2D illustration | Warm Indian bazaar & roadside tapri background (`ChaiStallScene.tsx`, `HomeScreen.tsx`) |
| `street_backdrop.png` | `640x240` px | Full-bleed | Original project-owned 2D illustration | Upper dynamic street-art wall (peacock/floral murals, banyan & gulmohar trees, fairy lights, black-and-yellow curb road) (`StreetTrafficBanner.tsx`) |
| `veh_autorickshaw.png` | `220x180` px | Yes (true alpha) | Original project-owned stop-motion prop | Passing green-and-yellow Indian Auto-Rickshaw (`StreetTrafficBanner.tsx`) |
| `veh_city_bus.png` | `220x180` px | Yes (true alpha) | Original project-owned stop-motion prop | Passing red-and-cream Indian City Bus (`StreetTrafficBanner.tsx`) |
| `veh_scooter.png` | `220x180` px | Yes (true alpha) | Original project-owned stop-motion prop | Passing vintage Indian Scooter with commuter (`StreetTrafficBanner.tsx`) |
| `veh_cycle_rickshaw.png` | `220x180` px | Yes (true alpha) | Original project-owned stop-motion prop | Passing hand-painted Indian Cycle Rickshaw (`StreetTrafficBanner.tsx`) |
| `cust_office_1.png` / `cust_office_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Male Office Commuter (`Rohan`, `Vikram`, `Arjun`) poses (calm waiting vs. impatient watch-check) |
| `cust_office_f_1.png` / `cust_office_f_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Female Office Commuter (`Priya`, `Neha`, `Kavita`) poses (polite smile vs. impatient watch-check) |
| `cust_student_1.png` / `cust_student_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Male College Student (`Aarav`, `Kabir`, `Ishaan`) poses (wave vs. headphones bounce) |
| `cust_student_f_1.png` / `cust_student_f_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Female College Student (`Diya`, `Ananya`, `Meera`) poses (cheerful wave vs. notebook & phone grin) |
| `cust_regular_1.png` / `cust_regular_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Male Mohalla Regular (`Chacha Ji`, `Sharma Ji`, `Raju Bhai`, `Master Ji`) poses |
| `cust_regular_f_1.png` / `cust_regular_f_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Female Mohalla Regular (`Bua Ji`, `Dadi`) poses (warm saree smile vs. conversational gesture) |
| `chaiwala_1.png` / `chaiwala_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Ustad Chaiwala (Player Tea Master) high-arc masala chai pour (`HomeScreen`, `ResultsScreen`) |
| `chhotu_1.png` / `chhotu_2.png` | `220x220` px | Yes (true alpha) | Original project-owned stop-motion puppet | 2-frame Chhotu helper behind counter (`additional_patience` upgrade & `HomeScreen` hero) |
| `prop_brass_stove.png` | `180x180` px | Yes (true alpha) | Original project-owned 2D prop | High-Flame Brass Stove (`faster_brewing` upgrade & active burner base in `ChaiStallScene`) |
| `prop_copper_tins.png` | `180x180` px | Yes (true alpha) | Original project-owned 2D prop | Spiced Copper Tins trio (`larger_storage` upgrade & counter prop in `ChaiStallScene`) |
| `prop_bamboo_stool.png` | `180x180` px | Yes (true alpha) | Original project-owned 2D prop | Bazaar Bamboo Mudda Stool (`larger_queue` upgrade & counter front prop in `ChaiStallScene`) |
| `prop_marigold_lantern.png` | `180x180` px | Yes (true alpha) | Original project-owned 2D prop | Marigold Toran & Brass Lantern (`better_tips` upgrade & hanging decor in `ChaiStallScene`) |
| `chai_cutting.png` | `160x160` px | Yes (true alpha) | Original project-owned 2D sprite | Cutting Chai fluted glass icon |
| `chai_adrak.png` | `160x160` px | Yes (true alpha) | Original project-owned 2D sprite | Adrak Ginger Chai glass with fresh ginger garnish |
| `chai_elaichi.png` | `160x160` px | Yes (true alpha) | Original project-owned 2D sprite | Elaichi Cardamom Chai glass with green cardamom pods |
| `chai_masala.png` | `160x160` px | Yes (true alpha) | Original project-owned 2D sprite | Royal Masala Chai kulhad clay cup with cinnamon stick & star anise |
| `kettle_idle.png` | `240x240` px | Yes (true alpha) | Original project-owned stop-motion prop | Idle hammered brass tapeli kettle on burner |
| `kettle_brewing_1.png` / `kettle_brewing_2.png` | `240x240` px | Yes (true alpha) | Original project-owned stop-motion prop | 2-frame rattling lid & boiling flame animation during active brewing |
| `kettle_ready.png` | `240x240` px | Yes (true alpha) | Original project-owned stop-motion prop | Golden glowing ready kettle with rich masala chai foam |
| `ing_tea.png` | `128x128` px | Yes (true alpha) | Original project-owned 2D icon | Assam Tea Leaves pantry chip icon |
| `ing_milk.png` | `128x128` px | Yes (true alpha) | Original project-owned 2D icon | Fresh Milk Canister pantry chip icon |
| `ing_sugar.png` | `128x128` px | Yes (true alpha) | Original project-owned 2D icon | Sugar Bowl pantry chip icon |
| `ing_ginger.png` | `128x128` px | Yes (true alpha) | Original project-owned 2D icon | Fresh Ginger Root pantry chip icon |
| `ing_cardamom.png` | `128x128` px | Yes (true alpha) | Original project-owned 2D icon | Green Cardamom Pods pantry chip icon |
| `ing_spices.png` | `128x128` px | Yes (true alpha) | Original project-owned 2D icon | Royal Masala Spices pantry chip icon |

## 2. Standalone SVG Sprite Sources (`assets/sprites/`)

- `assets/sprites/cutting_chai.svg` (`96x96`, transparent background)
- `assets/sprites/brass_kettle.svg` (`128x128`, transparent background)

## 3. Audio & Haptic Cues

| Cue ID | Source / Implementation | Toggle Support | Usage |
|---|---|---|---|
| `tap` | Synthesized tone (`440Hz`) + Light Haptic (`expo-haptics`) | `soundEnabled` / `hapticsEnabled` | Recipe & station selection |
| `brew_start` | Synthesized simmer cue (`330Hz`) + Light Haptic | `soundEnabled` / `hapticsEnabled` | Starting a kettle brew |
| `brew_ready` | Synthesized bell chime (`660Hz`) + Medium Haptic | `soundEnabled` / `hapticsEnabled` | Kettle transitions `Brewing -> Ready` |
| `serve_success` | Synthesized coin chime (`880Hz`) + Success Notification Haptic | `soundEnabled` / `hapticsEnabled` | Serving matching customer order |
| `serve_wrong` | Synthesized buzzer (`190Hz`) + Error Notification Haptic | `soundEnabled` / `hapticsEnabled` | Wrong cup-to-customer match |
| `order_expired` | Synthesized alert (`160Hz`) + Warning Notification Haptic | `soundEnabled` / `hapticsEnabled` | Customer patience reaches zero |
| `rush_hour` | Synthesized fanfare (`587Hz`) + Heavy Impact Haptic | `soundEnabled` / `hapticsEnabled` | Rush hour wave starts at `90s` |
| `upgrade_buy` | Synthesized chime (`784Hz`) + Success Notification Haptic | `soundEnabled` / `hapticsEnabled` | Purchasing a shop upgrade |
| `restock` | Synthesized chime (`523Hz`) + Light Haptic | `soundEnabled` / `hapticsEnabled` | Restocking pantry ingredients |
