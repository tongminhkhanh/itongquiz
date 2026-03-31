---
name: auth
description: "Skill for the Auth area of itongquiz1. 166 symbols across 44 files."
---

# Auth

166 symbols | 44 files | Cohesion: 73%

## When to Use

- Working with code in `llm-mux/`
- Understanding how GetIPAddress, PrintSSHTunnelInstructions, OpenURL work
- Modifying auth-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/sdk/cliproxy/auth/manager.go` | OnAuthRegistered, OnAuthUpdated, Register, Update, GetByID (+15) |
| `llm-mux/sdk/cliproxy/auth/types.go` | nextAuthIndex, Clone, EnsureIndex, AccountInfo, RegisterRefreshLeadProvider (+5) |
| `llm-mux/sdk/cliproxy/auth/state.go` | ensureModelState, updateAggregatedAvailability, hasModelError, clearAuthStateOnSuccess, applyAuthFailureState (+5) |
| `llm-mux/sdk/cliproxy/auth/refresh.go` | StartAutoRefresh, checkRefreshes, snapshotAuths, authPreferredInterval, durationFromMetadata (+4) |
| `llm-mux/sdk/cliproxy/auth/retry.go` | nextQuotaCooldown, retrySettings, waitForCooldown, SetQuotaCooldownDisabled, closestCooldownWait (+4) |
| `llm-mux/sdk/cliproxy/auth/quota_group.go` | HasQuotaGrouping, getOrCreateQuotaGroupIndex, isGroupBlocked, getQuotaGroupIndex, clearGroup (+4) |
| `llm-mux/sdk/auth/filestore.go` | Save, List, Delete, resolveDeletePath, resolveAuthPath (+3) |
| `llm-mux/sdk/cliproxy/auth/provider_stats.go` | Cleanup, SortByScore, getOrCreate, RecordSuccess, RecordFailure (+2) |
| `llm-mux/sdk/auth/kiro.go` | NewKiroAuthenticator, Login, promptForManualToken, discoverKiroTokens, extractRefreshTokenFromFile (+2) |
| `llm-mux/internal/api/handlers/management/auth_files.go` | extractLastRefreshTimestamp, parseLastRefreshValue, UploadAuthFile, authIDForPath, registerAuthFromFile (+1) |

## Entry Points

Start here when exploring this area:

- **`GetIPAddress`** (Function) — `llm-mux/internal/util/ssh_helper.go:95`
- **`PrintSSHTunnelInstructions`** (Function) — `llm-mux/internal/util/ssh_helper.go:115`
- **`OpenURL`** (Function) — `llm-mux/internal/browser/browser.go:22`
- **`IsAvailable`** (Function) — `llm-mux/internal/browser/browser.go:84`
- **`GetPlatformInfo`** (Function) — `llm-mux/internal/browser/browser.go:116`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `GetIPAddress` | Function | `llm-mux/internal/util/ssh_helper.go` | 95 |
| `PrintSSHTunnelInstructions` | Function | `llm-mux/internal/util/ssh_helper.go` | 115 |
| `OpenURL` | Function | `llm-mux/internal/browser/browser.go` | 22 |
| `IsAvailable` | Function | `llm-mux/internal/browser/browser.go` | 84 |
| `GetPlatformInfo` | Function | `llm-mux/internal/browser/browser.go` | 116 |
| `SetStatisticsEnabled` | Function | `llm-mux/internal/usage/logger_plugin.go` | 95 |
| `SetQuotaCooldownDisabled` | Function | `llm-mux/sdk/cliproxy/auth/retry.go` | 19 |
| `NewKiroAuthenticator` | Function | `llm-mux/sdk/auth/kiro.go` | 22 |
| `NewIFlowAuthenticator` | Function | `llm-mux/sdk/auth/iflow.go` | 21 |
| `NewCopilotAuthenticator` | Function | `llm-mux/sdk/auth/copilot.go` | 17 |
| `NewCodexAuthenticator` | Function | `llm-mux/sdk/auth/codex.go` | 24 |
| `NewClaudeAuthenticator` | Function | `llm-mux/sdk/auth/claude.go` | 24 |
| `RegisterRefreshLeadProvider` | Function | `llm-mux/sdk/cliproxy/auth/types.go` | 228 |
| `NewQwenAuthenticator` | Function | `llm-mux/sdk/auth/qwen.go` | 19 |
| `NewManager` | Function | `llm-mux/sdk/auth/manager.go` | 18 |
| `NewGeminiAuthenticator` | Function | `llm-mux/sdk/auth/gemini.go` | 16 |
| `NewClineAuthenticator` | Function | `llm-mux/sdk/auth/cline.go` | 27 |
| `NewAntigravityAuthenticator` | Function | `llm-mux/sdk/auth/antigravity.go` | 38 |
| `NewKiroTokenStorage` | Function | `llm-mux/internal/auth/kiro/token.go` | 15 |
| `HasQuotaGrouping` | Function | `llm-mux/sdk/cliproxy/auth/quota_group.go` | 37 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DoLogin → GetPublicIP` | cross_community | 7 |
| `DoLogin → GetOutboundIP` | cross_community | 7 |
| `DoLogin → OpenURLPlatformSpecific` | cross_community | 6 |
| `DoLogin → IsAvailable` | cross_community | 6 |
| `ExecuteStream → IsOAuthRevokedError` | cross_community | 5 |
| `ExecuteStream → IsUserError` | cross_community | 5 |
| `ExecuteStream → IsQuotaError` | cross_community | 5 |
| `ExecuteStream → CategorizeHTTPStatus` | cross_community | 5 |
| `Execute → IsOAuthRevokedError` | cross_community | 5 |
| `Execute → IsUserError` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Registry | 6 calls |
| Watcher | 4 calls |
| Executor | 3 calls |
| Cmd | 2 calls |
| Qwen | 2 calls |
| Oauth | 2 calls |
| Codex | 1 calls |
| Logging | 1 calls |

## How to Explore

1. `gitnexus_context({name: "GetIPAddress"})` — see callers and callees
2. `gitnexus_query({query: "auth"})` — find related execution flows
3. Read key files listed above for implementation details
