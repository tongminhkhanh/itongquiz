---
name: executor
description: "Skill for the Executor area of itongquiz1. 253 symbols across 41 files."
---

# Executor

253 symbols | 41 files | Cohesion: 86%

## When to Use

- Working with code in `llm-mux/`
- Understanding how FromString, ModelSupportsThinking, InArray work
- Modifying executor-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/runtime/executor/translator_wrapper.go` | NewStreamState, extractUsageFromEvents, convertEventsToClaude, convertEventsToOllama, convertEventsToGemini (+27) |
| `llm-mux/internal/runtime/executor/antigravity_executor.go` | Identifier, Execute, ExecuteStream, CountTokens, ensureAccessToken (+18) |
| `llm-mux/internal/runtime/executor/gemini_cli_executor.go` | Identifier, Execute, ExecuteStream, CountTokens, prepareGeminiCLITokenSource (+14) |
| `llm-mux/internal/runtime/executor/gemini_vertex_executor.go` | Identifier, countTokensWithServiceAccount, countTokensWithAPIKey, executeWithServiceAccount, executeWithAPIKey (+10) |
| `llm-mux/internal/runtime/executor/usage_helpers.go` | publish, publishFailure, trackFailure, publishWithOutcome, ensurePublished (+8) |
| `llm-mux/internal/runtime/executor/claude_executor.go` | Identifier, Execute, ExecuteStream, CountTokens, extractAndRemoveBetas (+8) |
| `llm-mux/internal/runtime/executor/token_helpers.go` | countOpenAIChatTokens, collectOpenAITools, collectOpenAIFunctions, collectOpenAIToolChoice, collectOpenAIResponseFormat (+8) |
| `llm-mux/internal/runtime/executor/codex_executor.go` | Identifier, Execute, ExecuteStream, CountTokens, setReasoningEffortByAlias (+6) |
| `llm-mux/internal/runtime/executor/kiro_executor.go` | NewKiroExecutor, buildHTTPRequest, Execute, ExecuteStream, ensureValidToken (+5) |
| `llm-mux/internal/runtime/executor/openai_compat_executor.go` | Identifier, Execute, ExecuteStream, CountTokens, resolveCredentials (+4) |

## Entry Points

Start here when exploring this area:

- **`FromString`** (Function) — `llm-mux/sdk/translator/translator.go:9`
- **`ModelSupportsThinking`** (Function) — `llm-mux/internal/util/thinking.go:15`
- **`InArray`** (Function) — `llm-mux/internal/util/provider.go:148`
- **`ApplyCustomHeadersFromAttrs`** (Function) — `llm-mux/internal/util/header_helpers.go:9`
- **`ApplyGeminiThinkingConfig`** (Function) — `llm-mux/internal/util/gemini_thinking.go:91`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `FromString` | Function | `llm-mux/sdk/translator/translator.go` | 9 |
| `ModelSupportsThinking` | Function | `llm-mux/internal/util/thinking.go` | 15 |
| `InArray` | Function | `llm-mux/internal/util/provider.go` | 148 |
| `ApplyCustomHeadersFromAttrs` | Function | `llm-mux/internal/util/header_helpers.go` | 9 |
| `ApplyGeminiThinkingConfig` | Function | `llm-mux/internal/util/gemini_thinking.go` | 91 |
| `GeminiThinkingFromMetadata` | Function | `llm-mux/internal/util/gemini_thinking.go` | 135 |
| `StripThinkingConfigIfUnsupported` | Function | `llm-mux/internal/util/gemini_thinking.go` | 213 |
| `ParseGeminiChunk` | Function | `llm-mux/internal/translator/to_ir/gemini.go` | 614 |
| `NewClaudeStreamState` | Function | `llm-mux/internal/translator/from_ir/claude.go` | 42 |
| `NewToolSchemaContextFromGJSON` | Function | `llm-mux/internal/translator/ir/tool_schema.go` | 66 |
| `ResolveSharedCredential` | Function | `llm-mux/internal/runtime/geminicli/state.go` | 106 |
| `IsVirtual` | Function | `llm-mux/internal/runtime/geminicli/state.go` | 122 |
| `FilterSSEUsageMetadata` | Function | `llm-mux/internal/runtime/executor/usage_helpers.go` | 251 |
| `StripUsageMetadataFromJSON` | Function | `llm-mux/internal/runtime/executor/usage_helpers.go` | 327 |
| `NewStreamState` | Function | `llm-mux/internal/runtime/executor/translator_wrapper.go` | 44 |
| `TranslateToGeminiWithTokens` | Function | `llm-mux/internal/runtime/executor/translator_wrapper.go` | 295 |
| `TranslateToGeminiCLIWithTokens` | Function | `llm-mux/internal/runtime/executor/translator_wrapper.go` | 321 |
| `TranslateToGeminiCLI` | Function | `llm-mux/internal/runtime/executor/translator_wrapper.go` | 531 |
| `TranslateToCodex` | Function | `llm-mux/internal/runtime/executor/translator_wrapper.go` | 623 |
| `TranslateCodexResponseStream` | Function | `llm-mux/internal/runtime/executor/translator_wrapper.go` | 669 |

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
| `Execute → MapStandardRole` | cross_community | 6 |
| `Execute → ParseReasoningFromJSON` | cross_community | 6 |
| `ExecuteStream → DefaultManager` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| To_ir | 26 calls |
| Ir | 9 calls |
| Registry | 5 calls |
| Auth | 4 calls |
| Wsrelay | 3 calls |
| Cliproxy | 2 calls |
| Usage | 2 calls |
| Util | 2 calls |

## How to Explore

1. `gitnexus_context({name: "FromString"})` — see callers and callees
2. `gitnexus_query({query: "executor"})` — find related execution flows
3. Read key files listed above for implementation details
