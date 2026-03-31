---
name: util
description: "Skill for the Util area of itongquiz1. 60 symbols across 12 files."
---

# Util

60 symbols | 12 files | Cohesion: 81%

## When to Use

- Working with code in `llm-mux/`
- Understanding how TestCountTokensFromIR_Basic, TestCountTokensFromIR_WithTools, TestCountTokensFromIR_MultiTurnToolCall work
- Modifying util-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/util/tokenizer_tiktoken.go` | acquireBuilder, releaseBuilder, CountTiktokenTokens, estimateTokens, countTokens (+8) |
| `llm-mux/internal/util/gemini_tokenizer_test.go` | TestCountTokensFromIR_Basic, TestCountTokensFromIR_WithTools, TestCountTokensFromIR_MultiTurnToolCall, TestCountTokensFromIR_WithImage, TestCountTokensFromIR_Nil (+7) |
| `llm-mux/internal/util/gemini_tokenizer.go` | CountTokensFromIR, isGeminiModel, countGeminiTokens, getTokenizer, normalizeModel (+4) |
| `llm-mux/internal/util/xdg_test.go` | TestResolveAuthDir_XDGConfigHome, TestResolveAuthDir_PathSeparators, TestResolveAuthDir_EmptyInput, TestResolveAuthDir_XDGWithTrailingSlash, TestResolveAuthDir_XDGWithSpaces (+3) |
| `llm-mux/internal/util/retry_test.go` | TestWithRetry_Success, TestWithRetry_AllFail, TestWithRetry_ContextCancel, TestWithRetry_RetriesWithDelay, TestWithRetry_MaxRetries |
| `llm-mux/internal/util/provider.go` | HideAPIKey, MaskAuthorizationHeader, MaskSensitiveHeaderValue, MaskSensitiveQuery, shouldMaskQueryParam |
| `llm-mux/internal/util/util.go` | ResolveAuthDir, CountAuthFiles |
| `llm-mux/internal/auth/claude/anthropic_auth.go` | RefreshTokens, RefreshTokensWithRetry |
| `llm-mux/internal/util/retry.go` | WithRetry |
| `llm-mux/internal/runtime/executor/claude_executor.go` | Refresh |

## Entry Points

Start here when exploring this area:

- **`TestCountTokensFromIR_Basic`** (Function) — `llm-mux/internal/util/gemini_tokenizer_test.go:12`
- **`TestCountTokensFromIR_WithTools`** (Function) — `llm-mux/internal/util/gemini_tokenizer_test.go:32`
- **`TestCountTokensFromIR_MultiTurnToolCall`** (Function) — `llm-mux/internal/util/gemini_tokenizer_test.go:64`
- **`TestCountTokensFromIR_WithImage`** (Function) — `llm-mux/internal/util/gemini_tokenizer_test.go:131`
- **`TestCountTokensFromIR_Nil`** (Function) — `llm-mux/internal/util/gemini_tokenizer_test.go:159`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestCountTokensFromIR_Basic` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 12 |
| `TestCountTokensFromIR_WithTools` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 32 |
| `TestCountTokensFromIR_MultiTurnToolCall` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 64 |
| `TestCountTokensFromIR_WithImage` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 131 |
| `TestCountTokensFromIR_Nil` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 159 |
| `TestCountTokensFromIR_EmptyMessages` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 166 |
| `TestCountTokensFromIR_SystemMessage` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 178 |
| `TestCountTokensFromIR_Reasoning` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 204 |
| `TestCountTokensFromIR_LargeToolResult` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 231 |
| `BenchmarkCountTokensFromIR_Simple` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 301 |
| `BenchmarkCountTokensFromIR_MultiTurn` | Function | `llm-mux/internal/util/gemini_tokenizer_test.go` | 318 |
| `CountTokensFromIR` | Function | `llm-mux/internal/util/gemini_tokenizer.go` | 44 |
| `TestResolveAuthDir_XDGConfigHome` | Function | `llm-mux/internal/util/xdg_test.go` | 10 |
| `TestResolveAuthDir_PathSeparators` | Function | `llm-mux/internal/util/xdg_test.go` | 94 |
| `TestResolveAuthDir_EmptyInput` | Function | `llm-mux/internal/util/xdg_test.go` | 138 |
| `TestResolveAuthDir_XDGWithTrailingSlash` | Function | `llm-mux/internal/util/xdg_test.go` | 148 |
| `TestResolveAuthDir_XDGWithSpaces` | Function | `llm-mux/internal/util/xdg_test.go` | 172 |
| `TestResolveAuthDir_TildeOnly` | Function | `llm-mux/internal/util/xdg_test.go` | 189 |
| `TestResolveAuthDir_XDGOnly` | Function | `llm-mux/internal/util/xdg_test.go` | 205 |
| `TestResolveAuthDir_RelativePath` | Function | `llm-mux/internal/util/xdg_test.go` | 222 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Execute → IsGeminiModel` | cross_community | 5 |
| `Execute → IsGeminiModel` | cross_community | 5 |
| `Execute → IsGeminiModel` | cross_community | 5 |
| `ExecuteStream → IsGeminiModel` | cross_community | 5 |
| `CountTokens → IsGeminiModel` | cross_community | 5 |
| `ExecuteStreamWithServiceAccount → CountToolTokensFromIR` | cross_community | 5 |
| `ExecuteWithServiceAccount → IsGeminiModel` | cross_community | 5 |
| `ExecuteStreamWithAPIKey → CountToolTokensFromIR` | cross_community | 5 |
| `ExecuteWithAPIKey → IsGeminiModel` | cross_community | 5 |
| `ExecuteStream → IsGeminiModel` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Amp | 4 calls |
| Watcher | 1 calls |
| Usage | 1 calls |
| Claude | 1 calls |

## How to Explore

1. `gitnexus_context({name: "TestCountTokensFromIR_Basic"})` — see callers and callees
2. `gitnexus_query({query: "util"})` — find related execution flows
3. Read key files listed above for implementation details
