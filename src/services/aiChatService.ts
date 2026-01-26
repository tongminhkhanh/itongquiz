/**
 * aiChatService.ts - Service để gọi Gemini API cho Chatbot hướng dẫn sử dụng.
 * Sử dụng "Context Stuffing" - đưa ngữ cảnh dự án trực tiếp vào System Prompt.
 * Hỗ trợ fallback sang LLM-Mux khi không có Gemini API key.
 */

import { CHAT_SYSTEM_PROMPT } from '../config/projectContext';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Gửi tin nhắn đến AI và nhận phản hồi.
 * Ưu tiên: Gemini API (nếu có key) -> LLM-Mux (nếu có config)
 */
export async function generateChatResponse(
    query: string,
    history: ChatMessage[]
): Promise<string> {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const llmMuxBaseUrl = import.meta.env.VITE_LLM_MUX_BASE_URL;
    const llmMuxApiKey = import.meta.env.VITE_LLM_MUX_API_KEY;

    // Prefer Gemini direct, fallback to LLM-Mux
    if (geminiKey) {
        return callGeminiDirect(query, history, geminiKey);
    } else if (llmMuxBaseUrl && llmMuxApiKey) {
        return callLlmMux(query, history, llmMuxBaseUrl, llmMuxApiKey);
    } else {
        throw new Error('Thiếu cấu hình AI. Vui lòng thiết lập VITE_GEMINI_API_KEY hoặc VITE_LLM_MUX_API_KEY.');
    }
}

async function callGeminiDirect(
    query: string,
    history: ChatMessage[],
    apiKey: string
): Promise<string> {
    const MODEL_NAME = 'gemini-2.0-flash';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const historyParts = history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
    }));

    historyParts.push({ role: 'user', parts: [{ text: query }] });

    const requestBody = {
        contents: historyParts,
        system_instruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
        generation_config: { temperature: 0.7, max_output_tokens: 1024 },
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`Lỗi Gemini API: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Không có phản hồi.';
}

async function callLlmMux(
    query: string,
    history: ChatMessage[],
    baseUrl: string,
    apiKey: string
): Promise<string> {
    const API_URL = `${baseUrl}/chat/completions`;

    const messages = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...history.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: query },
    ];

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gemini-2.0-flash',
            messages,
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('LLM-Mux Error:', errorData);
        throw new Error(`Lỗi LLM-Mux API: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'Không có phản hồi.';
}
