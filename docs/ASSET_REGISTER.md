# Chai-Shai Tycoon — Asset Register

Every visual and audio asset in **Chai-Shai Tycoon** is original, created specifically for this project without copyrighted third-party commercial game assets. The architecture decouples asset representation from domain rules via `src/infrastructure/assets/index.ts`.

## 1. Visual & Sprite Assets

| Asset ID | Intended Dimensions | Source / License | Status | Usage |
|---|---|---|---|---|
| `spr_chai_cutting` | `96x96` px | Original procedural Skia + SVG vector art (MIT / Project-owned) | Active | Cutting Chai glass visual, liquid fill (`#C67D3B`), and recipe badge |
| `spr_chai_adrak` | `96x96` px | Original procedural Skia + SVG vector art (MIT / Project-owned) | Active | Adrak Ginger Chai visual, liquid fill (`#D98A2B`), and recipe badge |
| `spr_chai_elaichi` | `96x96` px | Original procedural Skia + SVG vector art (MIT / Project-owned) | Active | Elaichi Cardamom Chai visual, liquid fill (`#B87333`), and recipe badge |
| `spr_chai_masala` | `96x96` px | Original procedural Skia + SVG vector art (MIT / Project-owned) | Active | Royal Masala Chai visual, liquid fill (`#8B3A1E`), and recipe badge |
| `spr_cust_office_worker` | `120x150` px | Original procedural Skia + avatar silhouette (MIT / Project-owned) | Active | Office Worker queue card (`#2C5E8A`) and mood indicator |
| `spr_cust_student` | `120x150` px | Original procedural Skia + avatar silhouette (MIT / Project-owned) | Active | College Student queue card (`#4A7C59`) and mood indicator |
| `spr_cust_regular` | `120x150` px | Original procedural Skia + avatar silhouette (MIT / Project-owned) | Active | Mohalla Regular queue card (`#C85A32`) and mood indicator |
| `spr_tapri_kettle` | `128x110` px | Original Skia Canvas vector primitive (`ChaiStallScene.tsx`) | Active | Interactive burner & brass kettle with liquid progress & steam particles |
| `spr_decor_marigold` | `600x60` px | Original Skia SVG Path (`ChaiStallScene.tsx`) | Active | Festive marigold garland & lanterns unlocked via `better_tips` upgrade |
| `spr_staff_chhotu` | `96x120` px | Original Skia Canvas silhouette (`ChaiStallScene.tsx`) | Active | Friendly Chhotu helper behind counter unlocked via `additional_patience` |

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
