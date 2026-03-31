---
name: to-ir
description: "Skill for the To_ir area of itongquiz1. 77 symbols across 10 files."
---

# To_ir

77 symbols | 10 files | Cohesion: 69%

## When to Use

- Working with code in `llm-mux/`
- Understanding how ParseOpenAIRequest, ParseOllamaChunk, ParseOllamaChunkWithState work
- Modifying to_ir-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/translator/ir/util.go` | BytesToString, ExtractThoughtSignature, ValidateJSON, UnwrapAntigravityEnvelope, MapEffortToBudget (+13) |
| `llm-mux/internal/translator/to_ir/gemini.go` | ParseGeminiRequest, parseGeminiSystemInstruction, parseGeminiContent, ParseGeminiResponse, ParseGeminiResponseCandidates (+10) |
| `llm-mux/internal/translator/to_ir/openai.go` | ParseOpenAIRequest, parseOpenAITool, parseThinkingConfig, parseResponsesAPIFields, parseResponsesInputItem (+9) |
| `llm-mux/internal/translator/to_ir/ollama.go` | ParseOllamaChunk, ParseOllamaChunkWithState, parseOllamaTool, mapOllamaDoneReason, ParseOllamaRequest (+7) |
| `llm-mux/internal/translator/to_ir/kiro.go` | ParseKiroResponse, processToolEvent, processRegularEvents, hasToolCall, convertToolID (+3) |
| `llm-mux/internal/runtime/executor/kiro_executor.go` | handleJSONResponse, handleEventStreamResponse, processStream, parseEventPayload |
| `llm-mux/internal/translator/to_ir/claude.go` | ParseClaudeRequest, parseClaudeMessage |
| `llm-mux/internal/translator/ir/message_builder.go` | ParseReasoningFromJSON, ParseOpenAIStyleToolCalls |
| `llm-mux/internal/translator/from_ir/gemini.go` | ParseResponse |
| `llm-mux/internal/runtime/executor/translator_wrapper.go` | TranslateCodexResponseNonStream |

## Entry Points

Start here when exploring this area:

- **`ParseOpenAIRequest`** (Function) — `llm-mux/internal/translator/to_ir/openai.go:17`
- **`ParseOllamaChunk`** (Function) — `llm-mux/internal/translator/to_ir/ollama.go:160`
- **`ParseOllamaChunkWithState`** (Function) — `llm-mux/internal/translator/to_ir/ollama.go:167`
- **`ParseGeminiRequest`** (Function) — `llm-mux/internal/translator/to_ir/gemini.go:20`
- **`ParseGeminiResponse`** (Function) — `llm-mux/internal/translator/to_ir/gemini.go:410`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ParseOpenAIRequest` | Function | `llm-mux/internal/translator/to_ir/openai.go` | 17 |
| `ParseOllamaChunk` | Function | `llm-mux/internal/translator/to_ir/ollama.go` | 160 |
| `ParseOllamaChunkWithState` | Function | `llm-mux/internal/translator/to_ir/ollama.go` | 167 |
| `ParseGeminiRequest` | Function | `llm-mux/internal/translator/to_ir/gemini.go` | 20 |
| `ParseGeminiResponse` | Function | `llm-mux/internal/translator/to_ir/gemini.go` | 410 |
| `ParseGeminiResponseCandidates` | Function | `llm-mux/internal/translator/to_ir/gemini.go` | 417 |
| `ParseGeminiResponseMeta` | Function | `llm-mux/internal/translator/to_ir/gemini.go` | 521 |
| `ParseGeminiResponseMetaWithContext` | Function | `llm-mux/internal/translator/to_ir/gemini.go` | 527 |
| `ParseGeminiChunkWithContext` | Function | `llm-mux/internal/translator/to_ir/gemini.go` | 620 |
| `ParseClaudeRequest` | Function | `llm-mux/internal/translator/to_ir/claude.go` | 11 |
| `BytesToString` | Function | `llm-mux/internal/translator/ir/util.go` | 14 |
| `ExtractThoughtSignature` | Function | `llm-mux/internal/translator/ir/util.go` | 24 |
| `ValidateJSON` | Function | `llm-mux/internal/translator/ir/util.go` | 48 |
| `UnwrapAntigravityEnvelope` | Function | `llm-mux/internal/translator/ir/util.go` | 55 |
| `MapEffortToBudget` | Function | `llm-mux/internal/translator/ir/util.go` | 148 |
| `CleanJsonSchema` | Function | `llm-mux/internal/translator/ir/util.go` | 188 |
| `GenToolCallID` | Function | `llm-mux/internal/translator/ir/util.go` | 199 |
| `GenClaudeToolCallID` | Function | `llm-mux/internal/translator/ir/util.go` | 221 |
| `MapGeminiFinishReason` | Function | `llm-mux/internal/translator/ir/util.go` | 290 |
| `ParseMalformedFunctionCall` | Function | `llm-mux/internal/translator/ir/util.go` | 305 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Execute → MapStandardRole` | cross_community | 6 |
| `Execute → ParseReasoningFromJSON` | cross_community | 6 |
| `ExecuteStream → MapStandardRole` | cross_community | 6 |
| `ExecuteStream → ParseReasoningFromJSON` | cross_community | 6 |
| `Execute → ValidateJSON` | cross_community | 6 |
| `Execute → ValidateJSON` | cross_community | 6 |
| `Execute → ParseOllamaOptions` | cross_community | 6 |
| `Execute → ParseClaudeMessage` | cross_community | 6 |
| `ExecuteStream → MapStandardRole` | cross_community | 6 |
| `ExecuteStream → MapStandardRole` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Amp | 3 calls |
| Ir | 2 calls |
| Codex | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ParseOpenAIRequest"})` — see callers and callees
2. `gitnexus_query({query: "to_ir"})` — find related execution flows
3. Read key files listed above for implementation details
