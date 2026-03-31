---
name: amp
description: "Skill for the Amp area of itongquiz1. 91 symbols across 18 files."
---

# Amp

91 symbols | 18 files | Cohesion: 62%

## When to Use

- Working with code in `llm-mux/`
- Understanding how NewObjectTokenStore, TestRegisterProviderAliases_AllProvidersRegistered, TestRegisterProviderAliases_DynamicModelsHandler work
- Modifying amp-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/api/modules/amp/amp.go` | New, WithAccessManager, WithAuthMiddleware, Register, getAuthMiddleware (+7) |
| `llm-mux/internal/api/modules/amp/proxy_test.go` | gzipBytes, mkResp, TestModifyResponse_GzipScenarios, TestModifyResponse_UpdatesContentLengthHeader, TestModifyResponse_SkipsStreamingResponses (+7) |
| `llm-mux/internal/api/modules/amp/amp_test.go` | TestAmpModule_New, TestAmpModule_Register_WithUpstream, TestAmpModule_Register_WithoutUpstream, TestAmpModule_Register_InvalidUpstream, TestAmpModule_AuthMiddleware_Fallback (+6) |
| `llm-mux/internal/api/modules/amp/model_mapping_test.go` | TestModelMapper_MapModel_NoProvider, TestModelMapper_MapModel_WithProvider, TestModelMapper_MapModel_CaseInsensitive, TestModelMapper_MapModel_NotFound, TestModelMapper_MapModel_EmptyInput (+5) |
| `llm-mux/internal/api/modules/amp/routes_test.go` | TestRegisterProviderAliases_AllProvidersRegistered, TestRegisterProviderAliases_DynamicModelsHandler, TestRegisterProviderAliases_V1Routes, TestRegisterProviderAliases_V1BetaRoutes, TestRegisterProviderAliases_NoAuthMiddleware (+4) |
| `llm-mux/internal/api/modules/amp/secret.go` | NewMultiSourceSecretWithPath, Get, readFromFile, updateCache, NewMultiSourceSecret (+3) |
| `llm-mux/internal/api/modules/amp/secret_test.go` | TestMultiSourceSecret_PrecedenceOrder, TestMultiSourceSecret_CacheBehavior, TestMultiSourceSecret_FileHandling, TestMultiSourceSecret_Concurrency, TestMultiSourceSecret_CacheEmptyResult (+1) |
| `llm-mux/internal/api/modules/amp/fallback_handlers.go` | NewFallbackHandlerWithMapper, NewFallbackHandler, WrapHandler, rewriteModelInBody, extractModelFromRequest |
| `llm-mux/internal/api/modules/amp/routes.go` | registerProviderAliases, localhostOnlyMiddleware, noCORSMiddleware, registerManagementRoutes |
| `llm-mux/internal/api/modules/amp/model_mapping.go` | NewModelMapper, MapModel, UpdateMappings, GetMappings |

## Entry Points

Start here when exploring this area:

- **`NewObjectTokenStore`** (Function) — `llm-mux/internal/store/objectstore.go:54`
- **`TestRegisterProviderAliases_AllProvidersRegistered`** (Function) — `llm-mux/internal/api/modules/amp/routes_test.go:96`
- **`TestRegisterProviderAliases_DynamicModelsHandler`** (Function) — `llm-mux/internal/api/modules/amp/routes_test.go:148`
- **`TestRegisterProviderAliases_V1Routes`** (Function) — `llm-mux/internal/api/modules/amp/routes_test.go:174`
- **`TestRegisterProviderAliases_V1BetaRoutes`** (Function) — `llm-mux/internal/api/modules/amp/routes_test.go:207`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `NewObjectTokenStore` | Function | `llm-mux/internal/store/objectstore.go` | 54 |
| `TestRegisterProviderAliases_AllProvidersRegistered` | Function | `llm-mux/internal/api/modules/amp/routes_test.go` | 96 |
| `TestRegisterProviderAliases_DynamicModelsHandler` | Function | `llm-mux/internal/api/modules/amp/routes_test.go` | 148 |
| `TestRegisterProviderAliases_V1Routes` | Function | `llm-mux/internal/api/modules/amp/routes_test.go` | 174 |
| `TestRegisterProviderAliases_V1BetaRoutes` | Function | `llm-mux/internal/api/modules/amp/routes_test.go` | 207 |
| `TestRegisterProviderAliases_NoAuthMiddleware` | Function | `llm-mux/internal/api/modules/amp/routes_test.go` | 237 |
| `NewFallbackHandlerWithMapper` | Function | `llm-mux/internal/api/modules/amp/fallback_handlers.go` | 88 |
| `New` | Function | `llm-mux/internal/api/modules/amp/amp.go` | 53 |
| `TestAmpModule_New` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 24 |
| `TestAmpModule_Register_WithUpstream` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 44 |
| `TestAmpModule_Register_WithoutUpstream` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 80 |
| `TestAmpModule_Register_InvalidUpstream` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 117 |
| `TestAmpModule_AuthMiddleware_Fallback` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 207 |
| `TestAmpModule_SecretSource_FromConfig` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 238 |
| `TestAmpModule_ProviderAliasesAlwaysRegistered` | Function | `llm-mux/internal/api/modules/amp/amp_test.go` | 278 |
| `WithAccessManager` | Function | `llm-mux/internal/api/modules/amp/amp.go` | 72 |
| `WithAuthMiddleware` | Function | `llm-mux/internal/api/modules/amp/amp.go` | 79 |
| `TestMultiSourceSecret_PrecedenceOrder` | Function | `llm-mux/internal/api/modules/amp/secret_test.go` | 12 |
| `TestMultiSourceSecret_CacheBehavior` | Function | `llm-mux/internal/api/modules/amp/secret_test.go` | 57 |
| `TestMultiSourceSecret_FileHandling` | Function | `llm-mux/internal/api/modules/amp/secret_test.go` | 105 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Run → AmpModule` | cross_community | 5 |
| `Login → AmpModule` | cross_community | 5 |
| `ExecuteStream → AmpModule` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Registry | 8 calls |
| Api | 6 calls |
| Middleware | 4 calls |
| Gemini | 4 calls |
| Cliproxy | 2 calls |
| Openai | 1 calls |
| Ollama | 1 calls |

## How to Explore

1. `gitnexus_context({name: "NewObjectTokenStore"})` — see callers and callees
2. `gitnexus_query({query: "amp"})` — find related execution flows
3. Read key files listed above for implementation details
