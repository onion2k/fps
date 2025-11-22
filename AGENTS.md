# FPS - A first person shooter in React

> This file tells coding agents (and humans!) how to generate, navigate, and extend this project.
> **Golden rules:** clean code, strict types, great tests, fast builds, and fun gameplay.

---

## 1) Scope & Priorities

- **Scope:** Everything under this folder (recursively). Nested `AGENTS.md` files override local rules.
- **Priorities (in order):**
  1. **Correctness & determinism** (physics, gameplay)  
  2. **Type safety** (no `any`, strict mode on)
  3. **Test coverage & maintainability**
  4. **Performance** (frames first; micro-opt last)
  5. **Clarity** (clean architecture, self-explanatory code)

Agents must follow this document when generating or modifying code and **run all programmatic checks** before proposing changes.

---

## 2) Tech Stack

- **Runtime:** Browser (ESM)
- **Language:** TypeScript (strict)
- **Bundler/Dev:** Vite
- **UI:** React
- **3D:** react-three-fiber (R3F) + drei helpers
- **Physics:** @react-three/rapier (Rapier)
- **Tests:** Vitest + Testing Library + MSW (unit/integration), Playwright (e2e)
- **Lint/Format:** ESLint (TypeScript), Prettier

---

# 3) Directory Structure

```
.
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ routes/
│  │  └─ providers/
│  ├─ game/
│  │  ├─ core/
│  │  ├─ scene/
│  │  ├─ physics/
│  │  ├─ entities/
│  │  ├─ controls/
│  │  ├─ state/
│  │  ├─ assets/
│  │  └─ utils/
│  ├─ ui/
│  ├─ styles/
│  ├─ lib/
│  ├─ test/
│  │  ├─ msw/
│  │  ├─ fixtures/
│  │  └─ utils/
│  ├─ index.css
│  └─ main.tsx
├─ e2e/
├─ vite.config.ts
├─ tsconfig.json
├─ .eslintrc.cjs
├─ .prettierrc
└─ README.md
```
- No “misc” folders — everything has a home

# 4) Coding Standards

- TypeScript: strict mode, no any, prefer unknown + refinement.
- React (R3F):
  - Function components + hooks only.
  - Pure scene components; avoid mutable side effects.
  - Minimize allocations in useFrame.
- Rapier:
  - Configure a single <Physics> root.
  - Handle collisions centrally.
- State:
  - Use Zustand slices + selectors; avoid oversubscription.
- Clean code:
  - Small components, single responsibility.
  - Prefer composition, not inheritance.
- Naming:
  - Components: PascalCase.tsx, modules: camelCase.ts
  - Constants: SCREAMING_SNAKE_CASE
- Docs:
  - Public functions/components need TSDoc.

# 5) Adding Features
- Design: Identify systems affected; update acceptance criteria.
- Scaffold: Create new entities or systems under src/game/.
- State: Extend Zustand store & selectors.
- Rendering: Update World.tsx to place new entities.
- Testing: Unit (Vitest), integration (Testing Library), e2e (Playwright).
- Performance: Check FPS stability.
- Docs: Update README/docs if user-facing.
- Checks: Run npm run check and (if relevant) npm run e2e.

# 6) Assets and Loading
- Import GLTF/GLB via Vite; compress with Draco/Meshopt.
- Use suspense + lightweight loading UI.
- Memoize materials/geometries; reuse resources.
- Use instancing for many objects.

# 7) Performance Playbook
- No per-frame allocations; reuse vectors/quats.
- Don’t set React state in useFrame.
- Batch meshes & physics.
- Use continuous collision detection sparingly.
- Gate debug helpers behind __DEV_TOOLS__.

# 8) Testing Guidance
- Unit: core logic, math, state.
- Integration: component mounts, store interactions.
- Physics: deterministic seeds, mocked time.
- e2e: run against vite preview via Playwright.

# 9) Environment & Secrets
- Use import.meta.env.*.
- Define defaults in .env.example.
- Never commit real secrets.
- Tests: .env.test (untracked).

# 10) What Agents Should Avoid
- Using any or disabling ESLint rules.
- Adding code outside architecture.
- Coupling UI and physics logic.
- Large PRs — prefer small, testable ones.

# 11) Definition of Done
- All programmatic checks pass
- Coverage ≥ 80%
- No FPS regressions
- Docs/README updated
- PR approved