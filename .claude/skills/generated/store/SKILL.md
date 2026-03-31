---
name: store
description: "Skill for the Store area of itongquiz1. 61 symbols across 3 files."
---

# Store

61 symbols | 3 files | Cohesion: 85%

## When to Use

- Working with code in `llm-mux/`
- Understanding how EnsureSchema, Bootstrap, List work
- Modifying store-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/store/postgresstore.go` | EnsureSchema, Bootstrap, List, PersistConfig, syncConfigFromDatabase (+20) |
| `llm-mux/internal/store/gitstore.go` | ConfigPath, EnsureRepository, Save, Delete, PersistAuthFiles (+14) |
| `llm-mux/internal/store/objectstore.go` | readAuthFile, Bootstrap, PersistConfig, ensureBucket, syncConfigFromBucket (+12) |

## Entry Points

Start here when exploring this area:

- **`EnsureSchema`** (Method) — `llm-mux/internal/store/postgresstore.go:111`
- **`Bootstrap`** (Method) — `llm-mux/internal/store/postgresstore.go:147`
- **`List`** (Method) — `llm-mux/internal/store/postgresstore.go:264`
- **`PersistConfig`** (Method) — `llm-mux/internal/store/postgresstore.go:381`
- **`ConfigPath`** (Method) — `llm-mux/internal/store/gitstore.go:77`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `EnsureSchema` | Method | `llm-mux/internal/store/postgresstore.go` | 111 |
| `Bootstrap` | Method | `llm-mux/internal/store/postgresstore.go` | 147 |
| `List` | Method | `llm-mux/internal/store/postgresstore.go` | 264 |
| `PersistConfig` | Method | `llm-mux/internal/store/postgresstore.go` | 381 |
| `ConfigPath` | Method | `llm-mux/internal/store/gitstore.go` | 77 |
| `EnsureRepository` | Method | `llm-mux/internal/store/gitstore.go` | 87 |
| `Save` | Method | `llm-mux/internal/store/gitstore.go` | 211 |
| `Delete` | Method | `llm-mux/internal/store/gitstore.go` | 330 |
| `PersistAuthFiles` | Method | `llm-mux/internal/store/gitstore.go` | 364 |
| `PersistConfig` | Method | `llm-mux/internal/store/gitstore.go` | 656 |
| `Bootstrap` | Method | `llm-mux/internal/store/objectstore.go` | 141 |
| `PersistConfig` | Method | `llm-mux/internal/store/objectstore.go` | 310 |
| `Save` | Method | `llm-mux/internal/store/objectstore.go` | 158 |
| `Delete` | Method | `llm-mux/internal/store/objectstore.go` | 262 |
| `PersistAuthFiles` | Method | `llm-mux/internal/store/objectstore.go` | 285 |
| `Save` | Method | `llm-mux/internal/store/postgresstore.go` | 189 |
| `Delete` | Method | `llm-mux/internal/store/postgresstore.go` | 323 |
| `PersistAuthFiles` | Method | `llm-mux/internal/store/postgresstore.go` | 347 |
| `AuthDir` | Method | `llm-mux/internal/store/gitstore.go` | 72 |
| `List` | Method | `llm-mux/internal/store/gitstore.go` | 295 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Watcher | 2 calls |
| Usage | 1 calls |

## How to Explore

1. `gitnexus_context({name: "EnsureSchema"})` — see callers and callees
2. `gitnexus_query({query: "store"})` — find related execution flows
3. Read key files listed above for implementation details
