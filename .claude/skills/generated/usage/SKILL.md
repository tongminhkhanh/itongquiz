---
name: usage
description: "Skill for the Usage area of itongquiz1. 41 symbols across 7 files."
---

# Usage

41 symbols | 7 files | Cohesion: 91%

## When to Use

- Working with code in `llm-mux/`
- Understanding how LoadRecordsFromDB, InitializePersistence, NewPersister work
- Modifying usage-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/usage/logger_plugin.go` | HandleUsage, Record, enforceRetentionPolicy, updateAPIStats, resolveAPIIdentifier (+7) |
| `llm-mux/sdk/cliproxy/usage/manager.go` | run, dispatch, safeInvoke, Start, Stop (+7) |
| `llm-mux/internal/usage/persistence.go` | Enqueue, NewPersister, initSchema, migrateSchema, writeLoop (+3) |
| `llm-mux/internal/usage/recovery.go` | LoadRecordsFromDB, loadGlobalAggregate, loadDailyAggregates, loadHourlyAggregates, loadAPIModelAggregates (+1) |
| `llm-mux/internal/api/middleware/response_writer.go` | Status |
| `llm-mux/sdk/cliproxy/service.go` | RegisterUsagePlugin |
| `llm-mux/internal/api/handlers/management/usage.go` | GetUsageStatistics |

## Entry Points

Start here when exploring this area:

- **`LoadRecordsFromDB`** (Function) — `llm-mux/internal/usage/recovery.go:16`
- **`InitializePersistence`** (Function) — `llm-mux/internal/usage/logger_plugin.go:103`
- **`NewPersister`** (Function) — `llm-mux/internal/usage/persistence.go:61`
- **`DefaultManager`** (Function) — `llm-mux/sdk/cliproxy/usage/manager.go:160`
- **`PublishRecord`** (Function) — `llm-mux/sdk/cliproxy/usage/manager.go:166`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `LoadRecordsFromDB` | Function | `llm-mux/internal/usage/recovery.go` | 16 |
| `InitializePersistence` | Function | `llm-mux/internal/usage/logger_plugin.go` | 103 |
| `NewPersister` | Function | `llm-mux/internal/usage/persistence.go` | 61 |
| `DefaultManager` | Function | `llm-mux/sdk/cliproxy/usage/manager.go` | 160 |
| `PublishRecord` | Function | `llm-mux/sdk/cliproxy/usage/manager.go` | 166 |
| `StartDefault` | Function | `llm-mux/sdk/cliproxy/usage/manager.go` | 169 |
| `StopDefault` | Function | `llm-mux/sdk/cliproxy/usage/manager.go` | 172 |
| `NewLoggerPlugin` | Function | `llm-mux/internal/usage/logger_plugin.go` | 36 |
| `RegisterPlugin` | Function | `llm-mux/sdk/cliproxy/usage/manager.go` | 163 |
| `Enqueue` | Method | `llm-mux/internal/usage/persistence.go` | 198 |
| `HandleUsage` | Method | `llm-mux/internal/usage/logger_plugin.go` | 43 |
| `Record` | Method | `llm-mux/internal/usage/logger_plugin.go` | 248 |
| `Status` | Method | `llm-mux/internal/api/middleware/response_writer.go` | 329 |
| `Start` | Method | `llm-mux/sdk/cliproxy/usage/manager.go` | 57 |
| `Stop` | Method | `llm-mux/sdk/cliproxy/usage/manager.go` | 72 |
| `Publish` | Method | `llm-mux/sdk/cliproxy/usage/manager.go` | 99 |
| `RegisterUsagePlugin` | Method | `llm-mux/sdk/cliproxy/service.go` | 93 |
| `Register` | Method | `llm-mux/sdk/cliproxy/usage/manager.go` | 88 |
| `Snapshot` | Method | `llm-mux/internal/usage/logger_plugin.go` | 353 |
| `GetUsageStatistics` | Method | `llm-mux/internal/api/handlers/management/usage.go` | 10 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ExecuteStream → Start` | cross_community | 7 |
| `ExecuteStream → QueueItem` | cross_community | 7 |
| `ExecuteStream → Start` | cross_community | 7 |
| `ExecuteStream → QueueItem` | cross_community | 7 |
| `Execute → Start` | cross_community | 7 |
| `Execute → QueueItem` | cross_community | 7 |
| `Execute → DefaultManager` | cross_community | 6 |
| `ExecuteStream → DefaultManager` | cross_community | 6 |
| `ExecuteStream → DefaultManager` | cross_community | 6 |
| `Execute → DefaultManager` | cross_community | 6 |

## How to Explore

1. `gitnexus_context({name: "LoadRecordsFromDB"})` — see callers and callees
2. `gitnexus_query({query: "usage"})` — find related execution flows
3. Read key files listed above for implementation details
