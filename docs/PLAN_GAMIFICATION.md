# 📋 PLAN: Student Accounts & Gamification System

**Status:** 🟡 Pending
**Based on:** `docs/DESIGN_GAMIFICATION.md`

---

## 📅 PHASES

### 🔹 Phase 1: Backend Infrastructure (Google Apps Script)
*Goal: Enable data persistence for Users and Pets.*
- [ ] **Create Sheets:** Add `Users`, `UserPets`, `ShopItems` to the spreadsheet.
- [ ] **GAS API - Auth:** Implement `doPost` actions: `register`, `login`.
- [ ] **GAS API - Game State:** Implement `doPost` actions: `updatePetStats`, `buyItem`.
- [ ] **Seed Data:** Add initial shop items (Hat, Glasses) to `ShopItems` sheet.

### 🔹 Phase 2: Frontend Core & Authentication
*Goal: Allow students to log in and identify themselves.*
- [ ] **Store:** Create `useUserStore` (Zustand) to manage user session & pet state.
- [ ] **API Service:** Create `authService.ts` to call GAS API.
- [ ] **UI:** Create `LoginScreen` component.
- [ ] **Navigation:** Update `App.tsx` to show Login screen first, then Dashboard.

### 🔹 Phase 3: Gamification UI (The Fun Part)
*Goal: Visual feedback for the student.*
- [ ] **Assets:** Generate/Add Pet images (SVG/PNG) for different levels/moods.
- [ ] **Component:** Create `PetDisplay` (Animation, mood state).
- [ ] **Screen:** Create new `Dashboard` (replacing current Home).
    - Status Bar (Level, EXP, Coins).
    - Pet interaction area.
    - "Start Quiz" button.
- [ ] **Screen:** Create `ShopModal` (Buy items with coins).

### 🔹 Phase 4: Game Logic Integration
*Goal: Connect learning with rewards.*
- [ ] **Quiz Integration:** Update `StudentView` handle submit:
    - Calculate EXP/Coin reward.
    - Call API to update backend.
- [ ] **Result Screen:** Add "Rewards Animation" (Coins dropping, EXP bar filling).
- [ ] **Optimization:** Implement optimistic UI (update local state immediately, sync background).

---

## 🛠️ TECHNICAL NOTES

**1. Authentication Security:**
- Passwords will be hashed (simple SHA256) on client before sending? Or simple text for kids?
- *Decision:* Simple hashing on client to avoid cleartext transmission, but security is low-tier (acceptable for primary school app).

**2. Offline Handling:**
- Gamification features rely on Internet.
- If offline: Allow "Guest Mode" (Start quiz directly, no rewards saved).

**3. Asset Management:**
- Pet formatting: dynamic composition? (Base pet + Accessory layer).
- Store assets in `public/assets/pet/`.

---

## 🚀 EXECUTION ORDER
1. `/code phase-01` (Backend)
2. `/code phase-02` (Frontend Auth)
3. `/code phase-03` (UI)
4. `/code phase-04` (Logic)
