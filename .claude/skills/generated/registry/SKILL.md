---
name: registry
description: "Skill for the Registry area of itongquiz1. 57 symbols across 16 files."
---

# Registry

57 symbols | 16 files | Cohesion: 82%

## When to Use

- Working with code in `llm-mux/`
- Understanding how NormalizeThinkingBudget, ResolveAutoModel, GetGlobalRegistry work
- Modifying registry-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `llm-mux/internal/registry/model_registry.go` | GetGlobalRegistry, findModelRegistration, GetAvailableModels, GetModelCount, GetModelInfo (+14) |
| `llm-mux/internal/registry/model_definitions.go` | GetClaudeModels, GetGeminiModels, GetGeminiVertexModels, GetAIStudioModels, GetOpenAIModels (+5) |
| `llm-mux/sdk/cliproxy/model_registration.go` | registerModelsForAuth, resolveConfigClaudeKey, resolveConfigGeminiKey, resolveConfigVertexCompatKey, resolveConfigCodexKey |
| `llm-mux/internal/util/provider.go` | ResolveAutoModel, GetProviderName, NormalizeIncomingModelID, ExtractProviderFromPrefixedModelID |
| `llm-mux/sdk/api/handlers/ollama/ollama_handlers.go` | Models, Tags, Show |
| `llm-mux/sdk/cliproxy/service.go` | applyExcludedModels, buildVertexCompatConfigModels, buildClaudeConfigModels |
| `llm-mux/internal/util/thinking.go` | NormalizeThinkingBudget, thinkingRangeFromRegistry |
| `llm-mux/internal/translator/from_ir/ollama.go` | ToOllamaShowResponse, findModelInfoByName |
| `llm-mux/sdk/api/handlers/openai/openai_responses_handlers.go` | Models, OpenAIResponsesModels |
| `llm-mux/sdk/api/handlers/handlers.go` | Models |

## Entry Points

Start here when exploring this area:

- **`NormalizeThinkingBudget`** (Function) — `llm-mux/internal/util/thinking.go:30`
- **`ResolveAutoModel`** (Function) — `llm-mux/internal/util/provider.go:79`
- **`GetGlobalRegistry`** (Function) — `llm-mux/internal/registry/model_registry.go:115`
- **`ToOllamaShowResponse`** (Function) — `llm-mux/internal/translator/from_ir/ollama.go:520`
- **`GetClaudeModels`** (Function) — `llm-mux/internal/registry/model_definitions.go:6`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `NormalizeThinkingBudget` | Function | `llm-mux/internal/util/thinking.go` | 30 |
| `ResolveAutoModel` | Function | `llm-mux/internal/util/provider.go` | 79 |
| `GetGlobalRegistry` | Function | `llm-mux/internal/registry/model_registry.go` | 115 |
| `ToOllamaShowResponse` | Function | `llm-mux/internal/translator/from_ir/ollama.go` | 520 |
| `GetClaudeModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 6 |
| `GetGeminiModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 153 |
| `GetGeminiVertexModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 248 |
| `GetAIStudioModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 460 |
| `GetOpenAIModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 571 |
| `GetQwenModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 955 |
| `GetIFlowModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 1001 |
| `GetClineModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 1044 |
| `GetGitHubCopilotModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 1070 |
| `GetKiroModels` | Function | `llm-mux/internal/registry/model_definitions.go` | 1104 |
| `GetProviderName` | Function | `llm-mux/internal/util/provider.go` | 29 |
| `NormalizeIncomingModelID` | Function | `llm-mux/internal/util/provider.go` | 56 |
| `ExtractProviderFromPrefixedModelID` | Function | `llm-mux/internal/util/provider.go` | 68 |
| `NewModelIDNormalizer` | Function | `llm-mux/internal/registry/model_registry.go` | 1042 |
| `LogCredentialSeparator` | Function | `llm-mux/internal/misc/credentials.go` | 23 |
| `GetAvailableModels` | Method | `llm-mux/internal/registry/model_registry.go` | 829 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ExecuteWithAuthManager → ModelRegistry` | cross_community | 5 |
| `ExecuteWithAuthManager → ModelIDNormalizer` | cross_community | 5 |
| `ExecuteCountWithAuthManager → ModelRegistry` | cross_community | 5 |
| `ExecuteCountWithAuthManager → ModelIDNormalizer` | cross_community | 5 |
| `ExecuteStreamWithAuthManager → ModelRegistry` | cross_community | 5 |
| `ExecuteStreamWithAuthManager → ModelIDNormalizer` | cross_community | 5 |
| `ExecuteWithServiceAccount → ModelRegistry` | cross_community | 5 |
| `ExecuteWithServiceAccount → FindModelRegistration` | cross_community | 5 |
| `ExecuteWithAPIKey → ModelRegistry` | cross_community | 5 |
| `ExecuteWithAPIKey → FindModelRegistration` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cliproxy | 3 calls |
| Executor | 2 calls |

## How to Explore

1. `gitnexus_context({name: "NormalizeThinkingBudget"})` — see callers and callees
2. `gitnexus_query({query: "registry"})` — find related execution flows
3. Read key files listed above for implementation details
