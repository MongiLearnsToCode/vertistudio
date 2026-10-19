import { describe, expect, it } from 'vitest';
import { buildRequestParams, FALLBACK_BETA } from '../request-params';

describe('buildRequestParams', () => {
  it('uses the default model and sends effort + refusal fallback to models that accept them', () => {
    const p = buildRequestParams({ prompt: 'hi' }, 'claude-opus-5-5');
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.max_tokens).toBe(16000);
    expect(p.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(p.output_config).toEqual({ effort: 'medium' });
    expect(p.betas).toEqual([FALLBACK_BETA]);
    expect(p.fallbacks).toBe('default');
    expect('system' in p).toBe(false);
  });

  it('passes system, effort and maxTokens through', () => {
    const p = buildRequestParams(
      { prompt: 'hi', system: 'be brief', effort: 'low', maxTokens: 500 },
      'claude-sonnet-5-5',
    );
    expect(p.system).toBe('be brief');
    expect(p.output_config).toEqual({ effort: 'low' });
    expect(p.max_tokens).toBe(500);
  });

  it('leaves effort and fallbacks off for Haiku 4.5, which rejects them', () => {
    const p = buildRequestParams({ prompt: 'hi', model: 'claude-haiku-4-5' }, 'claude-opus-5-5');
    expect(p.model).toBe('claude-haiku-4-5');
    expect('output_config' in p).toBe(false);
    expect('fallbacks' in p).toBe(false);
    expect('betas' in p).toBe(false);
  });

  it('sends the plain request for a model id it does not know', () => {
    const p = buildRequestParams({ prompt: 'hi', model: 'some-future-model' }, 'claude-opus-5-5');
    expect(p.model).toBe('some-future-model');
    expect('output_config' in p).toBe(false);
    expect('fallbacks' in p).toBe(false);
  });
});
