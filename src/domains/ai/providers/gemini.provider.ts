/**
 * Gemini AI Provider
 * 
 * Implementation for Google Gemini API.
 * Follows Single Responsibility - only handles Gemini-specific logic.
 */

import { SYSTEM_INSTRUCTION } from '../../../../constants';
import type { IAIProvider, AIProviderType, QuizGenerationOptions, QuizGenerationResult } from '../ai.types';
import { buildPrompt, buildFileAttachmentPrompt } from '../shared/prompt-builder';
import { parseAndRepairJSON, formatMathSymbols } from '../shared/json-repair';
import { fileToBase64, urlToBase64 } from '../shared/file-utils';

const MODEL_NAME = 'gemini-2.0-flash';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Gemini AI Provider
 */
export class GeminiProvider implements IAIProvider {
    readonly type: AIProviderType = 'gemini';
    readonly displayName = 'Google Gemini';

    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    validateApiKey(apiKey: string): boolean {
        return apiKey.length > 10;
    }

    async generate(
        topic: string,
        classLevel: string,
        content: string,
        options?: QuizGenerationOptions,
        file?: File | null
    ): Promise<QuizGenerationResult> {
        const API_URL = `${API_BASE_URL}/${MODEL_NAME}:generateContent?key=${this.apiKey}`;
        const promptText = buildPrompt(topic, classLevel, content, options);

        const contents: any[] = [];
        const parts: any[] = [];

        // Handle attached file
        if (file) {
            const base64Data = await fileToBase64(file);
            parts.push({ text: buildFileAttachmentPrompt() });
            parts.push({
                inline_data: {
                    mime_type: file.type,
                    data: base64Data
                }
            });
        }

        // Handle Image Library
        if (options?.imageLibrary && options.imageLibrary.length > 0) {
            parts.push({ text: "THƯ VIỆN HÌNH ẢNH (Image Library):" });
            for (const img of options.imageLibrary) {
                if (img.data && img.data.startsWith('http')) {
                    try {
                        const { data, mimeType } = await urlToBase64(img.data);
                        parts.push({ text: `Image ID: ${img.id} (Name: ${img.name})` });
                        parts.push({
                            inline_data: {
                                mime_type: mimeType,
                                data: data
                            }
                        });
                    } catch (err) {
                        console.error(`Failed to fetch image ${img.id}:`, err);
                        parts.push({ text: `[Failed to load image ID: ${img.id}]` });
                    }
                }
            }
        }

        parts.push({ text: promptText });
        contents.push({ parts: parts });

        const requestBody = {
            contents: contents,
            system_instruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            tools: [
                {
                    google_search_retrieval: {
                        dynamic_retrieval_config: {
                            mode: "MODE_DYNAMIC",
                            dynamic_threshold: 0.6
                        }
                    }
                }
            ],
            generation_config: {
                temperature: 0.4,
                response_mime_type: "application/json"
            }
        };

        const maxRetries = 5;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));

                    // Handle 429 (Too Many Requests) or 503 (Service Unavailable)
                    if (response.status === 429 || response.status === 503) {
                        attempt++;
                        if (attempt >= maxRetries) {
                            throw new Error("Hệ thống đang quá tải (429). Bạn đang dùng gói miễn phí của Google, hãy đợi 1-2 phút rồi thử lại nhé!");
                        }
                        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                        console.log(`Rate limited. Đang chờ ${delay / 1000}s trước khi thử lại (lần ${attempt}/${maxRetries})...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    console.error("Gemini API Error:", errorData);
                    throw new Error(this.formatErrorMessage(errorData, response.status));
                }

                const data = await response.json();

                if (!data.candidates || data.candidates.length === 0) {
                    throw new Error("AI không trả về kết quả nào.");
                }

                const text = data.candidates[0].content.parts[0].text;
                if (!text) throw new Error("AI trả về dữ liệu rỗng.");

                const formattedText = formatMathSymbols(text);
                return parseAndRepairJSON(formattedText);

            } catch (error: any) {
                if (attempt >= maxRetries || !error.message.includes("429")) {
                    console.error("Generate Quiz Error:", error);
                    throw error;
                }
            }
        }

        throw new Error("Đã thử tối đa số lần cho phép.");
    }

    private formatErrorMessage(errorData: any, status: number): string {
        let errorMessage = `Lỗi API (${status}): ${status}`;

        if (errorData.error) {
            errorMessage = `Lỗi từ Google: ${errorData.error.message}`;

            if (errorData.error.code === 404 || errorData.error.status === 'NOT_FOUND') {
                errorMessage = `Không tìm thấy model '${MODEL_NAME}'. Vui lòng kiểm tra lại API Key.`;
            }
        }

        return errorMessage;
    }
}
