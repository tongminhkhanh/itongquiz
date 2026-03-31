---
name: cliproxy
description: "Skill for the Cliproxy area of itongquiz1. 45 symbols across 17 files."
---

# Cliproxy

45 symbols | 17 files | Cohesion: 62%

## When to Use

- Working with code in `llm-mux/`
- Understanding how NewFileTokenClientProvider, NewAPIKeyClientProvider, ApplyAccessProviders work
- Modifying cliproxy-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/sdk/cliproxy/service.go` | ensureWebsocketGateway, rebindExecutors, Run, ensureAuthDir, ensureAuthUpdateQueue (+7) |
| `llm-mux/sdk/cliproxy/builder.go` | Build, NewBuilder, WithConfig, WithConfigPath, WithServerOptions (+2) |
| `llm-mux/internal/api/server.go` | Start, SetWebsocketAuthChangeHandler, WithKeepAliveEndpoint, WithMiddleware, WithRequestLoggerFactory |
| `llm-mux/sdk/cliproxy/types.go` | Start, SetConfig, SetAuthUpdateQueue, DispatchRuntimeAuthUpdate |
| `llm-mux/sdk/cliproxy/auth/manager.go` | SetRoundTripperProvider, RegisterExecutor, List |
| `llm-mux/sdk/cliproxy/providers.go` | NewFileTokenClientProvider, NewAPIKeyClientProvider |
| `llm-mux/sdk/cliproxy/executor_registration.go` | ensureExecutorsForAuth, rebindExecutors |
| `llm-mux/internal/wsrelay/manager.go` | Handler |
| `llm-mux/sdk/cliproxy/rtprovider.go` | newDefaultRoundTripperProvider |
| `llm-mux/sdk/access/manager.go` | SetProviders |

## Entry Points

Start here when exploring this area:

- **`NewFileTokenClientProvider`** (Function) — `llm-mux/sdk/cliproxy/providers.go:10`
- **`NewAPIKeyClientProvider`** (Function) — `llm-mux/sdk/cliproxy/providers.go:24`
- **`ApplyAccessProviders`** (Function) — `llm-mux/internal/access/reconcile.go:138`
- **`NewOpenAICompatExecutor`** (Function) — `llm-mux/internal/runtime/executor/openai_compat_executor.go:30`
- **`NewBuilder`** (Function) — `llm-mux/sdk/cliproxy/builder.go:68`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `NewFileTokenClientProvider` | Function | `llm-mux/sdk/cliproxy/providers.go` | 10 |
| `NewAPIKeyClientProvider` | Function | `llm-mux/sdk/cliproxy/providers.go` | 24 |
| `ApplyAccessProviders` | Function | `llm-mux/internal/access/reconcile.go` | 138 |
| `NewOpenAICompatExecutor` | Function | `llm-mux/internal/runtime/executor/openai_compat_executor.go` | 30 |
| `NewBuilder` | Function | `llm-mux/sdk/cliproxy/builder.go` | 68 |
| `StartService` | Function | `llm-mux/internal/cmd/run.go` | 25 |
| `WithKeepAliveEndpoint` | Function | `llm-mux/internal/api/server.go` | 87 |
| `WithMiddleware` | Function | `llm-mux/internal/api/server.go` | 59 |
| `WithRequestLoggerFactory` | Function | `llm-mux/internal/api/server.go` | 99 |
| `GlobalModelRegistry` | Function | `llm-mux/sdk/cliproxy/model_registry.go` | 18 |
| `Start` | Method | `llm-mux/sdk/cliproxy/types.go` | 94 |
| `SetConfig` | Method | `llm-mux/sdk/cliproxy/types.go` | 110 |
| `SetAuthUpdateQueue` | Method | `llm-mux/sdk/cliproxy/types.go` | 140 |
| `Run` | Method | `llm-mux/sdk/cliproxy/service.go` | 365 |
| `Handler` | Method | `llm-mux/internal/wsrelay/manager.go` | 90 |
| `Start` | Method | `llm-mux/internal/api/server.go` | 298 |
| `SetWebsocketAuthChangeHandler` | Method | `llm-mux/internal/api/server.go` | 514 |
| `DispatchRuntimeAuthUpdate` | Method | `llm-mux/sdk/cliproxy/types.go` | 120 |
| `Build` | Method | `llm-mux/sdk/cliproxy/builder.go` | 154 |
| `SetProviders` | Method | `llm-mux/sdk/access/manager.go` | 21 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Run → Close` | cross_community | 5 |
| `Run → HandleSessionClosed` | cross_community | 5 |
| `Run → AmpModule` | cross_community | 5 |
| `Run → Stop` | cross_community | 5 |
| `Main → Config` | cross_community | 5 |
| `Main → AmpCode` | cross_community | 5 |
| `Main → ConfigAPIKeyProvider` | cross_community | 5 |
| `Main → NormalizeHeaders` | cross_community | 5 |
| `Main → NormalizeExcludedModels` | cross_community | 5 |
| `Build → FileTokenStore` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Auth | 10 calls |
| Wsrelay | 3 calls |
| Api | 3 calls |
| Registry | 2 calls |
| Cmd | 2 calls |
| Usage | 1 calls |
| Oauth | 1 calls |
| Executor | 1 calls |

## How to Explore

1. `gitnexus_context({name: "NewFileTokenClientProvider"})` — see callers and callees
2. `gitnexus_query({query: "cliproxy"})` — find related execution flows
3. Read key files listed above for implementation details
