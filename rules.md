# rules.md — Project Rules & Standards

## 0) Project Summary
**Project name:** My Lifts (working title)  
**Goal:** A minimalist personal web app to track lifting marks (powerlifting + weightlifting) and visualize estimated 1RM progression per exercise.

**Core principle:** Fast logging, clear progress, no clutter.

---

## 0.1) Dependencies & Setup

### Installation commands
```bash
# Install additional dependencies
pnpm add @supabase/supabase-js valibot pinia @pinia/nuxt

# Environment variables (create .env.local)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Initial project structure
```
app/
├── composables/
│   ├── useExercises.ts
│   ├── useMarks.ts
│   └── useAuth.ts
├── types/
│   ├── exercise.ts
│   ├── mark.ts
│   └── database.ts
├── components/
│   ├── exercises/
│   └── marks/
└── pages/
    ├── index.vue
    └── exercise/[slug].vue
```

---

## 1) Tech Stack (fixed)
### Frontend
- **Nuxt 4** (TypeScript, Composition API)
- **Nuxt UI** for components (primary UI library)
- **Tailwind CSS** for layout/utility styling (used alongside Nuxt UI)
- **Valibot** for form validation schemas (source of truth for validation)
- **Pinia** for global state management

### Backend
- **Supabase**
  - Auth (Google OAuth only - no email/password)
  - Database (Postgres)
  - RLS enabled (mandatory)
  - Supabase JS client in Nuxt

### Dependencies justification
- Nuxt 4: Latest with best performance and DX
- Nuxt UI: Consistent component system, built-in accessibility
- Supabase: Complete backend solution with good Nuxt integration
- Valibot: Type-safe validation, better TypeScript integration than alternatives

---

## 2) Product Scope (MVP)
### Included
- Exercise list (Home): show exercises with **Last 1RM** and **Best 1RM**
- Exercise detail: chart (progress over time) + marks table
- Add/Edit mark via **bottom drawer** (Nuxt UI `UDrawer` pattern)
- Local-friendly UX (fast, minimal steps)
- Basic empty/loading/error states

### Explicitly excluded (no "nice extras" in MVP)
- Social features, sharing, rankings
- Full WOD tracking
- Training plans / calendars / goals
- Gamification
- Nutrition/bodyweight tracking
- Multi-user collaboration
- Advanced analytics

If a feature is not part of the current slice/acceptance criteria, it must not be added.

---

## 3) UX & UI Standards
### Component rules
- Use **Nuxt UI components first** (UButton, UCard, UForm, UInput, UTable, UBadge, UDrawer, etc.)
- Tailwind is for layout, spacing, responsiveness, and small visual tweaks. Avoid reinventing Nuxt UI components.
- **Add/Edit actions must use `UDrawer` from the bottom**, not a modal page or a centered dialog.
- Mobile-first responsive design

### UX principles
- Mobile-first and touch-friendly
- Clear hierarchy, minimal visual noise
- Single responsibility per screen
- Empty states must be helpful (explain what to do next)
- Avoid multi-step flows: logging a mark should take seconds
- Progressive disclosure: show simple view first, details on demand

### Design patterns
- **Cards for data display**: Use UCard for exercises, marks, stats
- **Bottom drawers for actions**: Add/Edit operations via UDrawer
- **Tables for structured data**: UTable for marks list
- **Charts for trends**: Simple line charts for 1RM progression
- **Badges for status**: UBadge for quick visual indicators

---

## 4) Architecture & Code Standards
### Nuxt conventions
- Prefer **server-side fetching where it makes sense**, but keep the MVP simple.
- Use composables for data access with consistent patterns:
  - `useExercises()` - exercise CRUD and queries
  - `useMarks()` - mark CRUD and queries
  - `useAuth()` - authentication state and methods
- Keep UI components presentational when possible; business logic stays in composables.
- Auto-imports for composables and utils

### TypeScript standards
- Strict types everywhere (no `any`)
- Shared types live in `/types`
- Prefer explicit return types for composables and helpers
- Type Supabase responses correctly
- Use interfaces for data contracts

### Validation standards (Valibot)
- Every user input must be validated with **Valibot schema** before sending to Supabase.
- Nuxt UI validation can be used for instant UX feedback, but Valibot is the source of truth.
- Validation errors should be mapped to field-level messages in the form.
- Schema files live near their related composables

### State management
- **Use Pinia** for global state (User session, cached exercises).
- Use local component state (refs) for UI interactions (drawers, temporary form data).
- Avoid "prop drilling" for global data; use the store.
- Authentication state must be managed via a Pinia store (`useAuthStore`).
- Reactive data flow: Store → Components → UI

### File organization
- Group by feature, not by type (exercises/, marks/)
- Shared components at root level
- Utility functions in `/utils`
- Constants in `/constants`

---

## 5) Data & Backend Standards (Supabase)
### Database setup
- RLS is mandatory for user-owned data.
- Use `auth.uid()` checks for user-specific tables.
- Prefer indexes on common filters (e.g., `marks.exercise_id`, `marks.user_id`, `marks.date`).
- Enable foreign key constraints

### MVP schema (final)
```sql
-- exercises (public read)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- marks (private per user)
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  reps INTEGER NOT NULL CHECK (reps > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_marks_user_exercise ON marks(user_id, exercise_id);
CREATE INDEX idx_marks_date ON marks(date DESC);
CREATE INDEX idx_exercises_slug ON exercises(slug);
```

### RLS policies
```sql
-- Enable RLS
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

-- Users can only access their own marks
CREATE POLICY "Users can view own marks" ON marks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marks" ON marks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marks" ON marks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own marks" ON marks
  FOR DELETE USING (auth.uid() = user_id);

-- Exercises are publicly readable
CREATE POLICY "Exercises are public" ON exercises
  FOR SELECT USING (true);
```

### Supabase client configuration
- Create typed client for better TypeScript support
- Use Supabase CLI to generate types: `npx supabase gen types typescript --project-id "your-project-id" > types/database.types.ts`
- Use environment variables for keys
- Handle connection errors gracefully
- Implement proper error boundaries

---

## 6) Functional Standards
### 1RM estimation
- Use a single helper function for estimated 1RM:
```typescript
// Common formulas: Brzycki, Epley, Lombardi
function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  // Brzycki formula (most accurate for 1-10 reps)
  return weight * 36 / (37 - reps)
}
```
- Round to 0.5 kg increments for display
- Show actual vs estimated in UI
- Cache calculations in composable

### Sorting and display
- Marks table: newest first (date DESC)
- Exercise list: alphabetical, then by recent activity
- Date format: consistent (ISO 8601 for data, local for display)
- Weight display: always with 1 decimal place

### Drawer behavior
- Drawer opens for Add / Edit without leaving the page
- Pre-fill form with existing data for Edit
- On save: close drawer → refresh data → show success toast
- On cancel: close drawer → discard changes
- Delete actions: require confirmation, use destructive button style
- Form validation: real-time feedback, prevent invalid submissions

### Error handling
- Network errors: retry option, clear messaging
- Validation errors: field-specific, helpful messages
- Auth errors: redirect to login with context
- Empty states: helpful CTAs and explanations

---

## 7) Quality Gate (Definition of Done)
A slice is "done" only if:
- App runs without errors in dev and build
- TypeScript passes strict mode (`nuxt typecheck`)
- Linting passes (`npm run lint`)
- Validation (Valibot) is enforced on submit
- Loading + error + empty states exist where relevant
- Mobile responsive testing completed
- No unrelated refactors
- No scope creep beyond slice acceptance criteria
- Accessibility basics checked (keyboard navigation, screen readers)

### Phase-specific checkpoints
- **Phase 1**: Auth flow works end-to-end
- **Phase 2**: Exercises load, display correctly
- **Phase 3**: Marks CRUD works with validation
- **Phase 4**: Charts render, 1RM calculations accurate

---

## 8) Working Style for Agents
When implementing changes:
1. Identify the current phase and slice from section 9
2. Read existing code patterns before writing new code
3. Make the smallest change that satisfies acceptance criteria
4. Run typecheck and lint before considering complete
5. Test manually if functionality is user-facing
6. List changed files and explain why
7. Provide clear steps to test locally
8. Do not add new dependencies unless specified in this file
9. Follow existing component patterns and naming conventions
10. Update types if changing data structures

### Communication
- Use descriptive commit messages
- Reference this rules.md in PRs for context
- Ask for clarification if requirements are ambiguous
- Suggest improvements to this file when patterns emerge

---

## 9) Fases de Implementación (MVP)
Secuencia lógica con checkpoints verificables.

### Fase 1: Configuración Base y Autenticación
**Objetivo:** Setup del proyecto + flujo de auth básico

**Tareas:**
- [ ] Instalar dependencias (Supabase, Valibot, Pinia)
- [ ] Configurar variables de entorno
- [ ] Setup Pinia (create root store)
- [ ] Setup cliente Supabase tipado
- [ ] Implementar layouts con auth state
- [ ] Login page (Google OAuth)
- [ ] Middleware de protección de rutas
- [ ] Logout functionality

**Checkpoint:** Usuario puede hacer login con Google y ver dashboard protegido.

### Fase 2: Gestión de Ejercicios
**Objetivo:** Sistema básico de ejercicios

**Tareas:**
- [ ] Schema y migración de exercises
- [ ] Seed data de ejercicios comunes
- [ ] Composable `useExercises()`
- [ ] Exercise list component (UCards)
- [ ] Exercise detail page layout
- [ ] Search/filter básico (opcional)

**Checkpoint:** Usuario puede ver lista de ejercicios y navegar al detalle.

### Fase 3: Sistema de Marcas (Core)
**Objetivo:** CRUD de marcas con validación

**Tareas:**
- [ ] Schema y migración de marks
- [ ] RLS policies para marks
- [ ] Composable `useMarks()`
- [ ] Valibot schemas para mark validation
- [ ] UDrawer form para Add/Edit mark
- [ ] Marks table component
- [ ] 1RM calculation helper
- [ ] Delete confirmation dialog

**Checkpoint:** Usuario puede agregar, editar, ver y eliminar marcas para cada ejercicio.

### Fase 4: Visualización y Estadísticas
**Objetivo:** Charts y progreso

**Tareas:**
- [ ] Exercise detail: marks table con UTable
- [ ] Chart component (line chart for 1RM over time)
- [ ] Last/Best 1RM display en exercise list
- [ ] Empty states mejorados
- [ ] Loading states para charts
- [ ] Responsive design final

**Checkpoint:** Usuario puede visualizar progreso de 1RM y ver estadísticas básicas.

### Fase 5: Pulido y Testing (Post-MVP)
**Objetivo:** Mejoras de DX y UX

**Tareas:**
- [ ] Error boundaries y toast notifications
- [ ] Mejorar loading states
- [ ] Optimización de queries (indexes)
- [ ] Accessibility audit básico
- [ ] Performance optimización
- [ ] Documentation updates

---

## 10) Checklist de Proyecto Inicial
Antes de empezar desarrollo:

### ✅ Configuración Técnica
- [ ] Node.js versión compatible instalada
- [ ] pnpm instalado globalmente
- [ ] Proyecto Nuxt 4 creado con Nuxt UI
- [ ] ESLint y TypeScript configurados
- [ ] Git repository inicializado

### ✅ Dependencias Instaladas
- [ ] `@supabase/supabase-js` agregado
- [ ] `valibot` agregado
- [ ] `pnpm install` ejecutado sin errores

### ✅ Variables de Entorno
- [ ] `.env.local` creado y en `.gitignore`
- [ ] Supabase project creado
- [ ] URL y keys agregados como variables
- [ ] `.env.example` como referencia

### ✅ Supabase Setup
- [ ] Project creado en Supabase dashboard
- [ ] Auth providers configurados (email)
- [ ] Database creada con schema inicial
- [ ] RLS policies aplicadas
- [ ] API keys generados

### ✅ Estructura de Archivos
- [ ] Carpetas `/composables`, `/types`, `/components` creadas
- [ ] Layouts básicos definidos
- [ ] Páginas iniciales creadas
- [ ] Components de UI importados correctamente

---

## 11) Non-goals
- "Perfect architecture" - funcional sobre elegante
- "Feature complete training tracker" - scope del MVP
- "Beautiful design system overhaul" - Nuxt UI es suficiente
- "Advanced analytics" - estadísticas básicas solo
- "Multi-device synchronization" - web app solo
- "Social features" - aplicación personal
- "Training plan generation" - tracking simple

El app debe permanecer simple, estable, y rápida. Cada feature debe pasar el test: "¿contribuye directly al tracking de marcas y visualización de progreso?"

---

## 12) Evolution Path (Post-MVP)
Features para considerar después de MVP:
- Bodyweight tracking
- Training volume metrics
- Export data (CSV/JSON)
- Custom exercises
- Mobile app (Capacitor)
- Advanced analytics
- Training templates

Estos requieren revisión de este rules.md antes de implementación.