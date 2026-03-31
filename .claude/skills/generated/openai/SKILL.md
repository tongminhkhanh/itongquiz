---
name: openai
description: "Skill for the Openai area of itongquiz1. 50 symbols across 9 files."
---

# Openai

50 symbols | 9 files | Cohesion: 89%

## When to Use

- Working with code in `llm-mux/`
- Understanding how ToOllamaChatChunk, ToOllamaGenerateChunk, OpenAIToOllamaChat work
- Modifying openai-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/sdk/api/handlers/openai/openai_handlers.go` | HandlerType, ChatCompletions, Completions, convertCompletionsRequestToChatCompletions, convertChatCompletionsResponseToCompletions (+6) |
| `llm-mux/internal/translator/from_ir/ollama.go` | ToOllamaChatChunk, ToOllamaGenerateChunk, OpenAIToOllamaChat, OpenAIToOllamaGenerate, OpenAIChunkToOllamaChat (+2) |
| `llm-mux/sdk/api/handlers/claude/code_handlers.go` | HandlerType, ClaudeMessages, ClaudeCountTokens, handleNonStreamingResponse, handleStreamingResponse (+2) |
| `llm-mux/sdk/api/handlers/gemini/gemini_handlers.go` | HandlerType, GeminiHandler, handleStreamGenerateContent, handleCountTokens, handleGenerateContent (+1) |
| `llm-mux/sdk/api/handlers/gemini/gemini-cli_handlers.go` | HandlerType, CLIHandler, handleInternalStreamGenerateContent, handleInternalGenerateContent, forwardCLIStream |
| `llm-mux/sdk/api/handlers/openai/openai_responses_handlers.go` | HandlerType, Responses, handleNonStreamingResponse, handleStreamingResponse, forwardResponsesStream |
| `llm-mux/sdk/api/handlers/handlers.go` | GetAlt, GetContextWithCancel, appendAPIResponse, WriteErrorResponse |
| `llm-mux/sdk/api/handlers/ollama/ollama_handlers.go` | handleOllamaChatStream, handleOllamaChatNonStream, handleOllamaGenerateStream, handleOllamaGenerateNonStream |
| `llm-mux/internal/api/modules/amp/gemini_bridge.go` | createGeminiBridgeHandler |

## Entry Points

Start here when exploring this area:

- **`ToOllamaChatChunk`** (Function) — `llm-mux/internal/translator/from_ir/ollama.go:347`
- **`ToOllamaGenerateChunk`** (Function) — `llm-mux/internal/translator/from_ir/ollama.go:412`
- **`OpenAIToOllamaChat`** (Function) — `llm-mux/internal/translator/from_ir/ollama.go:463`
- **`OpenAIToOllamaGenerate`** (Function) — `llm-mux/internal/translator/from_ir/ollama.go:472`
- **`OpenAIChunkToOllamaChat`** (Function) — `llm-mux/internal/translator/from_ir/ollama.go:481`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ToOllamaChatChunk` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 347 |
| `ToOllamaGenerateChunk` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 412 |
| `OpenAIToOllamaChat` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 463 |
| `OpenAIToOllamaGenerate` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 472 |
| `OpenAIChunkToOllamaChat` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 481 |
| `OpenAIChunkToOllamaGenerate` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 494 |
| `GetAlt` | Method | `llm-mux/sdk/api/handlers/handlers.go` | 50 |
| `GetContextWithCancel` | Method | `llm-mux/sdk/api/handlers/handlers.go` | 61 |
| `WriteErrorResponse` | Method | `llm-mux/sdk/api/handlers/handlers.go` | 265 |
| `HandlerType` | Method | `llm-mux/sdk/api/handlers/openai/openai_handlers.go` | 46 |
| `ChatCompletions` | Method | `llm-mux/sdk/api/handlers/openai/openai_handlers.go` | 94 |
| `Completions` | Method | `llm-mux/sdk/api/handlers/openai/openai_handlers.go` | 124 |
| `HandlerType` | Method | `llm-mux/sdk/api/handlers/gemini/gemini_handlers.go` | 26 |
| `GeminiHandler` | Method | `llm-mux/sdk/api/handlers/gemini/gemini_handlers.go` | 143 |
| `HandlerType` | Method | `llm-mux/sdk/api/handlers/gemini/gemini-cli_handlers.go` | 29 |
| `CLIHandler` | Method | `llm-mux/sdk/api/handlers/gemini/gemini-cli_handlers.go` | 37 |
| `HandlerType` | Method | `llm-mux/sdk/api/handlers/claude/code_handlers.go` | 30 |
| `ClaudeMessages` | Method | `llm-mux/sdk/api/handlers/claude/code_handlers.go` | 38 |
| `ClaudeCountTokens` | Method | `llm-mux/sdk/api/handlers/claude/code_handlers.go` | 58 |
| `HandlerType` | Method | `llm-mux/sdk/api/handlers/openai/openai_responses_handlers.go` | 37 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Chat → AppendAPIResponse` | cross_community | 4 |
| `Generate → AppendAPIResponse` | cross_community | 4 |
| `CLIHandler → AppendAPIResponse` | intra_community | 4 |
| `CLIHandler → WriteErrorResponse` | intra_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| To_ir | 4 calls |
| Ir | 2 calls |
| Executor | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ToOllamaChatChunk"})` — see callers and callees
2. `gitnexus_query({query: "openai"})` — find related execution flows
3. Read key files listed above for implementation details
