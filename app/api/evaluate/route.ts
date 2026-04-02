import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';
import pdfParse from 'pdf-parse';
import { fetchFileAsBase64 } from '@/lib/fileUtils';

export const runtime = 'nodejs';

const RequestBodySchema = z.object({
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
  model: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google']),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1),
        fileUrl: z.string().min(1),
        fileType: z.string().min(1),
        fileSize: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

const LLMResponseSchema = z.object({
  verdict: z.enum(['pass', 'fail', 'inconclusive']),
  reasoning: z.string().min(1),
});

class TimeoutError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: { error: string },
  ) {
    super(payload.error);
    this.name = 'HttpError';
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const r = error as Record<string, unknown>;

  const directStatus = r.status ?? r.statusCode ?? r.code;
  if (typeof directStatus === 'number') return directStatus;

  const maybeResponse = r.response;
  if (maybeResponse && typeof maybeResponse === 'object') {
    const rr = maybeResponse as Record<string, unknown>;
    const respStatus = rr.status;
    if (typeof respStatus === 'number') return respStatus;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== 'object') return 'Unknown error';
  const r = error as Record<string, unknown>;
  const msg = r.message;
  return typeof msg === 'string' ? msg : 'Unknown error';
}

function extractFirstJsonObject(text: string): string | null {
  // Heuristic: take substring from first '{' to last '}'.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function fallbackExtractVerdictAndReasoning(rawText: string): {
  verdict?: 'pass' | 'fail' | 'inconclusive';
  reasoning?: string;
} {
  const verdictMatch = rawText.match(/\b(pass|fail|inconclusive)\b/i);
  const verdictRaw = verdictMatch?.[1]?.toLowerCase();

  const verdict =
    verdictRaw === 'pass' || verdictRaw === 'fail' || verdictRaw === 'inconclusive'
      ? verdictRaw
      : undefined;

  // Try to extract "reasoning": "...".
  const reasoningMatch =
    rawText.match(/["']reasoning["']\s*:\s*["']([\s\S]+?)["']\s*[,}]/i) ??
    rawText.match(/["']reasoning["']\s*:\s*["']([\s\S]+?)["']\s*$/i) ??
    rawText.match(/reasoning\s*[:\-]\s*([\s\S]+)/i);

  const reasoningRaw = reasoningMatch?.[1];
  const reasoning = typeof reasoningRaw === 'string' ? reasoningRaw.trim() : undefined;

  return { verdict, reasoning };
}

async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  controller: AbortController,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new TimeoutError(`Request timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function POST(req: Request) {
  // Default timeout; may be overridden by Settings (evaluation_timeout seconds)
  let timeoutMs = 30_000;
  const controller = new AbortController();

  try {
    const bodyUnknown: unknown = await req.json();
    const body = RequestBodySchema.parse(bodyUnknown);

    const { systemPrompt, userPrompt, model, provider, attachments } = body;

    const jsonInstruction =
      'Respond with ONLY a JSON object: { "verdict": "pass" | "fail" | "inconclusive", "reasoning": "your brief explanation" }';

    const systemWithInstruction = `${systemPrompt}\n\n${jsonInstruction}`;
    let combinedUser = userPrompt;

    const imageAttachments = (attachments ?? []).filter((a) => a.fileType.startsWith('image/'));
    const pdfAttachments = (attachments ?? []).filter((a) => a.fileType === 'application/pdf');

    // For providers that don't accept PDFs as native attachments, extract text and append.
    // Anthropic supports `document` blocks, so we do not extract/append for Anthropic.
    if (provider !== 'anthropic' && pdfAttachments.length > 0) {
      const texts: string[] = [];
      for (const pdf of pdfAttachments.slice(0, 2)) {
        const { base64 } = await fetchFileAsBase64(pdf.fileUrl);
        const buf = Buffer.from(base64, 'base64');
        const parsed = await pdfParse(buf);
        const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
        if (text) texts.push(`File (${pdf.fileName}) text:\n${text.slice(0, 8000)}`);
      }
      if (texts.length > 0) {
        combinedUser = `${combinedUser}\n\nAttached PDFs (extracted text):\n\n${texts.join('\n\n---\n\n')}`;
      }
    }

    // Provider key lookup order:
    // 1) `settings` table (openai_api_key / anthropic_api_key / google_api_key)
    // 2) server env var fallback (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY)
    const settingsKey =
      provider === 'openai'
        ? 'openai_api_key'
        : provider === 'anthropic'
          ? 'anthropic_api_key'
          : 'google_api_key';

    const { data: settingsRow, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', settingsKey)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json(
        { error: 'Failed to read API key from settings' },
        { status: 500 },
      );
    }

    // Read evaluation_timeout (seconds) from settings, if present.
    try {
      const { data: timeoutRow, error: timeoutError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'evaluation_timeout')
        .maybeSingle();
      if (!timeoutError && timeoutRow && typeof timeoutRow.value === 'string') {
        const secs = Number.parseInt(timeoutRow.value, 10);
        if (Number.isFinite(secs) && secs >= 5 && secs <= 300) {
          timeoutMs = secs * 1000;
        }
      }
    } catch {
      // ignore and keep default
    }

    const dbKey =
      settingsRow && typeof settingsRow.value === 'string' && settingsRow.value.trim().length > 0
        ? settingsRow.value.trim()
        : null;

    const openAiKey =
      provider === 'openai' ? dbKey ?? process.env.OPENAI_API_KEY ?? null : null;
    const anthropicKey =
      provider === 'anthropic'
        ? dbKey ?? process.env.ANTHROPIC_API_KEY ?? null
        : null;
    const googleKey = provider === 'google' ? dbKey ?? process.env.GOOGLE_API_KEY ?? null : null;

    if (provider === 'openai' && !openAiKey) {
      return NextResponse.json(
        { error: 'API key not configured for openai' },
        { status: 401 },
      );
    }
    if (provider === 'anthropic' && !anthropicKey) {
      return NextResponse.json(
        { error: 'API key not configured for anthropic' },
        { status: 401 },
      );
    }
    if (provider === 'google' && !googleKey) {
      return NextResponse.json(
        { error: 'API key not configured for google' },
        { status: 401 },
      );
    }

    const result = await (async () => {
      if (provider === 'openai') {
        const client = new OpenAI({ apiKey: openAiKey as string });

        const content: Array<
          | { type: 'text'; text: string }
          | { type: 'image_url'; image_url: { url: string } }
        > = [{ type: 'text', text: combinedUser }];

        for (const img of imageAttachments.slice(0, 4)) {
          const { base64, mimeType } = await fetchFileAsBase64(img.fileUrl);
          const dataUrl = `data:${mimeType};base64,${base64}`;
          content.push({ type: 'image_url', image_url: { url: dataUrl } });
        }

        const response = await withTimeout(
          () =>
            client.chat.completions.create(
              {
                model,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: systemWithInstruction },
                  { role: 'user', content },
                ],
                temperature: 0,
              },
              { signal: controller.signal },
            ),
          timeoutMs,
          controller,
        );

        const rawText = response.choices?.[0]?.message?.content;
        if (typeof rawText !== 'string') {
          throw new Error('OpenAI returned empty content');
        }

        const tokensUsed =
          typeof response.usage?.total_tokens === 'number' ? response.usage.total_tokens : 0;

        return { rawText, tokensUsed };
      }

      if (provider === 'anthropic') {
        const client = new Anthropic({ apiKey: anthropicKey as string });

        const content: Array<
          | { type: 'text'; text: string }
          | {
              type: 'image';
              source: { type: 'base64'; media_type: string; data: string };
            }
          | {
              type: 'document';
              source: { type: 'base64'; media_type: string; data: string };
            }
        > = [{ type: 'text', text: combinedUser }];

        for (const img of imageAttachments.slice(0, 4)) {
          const { base64, mimeType } = await fetchFileAsBase64(img.fileUrl);
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          });
        }

        for (const pdf of pdfAttachments.slice(0, 2)) {
          const { base64, mimeType } = await fetchFileAsBase64(pdf.fileUrl);
          content.push({
            type: 'document',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          });
        }

        const response = await withTimeout(
          () =>
            client.messages.create({
              model,
              system: systemWithInstruction,
              messages: [{ role: 'user', content }],
              temperature: 0,
              max_tokens: 1024,
            }),
          timeoutMs,
          controller,
        );

        const raw = typeof response.content?.[0]?.text === 'string' ? response.content?.[0]?.text : '';

        if (!raw) {
          throw new Error('Anthropic returned empty content');
        }

        const tokensUsed =
          typeof response.usage?.input_tokens === 'number' &&
          typeof response.usage?.output_tokens === 'number'
            ? response.usage.input_tokens + response.usage.output_tokens
            : 0;

        return { rawText: raw, tokensUsed };
      }

      // provider === 'google' (skip multimodal when Google isn't configured/available)
      const genAI = new GoogleGenerativeAI(googleKey as string);
      const googleModel = genAI.getGenerativeModel({ model });

      const rawText = await withTimeout(
        async () => {
          const prompt = `${systemPrompt}\n\n${combinedUser}\n\n${jsonInstruction}`;
          const result = await googleModel.generateContent(prompt);
          return result.response.text();
        },
        timeoutMs,
        controller,
      );

      const tokensUsed = 0;

      return { rawText, tokensUsed };
    })();

    const { rawText, tokensUsed } = result;

    let parsedUnknown: unknown;
    try {
      const jsonCandidate = extractFirstJsonObject(rawText) ?? rawText;
      parsedUnknown = JSON.parse(jsonCandidate);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse LLM response' },
        { status: 502 },
      );
    }

    const parsed = LLMResponseSchema.safeParse(parsedUnknown);
    if (!parsed.success) {
      const fallback = fallbackExtractVerdictAndReasoning(rawText);
      if (fallback.verdict && fallback.reasoning) {
        return NextResponse.json({
          verdict: fallback.verdict,
          reasoning: fallback.reasoning,
          tokensUsed,
        });
      }

      return NextResponse.json(
        { error: 'Failed to parse LLM response' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      verdict: parsed.data.verdict,
      reasoning: parsed.data.reasoning,
      tokensUsed,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof HttpError) {
      return NextResponse.json(error.payload, { status: error.status });
    }

    const status = getErrorStatus(error);
    if (status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof TimeoutError) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }

    const message = getErrorMessage(error).toLowerCase();
    if (message.includes('timeout')) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }

    if (message.includes('unauthorized') || message.includes('invalid api key')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: getErrorMessage(error) || 'Internal server error' },
      { status: 500 },
    );
  }
}

