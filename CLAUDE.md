# CLAUDE.md - Webapp Development Knowledge Base

> Distilled from [claude-combine](https://github.com/BinyaminEden/claude-combine) - 39 skills, 13 agents, 18 commands for building production webapps.

## Project Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **State**: Zustand / React Context
- **Validation**: Zod schemas
- **Testing**: Vitest + Playwright

---

## 1. Frontend Patterns

### Component Composition (prefer over inheritance)

```typescript
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined'
}

export function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card-${variant}`}>{children}</div>
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>
}
```

### Compound Components (Context-based)

```typescript
const TabsContext = createContext<{ activeTab: string; setActiveTab: (t: string) => void } | undefined>(undefined)

export function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>
}
```

### Custom Hooks

```typescript
// Debounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// Toggle
export function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial)
  const toggle = useCallback(() => setValue(v => !v), [])
  return [value, toggle]
}

// Async data fetching
export function useQuery<T>(key: string, fetcher: () => Promise<T>, options?: { enabled?: boolean }) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true); setError(null)
    try { const result = await fetcher(); setData(result) }
    catch (err) { setError(err as Error) }
    finally { setLoading(false) }
  }, [fetcher])

  useEffect(() => { if (options?.enabled !== false) refetch() }, [key])
  return { data, error, loading, refetch }
}
```

### Performance Optimization

- `useMemo` for expensive computations
- `useCallback` for functions passed to children
- `React.memo` for pure components
- `lazy()` + `Suspense` for code splitting
- `@tanstack/react-virtual` for long lists (1000+ items)

### Form Handling

```typescript
const [formData, setFormData] = useState<FormData>({ name: '', email: '' })
const [errors, setErrors] = useState<FormErrors>({})

const validate = (): boolean => {
  const newErrors: FormErrors = {}
  if (!formData.name.trim()) newErrors.name = 'Name is required'
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### Error Boundaries

Always wrap App with ErrorBoundary. Use `getDerivedStateFromError` + `componentDidCatch`.

### Accessibility

- Keyboard navigation (ArrowDown/Up, Enter, Escape)
- ARIA attributes (role, aria-expanded, aria-modal)
- Focus management (save/restore on modal open/close)

---

## 2. Backend / API Patterns

### RESTful URL Structure

```
GET    /api/resources           # List
GET    /api/resources/:id       # Get
POST   /api/resources           # Create
PUT    /api/resources/:id       # Replace
PATCH  /api/resources/:id       # Update
DELETE /api/resources/:id       # Delete
```

### Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

### Service Layer (business logic separated from data access)

### API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: { total: number; page: number; limit: number }
}
```

### Error Handling

```typescript
class ApiError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message)
  }
}

// Status codes: 400 validation, 401 unauth, 403 forbidden, 404 not found, 409 conflict, 429 rate limit, 500 server error
```

### N+1 Prevention

```typescript
// BAD: N queries in loop
for (const item of items) { item.creator = await getUser(item.creatorId) }

// GOOD: Batch fetch + map
const creators = await getUsers(items.map(i => i.creatorId))
const creatorMap = new Map(creators.map(c => [c.id, c]))
items.forEach(item => { item.creator = creatorMap.get(item.creatorId) })
```

### Retry with Exponential Backoff

```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn() }
    catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
  throw lastError!
}
```

---

## 3. Security Checklist (OWASP Top 10)

### Before EVERY commit:

- [ ] No hardcoded secrets (API keys, passwords, tokens) - use `process.env` or Firebase config
- [ ] All user inputs validated (Zod schemas)
- [ ] SQL/NoSQL injection prevention (parameterized queries, Firestore SDK)
- [ ] XSS prevention (sanitize HTML with DOMPurify, use React's built-in escaping)
- [ ] CSRF protection (SameSite cookies)
- [ ] Authentication/authorization verified on every route
- [ ] Rate limiting on expensive operations
- [ ] Error messages don't leak sensitive data (no stack traces to users)
- [ ] No passwords/tokens in logs
- [ ] `.env.local` in `.gitignore`

### Input Validation with Zod

```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

type UserInput = z.infer<typeof CreateUserSchema>
```

### Auth Best Practices

- Store tokens in httpOnly cookies (NOT localStorage)
- Implement RBAC (Role-Based Access Control)
- Enable Firestore Security Rules / Row Level Security
- Verify wallet signatures if blockchain features used

### File Upload Validation

- Max size check (e.g., 5MB)
- MIME type whitelist
- Extension whitelist
- Never trust client-provided content type

---

## 4. TypeScript Rules

### Types

- Explicit types on exported functions and component props
- Let TypeScript infer local variables
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer string literal unions over `enum`
- NEVER use `any` - use `unknown` then narrow safely
- Infer types from Zod schemas: `z.infer<typeof schema>`

### React Props

```typescript
interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}
function UserCard({ user, onSelect }: UserCardProps) { ... }
```

### Immutability

```typescript
// WRONG: user.name = name
// CORRECT: return { ...user, name }
```

### Error Handling

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}
```

---

## 5. Testing Requirements

### Minimum Coverage: 80%

1. **Unit Tests** - functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - critical user flows (Playwright)

### TDD Workflow (Red-Green-Refactor)

