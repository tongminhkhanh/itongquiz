/**
 * Image Generation Service
 * Interact with local CLIProxy to generate images via image-nano-skill
 */

// Use local proxy path to avoid CORS issues when using remote API
const CLIPROXY_BASE_URL = '/api/cliproxy';
// const CLIPROXY_BASE_URL = (import.meta as any).env.VITE_CLIPROXY_API || 'http://localhost:3000/v1';
const CLIPROXY_TOKEN = (import.meta as any).env.VITE_CLIPROXY_TOKEN || '';
const DEFAULT_MODEL = 'gemini-3-pro-image-preview'; // Or gemini-2.0-flash experimental

export interface ImageGenerationResult {
    success: boolean;
    data?: string; // Base64 data URL
    error?: string;
}

/**
 * Check if CLIProxy is available
 */
export const checkImageServiceAvailability = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${CLIPROXY_BASE_URL}/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CLIPROXY_TOKEN}`
            }
        });
        return response.ok;
    } catch (error) {
        console.warn('CLIProxy not available:', error);
        return false;
    }
};

/**
 * Generate image from prompt using CLIProxy
 */
export const generateImage = async (prompt: string): Promise<ImageGenerationResult> => {
    try {

        const payload = {
            model: DEFAULT_MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt }
                    ]
                }
            ],
            max_tokens: 4096
        };

        const response = await fetch(`${CLIPROXY_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CLIPROXY_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`CLIProxy Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Extract image from response (OpenAI compatible format structure)
        const choices = data.choices || [];
        if (choices.length === 0) throw new Error('No content returned (choices empty)');

        const message = choices[0].message || {};
        const images = message.images || []; // Custom CLIProxy format
        const content = message.content || '';

        let imageUrl = '';

        // Priority 1: Custom 'images' array (CLIProxy/GenImage specific)
        if (images.length > 0 && images[0].image_url?.url) {
            imageUrl = images[0].image_url.url;
        }
        // Priority 2: Direct data URL in content
        else if (typeof content === 'string' && content.trim().startsWith('data:image')) {
            imageUrl = content.trim();
        }
        // Priority 3: Markdown image in content ![desc](url)
        else if (typeof content === 'string') {
            const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
            const match = content.match(markdownImageRegex);
            if (match && match[1]) {
                imageUrl = match[1];
            }
        }

        // Priority 4: Standard DALL-E format (data[0].url or b64_json)
        if (!imageUrl || !imageUrl.startsWith('data:image')) {
            if (data.data && data.data.length > 0) {
                if (data.data[0].b64_json) {
                    imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
                } else if (data.data[0].url) {
                    imageUrl = data.data[0].url;
                }
            }
        }

        if (!imageUrl) {
            throw new Error('Failed to extract image data from response. See console for details.');
        }

        return { success: true, data: imageUrl };

    } catch (error: any) {
        console.error('Image generation failed:', error);
        return { success: false, error: error.message };
    }
};
