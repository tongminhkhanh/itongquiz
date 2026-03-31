---
name: cmd
description: "Skill for the Cmd area of itongquiz1. 43 symbols across 25 files."
---

# Cmd

43 symbols | 25 files | Cohesion: 76%

## When to Use

- Working with code in `llm-mux/`
- Understanding how RegisterTokenStore, GetTokenStore, NewFileTokenStore work
- Modifying cmd-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/cmd/login.go` | DoLogin, performGeminiCLISetup, callGeminiCLI, fetchGCPProjects, promptForProjectSelection (+5) |
| `llm-mux/internal/store/postgresstore.go` | NewPostgresStore, ConfigPath, AuthDir, WorkDir |
| `llm-mux/internal/auth/gemini/gemini_auth.go` | NewGeminiAuth, GetAuthenticatedClient, createTokenStorage |
| `llm-mux/sdk/auth/store_registry.go` | RegisterTokenStore, GetTokenStore |
| `llm-mux/internal/cmd/vertex_import.go` | DoVertexImport, sanitizeFilePart |
| `llm-mux/cmd/server/main.go` | main, autoInitConfig |
| `llm-mux/sdk/auth/gemini.go` | Provider, Login |
| `llm-mux/sdk/auth/manager.go` | Login |
| `llm-mux/sdk/auth/filestore.go` | NewFileTokenStore |
| `llm-mux/sdk/access/registry.go` | RegisterProvider |

## Entry Points

Start here when exploring this area:

- **`RegisterTokenStore`** (Function) — `llm-mux/sdk/auth/store_registry.go:14`
- **`GetTokenStore`** (Function) — `llm-mux/sdk/auth/store_registry.go:21`
- **`NewFileTokenStore`** (Function) — `llm-mux/sdk/auth/filestore.go:25`
- **`RegisterProvider`** (Function) — `llm-mux/sdk/access/registry.go:33`
- **`NewWatcher`** (Function) — `llm-mux/internal/watcher/watcher.go:127`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `RegisterTokenStore` | Function | `llm-mux/sdk/auth/store_registry.go` | 14 |
| `GetTokenStore` | Function | `llm-mux/sdk/auth/store_registry.go` | 21 |
| `NewFileTokenStore` | Function | `llm-mux/sdk/auth/filestore.go` | 25 |
| `RegisterProvider` | Function | `llm-mux/sdk/access/registry.go` | 33 |
| `NewWatcher` | Function | `llm-mux/internal/watcher/watcher.go` | 127 |
| `NewPostgresStore` | Function | `llm-mux/internal/store/postgresstore.go` | 49 |
| `DoVertexImport` | Function | `llm-mux/internal/cmd/vertex_import.go` | 22 |
| `DoQwenLogin` | Function | `llm-mux/internal/cmd/qwen_login.go` | 18 |
| `DoCodexLogin` | Function | `llm-mux/internal/cmd/openai_login.go` | 31 |
| `DoKiroLogin` | Function | `llm-mux/internal/cmd/kiro_login.go` | 20 |
| `DoIFlowLogin` | Function | `llm-mux/internal/cmd/iflow_login.go` | 13 |
| `DoCopilotLogin` | Function | `llm-mux/internal/cmd/copilot_login.go` | 11 |
| `DoClineLogin` | Function | `llm-mux/internal/cmd/cline_login.go` | 26 |
| `DoAntigravityLogin` | Function | `llm-mux/internal/cmd/antigravity_login.go` | 12 |
| `DoClaudeLogin` | Function | `llm-mux/internal/cmd/anthropic_login.go` | 20 |
| `Register` | Function | `llm-mux/internal/access/config_access/provider.go` | 15 |
| `DoLogin` | Function | `llm-mux/internal/cmd/login.go` | 49 |
| `NewGeminiAuth` | Function | `llm-mux/internal/auth/gemini/gemini_auth.go` | 49 |
| `SanitizeIFlowFileName` | Function | `llm-mux/internal/auth/iflow/cookie_helpers.go` | 25 |
| `Login` | Method | `llm-mux/sdk/auth/manager.go` | 46 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DoLogin → GetPublicIP` | cross_community | 7 |
| `DoLogin → GetOutboundIP` | cross_community | 7 |
| `Main → CredentialsDir` | cross_community | 6 |
| `ImportVertexCredential → FileTokenStore` | cross_community | 6 |
| `DeleteAuthFile → FileTokenStore` | cross_community | 6 |
| `DoLogin → OpenURLPlatformSpecific` | cross_community | 6 |
| `DoLogin → IsAvailable` | cross_community | 6 |
| `Main → Credentials` | cross_community | 5 |
| `Build → FileTokenStore` | cross_community | 5 |
| `DoLogin → GeminiTokenStorage` | intra_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Auth | 14 calls |
| Store | 6 calls |
| Config | 3 calls |
| Util | 2 calls |
| Logging | 2 calls |
| Watcher | 2 calls |
| Management | 1 calls |
| Wsrelay | 1 calls |

## How to Explore

1. `gitnexus_context({name: "RegisterTokenStore"})` — see callers and callees
2. `gitnexus_query({query: "cmd"})` — find related execution flows
3. Read key files listed above for implementation details
