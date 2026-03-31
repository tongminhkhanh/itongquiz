---
name: from-ir
description: "Skill for the From_ir area of itongquiz1. 71 symbols across 10 files."
---

# From_ir

71 symbols | 10 files | Cohesion: 78%

## When to Use

- Working with code in `llm-mux/`
- Understanding how ToClaudeSSE, GetStringBuilder, PutStringBuilder work
- Modifying from_ir-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/translator/from_ir/claude.go` | toClaudeToolID, ToClaudeSSE, buildClaudeContentParts, formatSSE, emitTextDeltaTo (+7) |
| `llm-mux/internal/translator/from_ir/kiro.go` | processMessages, convertMessage, buildUserMessage, buildAssistantMessage, buildToolResultMessage (+7) |
| `llm-mux/internal/translator/from_ir/gemini.go` | ConvertRequest, applyGenerationConfig, applySafetySettings, fixImageAspectRatioForPreview, applyTools (+7) |
| `llm-mux/internal/translator/from_ir/openai.go` | ToOpenAIRequestFmt, convertToChatCompletionsRequest, convertToResponsesAPIRequest, convertMessageToResponsesInput, buildResponsesUserMessage (+6) |
| `llm-mux/internal/translator/from_ir/ollama.go` | convertMessageToOllama, buildOllamaUserMessage, buildOllamaAssistantMessage, buildOllamaToolMessage, ToOllamaRequest (+3) |
| `llm-mux/internal/translator/ir/util.go` | MapBudgetToEffort, DefaultGeminiSafetySettings, GenerateUUID, schemaHasher, CleanJsonSchemaForClaude (+1) |
| `llm-mux/internal/translator/ir/pools.go` | GetStringBuilder, PutStringBuilder, GetUUIDBuf, PutUUIDBuf |
| `llm-mux/internal/translator/ir/message_builder.go` | CombineTextParts, CombineTextAndReasoning, GetFirstReasoningSignature, ValidateAndNormalizeJSON |
| `llm-mux/internal/util/thinking.go` | GetAutoAppliedThinkingConfig |
| `llm-mux/internal/util/image.go` | CreateWhiteImageBase64 |

## Entry Points

Start here when exploring this area:

- **`ToClaudeSSE`** (Function) — `llm-mux/internal/translator/from_ir/claude.go:413`
- **`GetStringBuilder`** (Function) — `llm-mux/internal/translator/ir/pools.go:34`
- **`PutStringBuilder`** (Function) — `llm-mux/internal/translator/ir/pools.go:39`
- **`ToOpenAIRequestFmt`** (Function) — `llm-mux/internal/translator/from_ir/openai.go:28`
- **`MapBudgetToEffort`** (Function) — `llm-mux/internal/translator/ir/util.go:165`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ToClaudeSSE` | Function | `llm-mux/internal/translator/from_ir/claude.go` | 413 |
| `GetStringBuilder` | Function | `llm-mux/internal/translator/ir/pools.go` | 34 |
| `PutStringBuilder` | Function | `llm-mux/internal/translator/ir/pools.go` | 39 |
| `ToOpenAIRequestFmt` | Function | `llm-mux/internal/translator/from_ir/openai.go` | 28 |
| `MapBudgetToEffort` | Function | `llm-mux/internal/translator/ir/util.go` | 165 |
| `CombineTextParts` | Function | `llm-mux/internal/translator/ir/message_builder.go` | 82 |
| `GetAutoAppliedThinkingConfig` | Function | `llm-mux/internal/util/thinking.go` | 68 |
| `CreateWhiteImageBase64` | Function | `llm-mux/internal/util/image.go` | 10 |
| `DefaultGeminiSafetySettings` | Function | `llm-mux/internal/translator/ir/util.go` | 178 |
| `CombineTextAndReasoning` | Function | `llm-mux/internal/translator/ir/message_builder.go` | 11 |
| `GetFirstReasoningSignature` | Function | `llm-mux/internal/translator/ir/message_builder.go` | 548 |
| `GenerateUUID` | Function | `llm-mux/internal/translator/ir/util.go` | 226 |
| `GetUUIDBuf` | Function | `llm-mux/internal/translator/ir/pools.go` | 56 |
| `PutUUIDBuf` | Function | `llm-mux/internal/translator/ir/pools.go` | 61 |
| `CleanJsonSchemaForClaude` | Function | `llm-mux/internal/translator/ir/util.go` | 703 |
| `ToOllamaRequest` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 16 |
| `ValidateAndNormalizeJSON` | Function | `llm-mux/internal/translator/ir/message_builder.go` | 200 |
| `ToResponsesAPIChunk` | Function | `llm-mux/internal/translator/from_ir/openai.go` | 1149 |
| `ConvertRequest` | Method | `llm-mux/internal/translator/from_ir/gemini.go` | 30 |
| `ConvertRequest` | Method | `llm-mux/internal/translator/from_ir/kiro.go` | 13 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ExecuteStream → MapBudgetToEffort` | cross_community | 5 |
| `Execute → MapBudgetToEffort` | cross_community | 5 |
| `Chat → MapBudgetToEffort` | cross_community | 5 |
| `Generate → MapBudgetToEffort` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Ir | 5 calls |
| To_ir | 3 calls |
| Executor | 1 calls |
| Codex | 1 calls |
| Wsrelay | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ToClaudeSSE"})` — see callers and callees
2. `gitnexus_query({query: "from_ir"})` — find related execution flows
3. Read key files listed above for implementation details
