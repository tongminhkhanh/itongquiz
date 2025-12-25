/**
 * Perplexity AI Provider
 * 
 * Implementation for Perplexity API.
 * Follows Single Responsibility - only handles Perplexity-specific logic.
 */

import { SYSTEM_INSTRUCTION } from '../../../../constants';
import type { IAIProvider, AIProviderType, QuizGenerationOptions, QuizGenerationResult } from '../ai.types';
import { buildPrompt } from '../shared/prompt-builder';
import { parseAndRepairJSON } from '../shared/json-repair';

const API_URL = 'https://api.perplexity.ai/chat/completions';
const MODEL_NAME = 'sonar';

/**
 * Perplexity AI Provider
 */
export class PerplexityProvider implements IAIProvider {
    readonly type: AIProviderType = 'perplexity';
    readonly displayName = 'Perplexity (Sonar)';

    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    validateApiKey(apiKey: string): boolean {
        return apiKey.startsWith('pplx-') && apiKey.length > 20;
    }

    async generate(
        topic: string,
        classLevel: string,
        content: string,
        options?: QuizGenerationOptions,
        file?: File | null
    ): Promise<QuizGenerationResult> {
        const promptText = buildPrompt(topic, classLevel, content, options);

        const requestBody = {
            model: MODEL_NAME,
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_INSTRUCTION
                },
                {
                    role: 'user',
                    content: promptText
                }
            ],
            temperature: 0.4,
            max_tokens: 8192
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
            console.error("Perplexity API Error:", errorData);

            if (response.status === 401) {
                throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại Perplexity API Key của bạn.");
            }
            if (response.status === 429) {
                throw new Error("Đã vượt quá giới hạn request. Vui lòng đợi một chút rồi thử lại.");
            }

            throw new Error(`Lỗi Perplexity API (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error("AI không trả về kết quả nào.");
        }

        const text = data.choices[0].message.content;
        if (!text) throw new Error("AI trả về dữ liệu rỗng.");

        return parseAndRepairJSON(text);
    }
}
