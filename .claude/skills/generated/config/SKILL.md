---
name: config
description: "Skill for the Config area of itongquiz1. 46 symbols across 8 files."
---

# Config

46 symbols | 8 files | Cohesion: 83%

## When to Use

- Working with code in `llm-mux/`
- Understanding how TestNewDefaultConfig_AuthDir, NewDefaultConfig, LoadConfig work
- Modifying config-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/config/config.go` | NewDefaultConfig, LoadConfig, LoadConfigOptional, syncInlineAccessProvider, NormalizeOAuthExcludedModels (+19) |
| `llm-mux/internal/config/credentials.go` | CredentialsFilePath, GenerateManagementKey, LoadCredentials, SaveCredentials, CreateCredentials (+3) |
| `llm-mux/internal/config/xdg_test.go` | TestNewDefaultConfig_AuthDir, TestCredentialsFilePath_XDGConfigHome, TestCredentialsDir_XDGConfigHome, TestCredentialsDir_PathSeparators, TestCredentialsDir_WindowsStyleXDG (+1) |
| `llm-mux/internal/api/handlers/management/config_lists.go` | GetOAuthExcludedModels, PutOAuthExcludedModels |
| `llm-mux/internal/api/handlers/management/config_basic.go` | PutConfigYAML, WriteConfig |
| `llm-mux/cmd/server/main.go` | doInitConfig, fileExists |
| `llm-mux/sdk/config/config.go` | ConfigAPIKeyProvider |
| `llm-mux/internal/config/vertex_compat.go` | SanitizeVertexCompatKeys |

## Entry Points

Start here when exploring this area:

- **`TestNewDefaultConfig_AuthDir`** (Function) — `llm-mux/internal/config/xdg_test.go:167`
- **`NewDefaultConfig`** (Function) — `llm-mux/internal/config/config.go:305`
- **`LoadConfig`** (Function) — `llm-mux/internal/config/config.go:327`
- **`LoadConfigOptional`** (Function) — `llm-mux/internal/config/config.go:334`
- **`NormalizeOAuthExcludedModels`** (Function) — `llm-mux/internal/config/config.go:528`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestNewDefaultConfig_AuthDir` | Function | `llm-mux/internal/config/xdg_test.go` | 167 |
| `NewDefaultConfig` | Function | `llm-mux/internal/config/config.go` | 305 |
| `LoadConfig` | Function | `llm-mux/internal/config/config.go` | 327 |
| `LoadConfigOptional` | Function | `llm-mux/internal/config/config.go` | 334 |
| `NormalizeOAuthExcludedModels` | Function | `llm-mux/internal/config/config.go` | 528 |
| `TestCredentialsFilePath_XDGConfigHome` | Function | `llm-mux/internal/config/xdg_test.go` | 63 |
| `CredentialsFilePath` | Function | `llm-mux/internal/config/credentials.go` | 45 |
| `GenerateManagementKey` | Function | `llm-mux/internal/config/credentials.go` | 53 |
| `LoadCredentials` | Function | `llm-mux/internal/config/credentials.go` | 62 |
| `SaveCredentials` | Function | `llm-mux/internal/config/credentials.go` | 109 |
| `CreateCredentials` | Function | `llm-mux/internal/config/credentials.go` | 139 |
| `GetManagementKey` | Function | `llm-mux/internal/config/credentials.go` | 151 |
| `HasManagementKey` | Function | `llm-mux/internal/config/credentials.go` | 159 |
| `SaveConfigPreserveComments` | Function | `llm-mux/internal/config/config.go` | 552 |
| `SaveConfigPreserveCommentsUpdateNestedScalar` | Function | `llm-mux/internal/config/config.go` | 626 |
| `NormalizeCommentIndentation` | Function | `llm-mux/internal/config/config.go` | 677 |
| `WriteConfig` | Function | `llm-mux/internal/api/handlers/management/config_basic.go` | 133 |
| `TestCredentialsDir_XDGConfigHome` | Function | `llm-mux/internal/config/xdg_test.go` | 10 |
| `TestCredentialsDir_PathSeparators` | Function | `llm-mux/internal/config/xdg_test.go` | 112 |
| `TestCredentialsDir_WindowsStyleXDG` | Function | `llm-mux/internal/config/xdg_test.go` | 135 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → CredentialsDir` | cross_community | 6 |
| `Main → Credentials` | cross_community | 5 |
| `Main → Config` | cross_community | 5 |
| `Main → AmpCode` | cross_community | 5 |
| `Main → ConfigAPIKeyProvider` | cross_community | 5 |
| `Main → NormalizeHeaders` | cross_community | 5 |
| `Main → NormalizeExcludedModels` | cross_community | 5 |
| `PutConfigYAML → Config` | intra_community | 5 |
| `PutConfigYAML → AmpCode` | intra_community | 5 |
| `PutConfigYAML → ConfigAPIKeyProvider` | intra_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Management | 7 calls |
| Codex | 1 calls |
| Server | 1 calls |

## How to Explore

1. `gitnexus_context({name: "TestNewDefaultConfig_AuthDir"})` — see callers and callees
2. `gitnexus_query({query: "config"})` — find related execution flows
3. Read key files listed above for implementation details
