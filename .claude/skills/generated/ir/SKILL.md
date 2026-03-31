---
name: ir
description: "Skill for the Ir area of itongquiz1. 78 symbols across 15 files."
---

# Ir

78 symbols | 15 files | Cohesion: 81%

## When to Use

- Working with code in `llm-mux/`
- Understanding how ToOpenAIChatCompletionCandidates, ToOpenAIChatCompletionMeta, ToOpenAIChunkMeta work
- Modifying ir-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/translator/ir/response_builder.go` | NewResponseBuilder, GetLastMessage, HasContent, GetTextContent, GetReasoningContent (+8) |
| `llm-mux/internal/translator/ir/message_builder.go` | CombineReasoningParts, ParseToolCallArgs, BuildToolMaps, tolerantParseJSONMap, isSpace (+5) |
| `llm-mux/internal/translator/ir/claude_builder.go` | ExtractSSEData, ParseClaudeStreamDelta, ParseClaudeStreamDeltaWithState, ParseClaudeContentBlockStart, ParseClaudeContentBlockStop (+3) |
| `llm-mux/internal/translator/ir/tool_schema.go` | NormalizeToolCallArgs, addMissingDefaults, normalizeMapRecursive, normalizeArrayRecursive, findBestMatch (+2) |
| `llm-mux/internal/translator/from_ir/openai.go` | ToOpenAIChatCompletionCandidates, ToOpenAIChatCompletionMeta, ToOpenAIChunkMeta, ToResponsesAPIResponse, buildOpenAIGroundingMetadata (+1) |
| `llm-mux/internal/translator/from_ir/gemini.go` | ToGeminiResponse, ToGeminiResponseMeta, ToGeminiChunk, buildGroundingMetadataMap, applyMessages (+1) |
| `llm-mux/internal/translator/ir/util_test.go` | TestCleanJsonSchemaForGemini_RemovesExclusiveMinMax, TestCleanJsonSchemaForGemini_DeeplyNestedProperties, TestCleanJsonSchemaForGemini_ArrayItems, TestCleanJsonSchemaForGemini_PreservesValidFields, TestCleanJsonSchemaForGemini_NilSchema (+1) |
| `llm-mux/internal/translator/ir/util.go` | MapFinishReasonToOpenAI, MapClaudeFinishReason, CleanJsonSchemaForGemini, cleanSchemaForGeminiRecursive |
| `llm-mux/internal/translator/from_ir/claude.go` | ParseStreamChunk, ParseStreamChunkWithState, ParseResponse, ToClaudeResponse |
| `llm-mux/internal/translator/ir/content_coalescer.go` | GetContentCoalescer, PutContentCoalescer, Emit, Build |

## Entry Points

Start here when exploring this area:

- **`ToOpenAIChatCompletionCandidates`** (Function) — `llm-mux/internal/translator/from_ir/openai.go:456`
- **`ToOpenAIChatCompletionMeta`** (Function) — `llm-mux/internal/translator/from_ir/openai.go:570`
- **`ToOpenAIChunkMeta`** (Function) — `llm-mux/internal/translator/from_ir/openai.go:687`
- **`ToResponsesAPIResponse`** (Function) — `llm-mux/internal/translator/from_ir/openai.go:1008`
- **`ToOllamaChatResponse`** (Function) — `llm-mux/internal/translator/from_ir/ollama.go:263`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ToOpenAIChatCompletionCandidates` | Function | `llm-mux/internal/translator/from_ir/openai.go` | 456 |
| `ToOpenAIChatCompletionMeta` | Function | `llm-mux/internal/translator/from_ir/openai.go` | 570 |
| `ToOpenAIChunkMeta` | Function | `llm-mux/internal/translator/from_ir/openai.go` | 687 |
| `ToResponsesAPIResponse` | Function | `llm-mux/internal/translator/from_ir/openai.go` | 1008 |
| `ToOllamaChatResponse` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 263 |
| `ToOllamaGenerateResponse` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 313 |
| `ToGeminiResponse` | Function | `llm-mux/internal/translator/from_ir/gemini.go` | 766 |
| `ToGeminiResponseMeta` | Function | `llm-mux/internal/translator/from_ir/gemini.go` | 771 |
| `ToGeminiChunk` | Function | `llm-mux/internal/translator/from_ir/gemini.go` | 818 |
| `MapFinishReasonToOpenAI` | Function | `llm-mux/internal/translator/ir/util.go` | 467 |
| `NewResponseBuilder` | Function | `llm-mux/internal/translator/ir/response_builder.go` | 25 |
| `GetSSEChunkBuf` | Function | `llm-mux/internal/translator/ir/pools.go` | 111 |
| `BuildSSEChunk` | Function | `llm-mux/internal/translator/ir/pools.go` | 124 |
| `BuildSSEEvent` | Function | `llm-mux/internal/translator/ir/pools.go` | 136 |
| `CombineReasoningParts` | Function | `llm-mux/internal/translator/ir/message_builder.go` | 116 |
| `ParseToolCallArgs` | Function | `llm-mux/internal/translator/ir/message_builder.go` | 212 |
| `ParseClaudeChunk` | Function | `llm-mux/internal/translator/to_ir/claude.go` | 447 |
| `ExtractSSEData` | Function | `llm-mux/internal/translator/ir/claude_builder.go` | 139 |
| `ParseClaudeStreamDelta` | Function | `llm-mux/internal/translator/ir/claude_builder.go` | 153 |
| `ParseClaudeStreamDeltaWithState` | Function | `llm-mux/internal/translator/ir/claude_builder.go` | 158 |

## Connected Areas

| Area | Connections |
|------|-------------|
| To_ir | 5 calls |
| From_ir | 5 calls |
| Wsrelay | 1 calls |
| Executor | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ToOpenAIChatCompletionCandidates"})` — see callers and callees
2. `gitnexus_query({query: "ir"})` — find related execution flows
3. Read key files listed above for implementation details