1. Write test first (RED) - test should FAIL
2. Write minimal implementation (GREEN)
3. Refactor (IMPROVE)
4. Verify coverage (80%+)

### Good Tests

- One behavior per test
- Clear descriptive name
- Use real code (mocks only if unavoidable)
- Edge cases and errors covered

### Playwright E2E Config

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
})
```

### Page Object Model

```typescript
export class ItemsPage {
  readonly page: Page
  readonly searchInput: Locator
  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"]')
  }
  async goto() { await this.page.goto('/items') }
  async search(query: string) { await this.searchInput.fill(query) }
}
```

---

## 6. Systematic Debugging

### The Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST

### Four Phases:

1. **Root Cause Investigation** - Read errors carefully, reproduce consistently, check recent changes, trace data flow
2. **Pattern Analysis** - Find working examples, compare differences
3. **Hypothesis & Testing** - Form single hypothesis, test minimally, one variable at a time
4. **Implementation** - Create failing test, implement single fix, verify

### Red Flags (STOP and follow process):

- "Quick fix for now, investigate later"
- "Just try changing X"
- Proposing solutions before tracing data flow
- 3+ failed fix attempts = question the architecture

---

## 7. Code Quality

### File Organization

- MANY SMALL FILES > FEW LARGE FILES
- 200-400 lines typical, 800 max
- Organize by feature/domain, not by type

### Before marking work complete:

- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values
- [ ] Immutable patterns used
- [ ] No `console.log` in production code

---

## 8. Deployment & CI/CD

### Pipeline Stages

```
PR: lint -> typecheck -> unit tests -> integration tests -> preview deploy
Merge to main: lint -> typecheck -> tests -> build -> deploy staging -> smoke tests -> deploy production
```

### Docker Best Practices

- Multi-stage builds (deps -> build -> production)
- Run as non-root user
- Specific version tags (not :latest)
- HEALTHCHECK instruction
- `.dockerignore` for node_modules, .git, .env

### Environment Config

- All config via environment variables (12-factor)
- Validate env vars at startup with Zod
- Separate dev/staging/production configs

### Rollback Strategy

- Keep previous deployment artifacts available
- Database migrations must be backward-compatible
- Feature flags for risky changes
- Monitor error rates post-deploy

---

## 9. Database Patterns (PostgreSQL/Firestore)

### Index Cheat Sheet

| Query Pattern | Index Type |
|---------------|------------|
| `WHERE col = value` | B-tree (default) |
| `WHERE col > value` | B-tree |
| `WHERE a = x AND b > y` | Composite (equality first, range second) |
| JSONB containment | GIN |
| Full-text search | GIN |

### Migration Safety

- Every change is a migration (never alter DB manually)
- New columns: nullable or with default (never NOT NULL without default)
- Create indexes concurrently (CONCURRENTLY keyword)
- Schema and data migrations are separate
- Zero-downtime: expand-contract pattern

### Data Types

| Use Case | Correct | Avoid |
|----------|---------|-------|
| IDs | `bigint` or UUID | `int` |
| Strings | `text` | `varchar(255)` |
| Timestamps | `timestamptz` | `timestamp` |
| Money | `numeric(10,2)` | `float` |

---

## 10. Verification Before Completion

### The Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE

Before claiming ANY work is done:

1. **IDENTIFY** - What command proves this claim?
2. **RUN** - Execute the FULL command (fresh, complete)
3. **READ** - Full output, check exit code, count failures
4. **VERIFY** - Does output confirm the claim?
5. **ONLY THEN** - Make the claim

Never say "should work", "probably passes", "looks correct" - run the verification.

---

## 11. Agent Roles Available

| Agent | Use For |
|-------|---------|
| **architect** | System design, scalability, technical decisions |
| **security-reviewer** | Vulnerability detection, OWASP checks, secrets scan |
| **database-reviewer** | Schema design, query optimization, RLS |
| **code-reviewer** | Code quality, patterns, best practices |
| **build-error-resolver** | Build failures, dependency issues |
| **refactor-cleaner** | Code cleanup, deduplication |
| **e2e-runner** | Playwright test specialist |
| **doc-updater** | Documentation maintenance |

---

## 12. Key Skills Quick Reference

| Skill | When to Use |
|-------|-------------|
| **frontend-patterns** | React components, state, hooks, performance |
| **backend-patterns** | API design, repositories, middleware, caching |
| **api-design** | REST conventions, pagination, error formats |
| **security-review** | Auth, input validation, secrets, OWASP |
| **test-driven-development** | Writing any new feature or bug fix |
| **systematic-debugging** | Any bug, test failure, unexpected behavior |
| **database-migrations** | Schema changes, data migrations |
| **deployment-patterns** | CI/CD, Docker, health checks |
| **docker-patterns** | Containerization, compose, networking |
| **e2e-testing** | Playwright tests, POM, CI integration |
| **verification-before-completion** | Before claiming work is done |
| **postgres-patterns** | Query optimization, indexing, RLS |

---

*Source: [claude-combine](https://github.com/BinyaminEden/claude-combine) by BinyaminEden - MIT License. Combines superpowers (Jesse Vincent) + everything-claude-code (Affaan Mustafa).*
