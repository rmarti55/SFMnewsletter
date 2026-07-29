export const SMART_MODEL = process.env.LLM_SMART_MODEL || 'google/gemini-2.5-flash';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RETRIES = 3;
const RETRYABLE = new Set([402, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenRouterError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`OpenRouter API error (${status}): ${body}`);
    this.name = 'OpenRouterError';
    this.status = status;
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    feature?: string;
  } = {},
): Promise<{ content: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const model = options.model || SMART_MODEL;
  const body = JSON.stringify({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
    provider: { ignore: ['amazon-bedrock'] },
  });

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(Math.pow(4, attempt) * 250);
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-OpenRouter-Title': 'Santa Fe Newsletter',
      },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      lastError = new OpenRouterError(response.status, text);
      if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES - 1) continue;
      throw lastError;
    }
    const data = (await response.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    if (options.feature) console.log(`[openrouter] ${options.feature} model=${data.model ?? model}`);
    return { content, model: data.model ?? model };
  }
  throw lastError ?? new Error('OpenRouter request failed');
}

export async function jsonCompletion<T>(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    feature?: string;
    fallback: T;
  },
): Promise<{ data: T; model: string }> {
  const { parseJsonResponse } = await import('./parse');
  const { content, model } = await chatCompletion(messages, options);
  return { data: parseJsonResponse(content, options.fallback), model };
}
