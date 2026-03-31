---
name: management
description: "Skill for the Management area of itongquiz1. 96 symbols across 14 files."
---

# Management

96 symbols | 14 files | Cohesion: 73%

## When to Use

- Working with code in `llm-mux/`
- Understanding how GetCallbackPort, NormalizeHeaders, NormalizeExcludedModels work
- Modifying management-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/api/handlers/management/config_lists.go` | putStringList, patchStringList, deleteFromStringList, PutAPIKeys, PatchAPIKeys (+19) |
| `llm-mux/internal/api/handlers/management/logs.go` | GetLogs, newLogAccumulator, consumeFile, addLine, result (+12) |
| `llm-mux/internal/api/handlers/management/oauth_api.go` | OAuthStart, normalizeProvider, pollOAuthCallback, startQwenDeviceFlow, pollQwenToken (+9) |
| `llm-mux/internal/api/handlers/management/config_basic.go` | PutRequestRetry, PutMaxRetryInterval, PutProxyURL, DeleteProxyURL, PutDebug (+4) |
| `llm-mux/internal/api/handlers/management/auth_files.go` | managementCallbackURL, saveTokenRecord, ListAuthFiles, listAuthFilesFromDisk, buildAuthFileEntry (+3) |
| `llm-mux/internal/config/config.go` | SanitizeGeminiKeys, SanitizeOpenAICompatibility, SanitizeCodexKeys, NormalizeHeaders, NormalizeExcludedModels (+1) |
| `llm-mux/internal/api/handlers/management/handler.go` | persist, updateIntField, updateStringField, updateBoolField |
| `llm-mux/internal/oauth/service.go` | WaitForCallback, Cancel, Registry |
| `llm-mux/internal/api/handlers/management/vertex_import.go` | ImportVertexCredential, valueAsString, sanitizeVertexFilePart |
| `llm-mux/internal/oauth/registry.go` | Complete, Fail |

## Entry Points

Start here when exploring this area:

- **`GetCallbackPort`** (Function) — `llm-mux/internal/oauth/callback_servers.go:273`
- **`NormalizeHeaders`** (Function) — `llm-mux/internal/config/config.go:482`
- **`NormalizeExcludedModels`** (Function) — `llm-mux/internal/config/config.go:503`
- **`NormalizeServiceAccountJSON`** (Function) — `llm-mux/internal/auth/vertex/keyutil.go:15`
- **`NormalizeServiceAccountMap`** (Function) — `llm-mux/internal/auth/vertex/keyutil.go:36`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `GetCallbackPort` | Function | `llm-mux/internal/oauth/callback_servers.go` | 273 |
| `NormalizeHeaders` | Function | `llm-mux/internal/config/config.go` | 482 |
| `NormalizeExcludedModels` | Function | `llm-mux/internal/config/config.go` | 503 |
| `NormalizeServiceAccountJSON` | Function | `llm-mux/internal/auth/vertex/keyutil.go` | 15 |
| `NormalizeServiceAccountMap` | Function | `llm-mux/internal/auth/vertex/keyutil.go` | 36 |
| `SanitizeGeminiKeys` | Method | `llm-mux/internal/config/config.go` | 443 |
| `PutAPIKeys` | Method | `llm-mux/internal/api/handlers/management/config_lists.go` | 109 |
| `PatchAPIKeys` | Method | `llm-mux/internal/api/handlers/management/config_lists.go` | 115 |
| `DeleteAPIKeys` | Method | `llm-mux/internal/api/handlers/management/config_lists.go` | 118 |
| `PutGeminiKeys` | Method | `llm-mux/internal/api/handlers/management/config_lists.go` | 126 |
| `PatchGeminiKey` | Method | `llm-mux/internal/api/handlers/management/config_lists.go` | 147 |
| `DeleteGeminiKey` | Method | `llm-mux/internal/api/handlers/management/config_lists.go` | 213 |
| `DeleteOAuthExcludedModels` | Method | `llm-mux/internal/api/handlers/management/config_lists.go` | 505 |
| `PutRequestRetry` | Method | `llm-mux/internal/api/handlers/management/config_basic.go` | 263 |
| `PutMaxRetryInterval` | Method | `llm-mux/internal/api/handlers/management/config_basic.go` | 271 |
| `PutProxyURL` | Method | `llm-mux/internal/api/handlers/management/config_basic.go` | 277 |
| `DeleteProxyURL` | Method | `llm-mux/internal/api/handlers/management/config_basic.go` | 280 |
| `WaitForCallback` | Method | `llm-mux/internal/oauth/service.go` | 153 |
| `Cancel` | Method | `llm-mux/internal/oauth/service.go` | 201 |
| `Registry` | Method | `llm-mux/internal/oauth/service.go` | 251 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `OAuthStart → Read` | cross_community | 6 |
| `ImportVertexCredential → FileTokenStore` | cross_community | 6 |
| `Main → NormalizeHeaders` | cross_community | 5 |
| `Main → NormalizeExcludedModels` | cross_community | 5 |
| `OAuthStart → GenerateCodeChallenge` | cross_community | 5 |
| `ImportVertexCredential → FilterBase64` | cross_community | 5 |
| `PutConfigYAML → NormalizeHeaders` | cross_community | 5 |
| `PutConfigYAML → NormalizeExcludedModels` | cross_community | 5 |
| `OAuthStart → QwenAuth` | cross_community | 4 |
| `OAuthStart → SetProxy` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Copilot | 4 calls |
| Auth | 3 calls |
| Qwen | 2 calls |
| Codex | 2 calls |
| Watcher | 2 calls |
| Vertex | 1 calls |
| Claude | 1 calls |
| Iflow | 1 calls |

## How to Explore

1. `gitnexus_context({name: "GetCallbackPort"})` — see callers and callees
2. `gitnexus_query({query: "management"})` — find related execution flows
3. Read key files listed above for implementation details
