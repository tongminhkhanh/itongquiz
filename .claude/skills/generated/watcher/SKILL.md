---
name: watcher
description: "Skill for the Watcher area of itongquiz1. 63 symbols across 16 files."
---

# Watcher

63 symbols | 16 files | Cohesion: 77%

## When to Use

- Working with code in `llm-mux/`
- Understanding how BuildAPIKeyClients, CodexInstructionsForModel, TestAmpModule_Name work
- Modifying watcher-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/watcher/hash_utilities.go` | computeOpenAICompatModelsHash, computeVertexCompatModelsHash, computeClaudeModelsHash, addConfigHeadersToAttrs, computeExcludedModelsHash (+11) |
| `llm-mux/internal/watcher/watcher.go` | matchProvider, newStableIDGenerator, next, Start, Stop (+5) |
| `llm-mux/internal/watcher/auth_dispatch.go` | stopDispatch, refreshAuthState, SetAuthUpdateQueue, DispatchRuntimeAuthUpdate, dispatchAuthUpdates (+4) |
| `llm-mux/internal/watcher/config_reload.go` | stopConfigReloadTimer, persistAuthAsync, scheduleConfigReload, reloadConfigIfChanged, doReloadConfigIfChanged (+2) |
| `llm-mux/internal/watcher/client_registration.go` | reloadClients, loadFileClients, BuildAPIKeyClients, addOrUpdateClient, removeClient |
| `llm-mux/internal/api/handlers/management/auth_files.go` | DeleteAuthFile, deleteTokenRecord, tokenStoreWithBaseDir |
| `llm-mux/internal/watcher/auth_snapshot.go` | SnapshotCoreAuths, synthesizeGeminiVirtualAuths, splitGeminiProjectIDs |
| `llm-mux/internal/store/objectstore.go` | AuthDir, List |
| `llm-mux/sdk/cliproxy/providers.go` | Load |
| `llm-mux/internal/misc/codex_instructions.go` | CodexInstructionsForModel |

## Entry Points

Start here when exploring this area:

- **`BuildAPIKeyClients`** (Function) — `llm-mux/internal/watcher/client_registration.go:215`
- **`CodexInstructionsForModel`** (Function) — `llm-mux/internal/misc/codex_instructions.go:13`
- **`TestAmpModule_Name`** (Function) — `llm-mux/internal/api/modules/amp/amp_test.go:17`
- **`NewVirtualCredential`** (Function) — `llm-mux/internal/runtime/geminicli/state.go:100`
- **`SetLogLevel`** (Function) — `llm-mux/internal/util/util.go:18`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BuildAPIKeyClients` | Function | `llm-mux/internal/watcher/client_registration.go` | 215 |
| `CodexInstructionsForModel` | Function | `llm-mux/internal/misc/codex_instructions.go` | 13 |
| `TestAmpModule_Name` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 17 |
| `NewVirtualCredential` | Function | `llm-mux/internal/runtime/geminicli/state.go` | 100 |
| `SetLogLevel` | Function | `llm-mux/internal/util/util.go` | 18 |
| `Load` | Method | `llm-mux/sdk/cliproxy/providers.go` | 16 |
| `AuthDir` | Method | `llm-mux/internal/store/objectstore.go` | 133 |
| `List` | Method | `llm-mux/internal/store/objectstore.go` | 229 |
| `Name` | Method | `llm-mux/internal/api/modules/amp/amp.go` | 86 |
| `DeleteAuthFile` | Method | `llm-mux/internal/api/handlers/management/auth_files.go` | 360 |
| `SnapshotCoreAuths` | Method | `llm-mux/internal/watcher/auth_snapshot.go` | 15 |
| `Start` | Method | `llm-mux/internal/watcher/watcher.go` | 156 |
| `Stop` | Method | `llm-mux/internal/watcher/watcher.go` | 188 |
| `SetConfig` | Method | `llm-mux/internal/watcher/watcher.go` | 195 |
| `SetAuthUpdateQueue` | Method | `llm-mux/internal/watcher/auth_dispatch.go` | 12 |
| `DispatchRuntimeAuthUpdate` | Method | `llm-mux/internal/watcher/auth_dispatch.go` | 38 |
| `matchProvider` | Function | `llm-mux/internal/watcher/watcher.go` | 25 |
| `newStableIDGenerator` | Function | `llm-mux/internal/watcher/watcher.go` | 74 |
| `computeOpenAICompatModelsHash` | Function | `llm-mux/internal/watcher/hash_utilities.go` | 18 |
| `computeVertexCompatModelsHash` | Function | `llm-mux/internal/watcher/hash_utilities.go` | 30 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ImportVertexCredential → FileTokenStore` | cross_community | 6 |
| `DeleteAuthFile → FileTokenStore` | cross_community | 6 |
| `DeleteAuthFile → NextAuthIndex` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Util | 3 calls |
| Auth | 3 calls |
| Amp | 2 calls |
| Config | 1 calls |
| Cmd | 1 calls |

## How to Explore

1. `gitnexus_context({name: "BuildAPIKeyClients"})` — see callers and callees
2. `gitnexus_query({query: "watcher"})` — find related execution flows
3. Read key files listed above for implementation details
