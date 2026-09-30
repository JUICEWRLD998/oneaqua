import type { ProposerDeps } from './types'
import { DEFAULT_MODEL } from './types'

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}
export interface LlmOk {
  ok: true
  content: string
  model: string
  finishReason?: string
  usage?: unknown
  /** True when the provider rejected response_format and the request was re-sent without it. */
  noJsonSchema: boolean
  attempts: number
  /** The exact request body of the final request (no secrets in it). */
  request: Record<string, unknown>
}
export interface LlmFail {
  ok: false
  error: string
  attempts: number
}

export function modelFrom(deps: Pick<ProposerDeps, 'env'>): string {
  return deps.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL
}

/** Never let the key appear in anything we return or log. */
export function redact(text: string, key: string | undefined): string {
  return key ? text.split(key).join('[redacted]') : text
}

/**
 * One chat completion against OpenRouter. 20 s timeout, one retry on 5xx / 429 / timeout / network error.
 * If the provider rejects response_format (HTTP 400/404/422) the request is re-sent once without it.
 */
export async function chat(deps: ProposerDeps, messages: ChatMessage[], responseFormat?: Record<string, unknown>): Promise<LlmOk | LlmFail> {
  const key = deps.env.OPENROUTER_API_KEY as string
  const timeoutMs = deps.timeoutMs ?? 20_000
  let useFormat = responseFormat !== undefined
  let noJsonSchema = false
  let attempts = 0
  let retried = false
  let lastError = 'unknown error'

  for (;;) {
    attempts += 1
    const body: Record<string, unknown> = {
      model: modelFrom(deps),
      messages,
      temperature: 0,
      ...(useFormat ? { response_format: responseFormat } : {}),
    }
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    let retryable = false
    try {
      const res = await deps.fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'Firstline' },
        body: JSON.stringify(body),
        signal: ctl.signal,
      })
      const text = await res.text()
      let json: any
      try {
        json = JSON.parse(text)
      } catch {
        json = undefined
      }
      const apiErr = json?.error
      const status: number = res.ok ? (typeof apiErr?.code === 'number' ? apiErr.code : 200) : res.status
      if (status === 200 && !apiErr) {
        const choice = json?.choices?.[0]
        const content = choice?.message?.content
        if (typeof content === 'string') {
          return {
            ok: true,
            content,
            model: typeof json.model === 'string' ? json.model : modelFrom(deps),
            finishReason: choice.finish_reason,
            usage: json.usage,
            noJsonSchema,
            attempts,
            request: body,
          }
        }
        lastError = 'provider returned no message content'
      } else if (useFormat && [400, 404, 422].includes(status)) {
        useFormat = false
        noJsonSchema = true
        lastError = `provider rejected response_format (HTTP ${status})`
        continue // does not consume the retry
      } else {
        lastError = `provider HTTP ${status}`
        retryable = status >= 500 || status === 429
      }
    } catch (e) {
      const aborted = (e as { name?: string })?.name === 'AbortError' || ctl.signal.aborted
      lastError = aborted ? `timeout after ${timeoutMs} ms` : 'network error'
      retryable = true
    } finally {
      clearTimeout(timer)
    }
    if (retryable && !retried) {
      retried = true
      continue
    }
    return { ok: false, error: redact(lastError, key), attempts }
  }
}
