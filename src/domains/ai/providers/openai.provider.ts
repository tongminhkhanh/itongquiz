/**
 * OpenAI Compatible Provider
 * 
 * Implementation for OpenAI API and compatible endpoints (LLM-Mux).
 * Follows Single Responsibility - only handles OpenAI-style API logic.
 */

import { SYSTEM_INSTRUCTION } from '../../../../constants';
import type { IAIProvider, AIProviderType, QuizGenerationOptions, QuizGenerationResult } from '../ai.types';
import { buildPrompt, buildFileAttachmentPrompt } from '../shared/prompt-builder';
import { parseAndRepairJSON, formatMathSymbols } from '../shared/json-repair';
import { fileToBase64 } from '../shared/file-utils';

/**
 * OpenAI Compatible Provider
 * Also works with LLM-Mux and other OpenAI-compatible APIs
 */
export class OpenAIProvider implements IAIProvider {
    readonly type: AIProviderType;
    readonly displayName: string;

    private apiKey: string;
    private baseUrl: string;
    private modelName: string;

    constructor(
        apiKey: string,
        type: AIProviderType = 'openai',
        baseUrl: string = 'https://api.openai.com/v1',
        modelName?: string
    ) {
        this.apiKey = apiKey;
        this.type = type;
        this.baseUrl = baseUrl;

        // Default model based on provider type
        const isLlmMux = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        this.modelName = modelName || (isLlmMux ? 'gemini-2.5-flash' : 'gpt-4o');
        this.displayName = type === 'llm-mux' ? 'LLM-Mux' : 'OpenAI GPT-4';
    }

    validateApiKey(apiKey: string): boolean {
        // LLM-Mux might not need a real key
        if (this.type === 'llm-mux') return true;
        return apiKey.startsWith('sk-') && apiKey.length > 20;
    }

    async generate(
        topic: string,
        classLevel: string,
        content: string,
        options?: QuizGenerationOptions,
        file?: File | null
    ): Promise<QuizGenerationResult> {
        const API_URL = `${this.baseUrl}/chat/completions`;
        const promptText = buildPrompt(topic, classLevel, content, options);

        const messages: any[] = [
            {
                role: 'system',
                content: SYSTEM_INSTRUCTION
            }
        ];

        const userContent: any[] = [{ type: 'text', text: promptText }];

        // Handle Attached File (if image) - PRIORITIZE for quiz generation
        if (file && file.type.startsWith('image/')) {
            const base64Data = await fileToBase64(file);
            userContent.unshift({
                type: 'text',
                text: buildFileAttachmentPrompt()
            });
            userContent.splice(1, 0, {
                type: 'image_url',
                image_url: {
                    url: `data:${file.type};base64,${base64Data}`
                }
            });
        }

        // Handle Image Library
        if (options?.imageLibrary && options.imageLibrary.length > 0) {
            userContent.push({ type: 'text', text: "\n\nTHƯ VIỆN HÌNH ẢNH (Image Library):" });
            for (const img of options.imageLibrary) {
                if (img.data && img.data.startsWith('http')) {
                    userContent.push({ type: 'text', text: `\nImage ID: ${img.id} (Name: ${img.name})` });
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: img.data
                        }
                    });
                }
            }
        }

        messages.push({
            role: 'user',
            content: userContent
        });

        const requestBody = {
            model: this.modelName,
            messages: messages,
            temperature: 0.4,
            response_format: { type: "json_object" }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("OpenAI API Error:", errorData);

            if (response.status === 429) {
                throw new Error("Hết tiền trong tài khoản OpenAI (Quota Exceeded). Vui lòng nạp thêm tiền hoặc chuyển sang dùng Google Gemini (Miễn phí).");
            }

            throw new Error(`Lỗi OpenAI API (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices[0].message.content;

        const formattedText = formatMathSymbols(text);
        return parseAndRepairJSON(formattedText);
    }
}
