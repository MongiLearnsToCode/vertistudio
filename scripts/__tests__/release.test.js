import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, timingSafeEqual, webcrypto } from 'node:crypto';
import { collectRelease, publishRelease } from '../publish-release.mjs';
import { handleRequest } from '../cloudflare/worker.mjs';
import publicWorker from '../cloudflare/public-worker.mjs';
const directories = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});
async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verti-release-test-'));
  directories.push(directory);
  const name = 'verti-studio-0.1.0-x64.deb';
  const data = Buffer.from('installer');
  await fs.writeFile(path.join(directory, name), data);
  const sha = createHash('sha512').update(data).digest('base64');
  await fs.writeFile(
    path.join(directory, 'latest-linux.yml'),
    `version: 0.1.0\nfiles:\n  - url: ${name}\n    sha512: ${sha}\n    size: ${data.length}\npath: ${name}\nsha512: ${sha}\n`,
  );
  return { directory, name };
}
describe('Release publishing', () => {
  it('verifies installers and rewrites feeds to immutable versioned URLs', async () => {
    const { directory } = await fixture();
    const release = await collectRelease(directory, 'linux-x64', '0.1.0');
    expect(release.manifest).toContain('/releases/0.1.0/linux-x64/');
    expect(JSON.parse(release.release).sha256).toHaveLength(64);
  });
  it('does not promote an update if a referenced installer was modified or an upload fails', async () => {
    const { directory, name } = await fixture();
    await fs.writeFile(path.join(directory, name), 'corrupt');
    await expect(collectRelease(directory, 'linux-x64', '0.1.0')).rejects.toThrow('checksum');
    const valid = await fixture();
    const transport = {
      file: vi.fn(async () => {
        throw new Error('offline');
      }),
      data: vi.fn(),
    };
    await expect(publishRelease(valid.directory, 'linux-x64', '0.1.0', transport)).rejects.toThrow(
      'offline',
    );
    expect(transport.data).not.toHaveBeenCalled();
  });
  it('uploads complete artifacts before changing the public update feed', async () => {
    const { directory } = await fixture();
    const calls = [];
    await publishRelease(directory, 'linux-x64', '0.1.0', {
      file: async (key) => {
        calls.push(key);
      },
      data: async (key) => {
        calls.push(key);
      },
    });
    expect(calls[0]).toMatch(/^releases\/.+\.deb$/);
    expect(calls.at(-2)).toBe('updates/linux-x64/latest-linux.yml');
    expect(calls.at(-1)).toBe('updates/linux-x64/release.json');
  });
});
function object(text, range) {
  return {
    size: Buffer.byteLength(text),
    httpEtag: '"test"',
    range,
    body: new Response(text).body,
    text: async () => text,
    writeHttpMetadata: () => {},
  };
}
describe('Cloudflare downloads', () => {
  it('keeps the optional read-only entrypoint locked even if publishing credentials are present', async () => {
    const env = {
      PUBLISH_TOKEN: 'private-test-key',
      RELEASES: { put: vi.fn(), createMultipartUpload: vi.fn() },
    };
    const upload = await publicWorker.fetch(
      new Request('https://downloads.test/_publish/start?key=releases/0.1.0/linux-x64/app.deb', {
        method: 'POST',
        headers: { Authorization: 'Bearer private-test-key' },
      }),
      env,
    );
    expect(upload.status).toBe(404);
    expect(env.RELEASES.put).not.toHaveBeenCalled();
    expect(env.RELEASES.createMultipartUpload).not.toHaveBeenCalled();
  });

  it('does not offer a broken download for platforms without a release', async () => {
    const env = { RELEASES: { get: vi.fn(async () => null) } };
    const page = await handleRequest(new Request('https://downloads.test/'), env);
    expect(await page.text()).toContain('Not yet released');
    expect(
      (await handleRequest(new Request('https://downloads.test/download/mac-arm64'), env)).status,
    ).toBe(404);
  });
  it('serves update manifests without caching and supports download ranges and HEAD', async () => {
    const env = {
      RELEASES: {
        get: vi.fn(async () => object('hello')),
        head: vi.fn(async () => object('hello')),
      },
    };
    const response = await handleRequest(
      new Request('https://downloads.test/updates/linux-x64/latest-linux.yml'),
      env,
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    env.RELEASES.get.mockResolvedValueOnce({ ...object('he', { offset: 0, length: 2 }), size: 5 });
    const partial = await handleRequest(
      new Request('https://downloads.test/releases/0.1.0/linux-x64/app.deb', {
        headers: { Range: 'bytes=0-1' },
      }),
      env,
    );
    expect(partial.status).toBe(206);
    expect(partial.headers.get('Content-Range')).toBe('bytes 0-1/5');
    const head = await handleRequest(
      new Request('https://downloads.test/releases/0.1.0/linux-x64/app.deb', { method: 'HEAD' }),
      env,
    );
    expect(await head.text()).toBe('');
    expect(head.headers.get('Content-Length')).toBe('5');
  });
  it('restricts public reads to release files and authenticates every publishing request', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: webcrypto.subtle.digest.bind(webcrypto.subtle),
        timingSafeEqual: (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b)),
      },
    });
    const env = { PUBLISH_TOKEN: 'private-test-key', RELEASES: { put: vi.fn() } };
    expect(
      (await handleRequest(new Request('https://downloads.test/private/secrets'), env)).status,
    ).toBe(404);
    expect(
      (
        await handleRequest(
          new Request(
            'https://downloads.test/_publish/object?key=updates/linux-x64/latest-linux.yml',
            { method: 'PUT', body: 'fake' },
          ),
          env,
        )
      ).status,
    ).toBe(401);
    expect(env.RELEASES.put).not.toHaveBeenCalled();
  });
  it('permits authenticated multipart uploads and protects completed versioned files', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: webcrypto.subtle.digest.bind(webcrypto.subtle),
        timingSafeEqual: (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b)),
      },
    });
    const upload = {
      uploadPart: vi.fn(async () => ({ partNumber: 1, etag: 'part-hash' })),
      complete: vi.fn(),
    };
    const env = {
      PUBLISH_TOKEN: 'private-test-key',
      RELEASES: {
        head: vi.fn(async () => null),
        createMultipartUpload: vi.fn(async () => ({ uploadId: 'upload-id' })),
        resumeMultipartUpload: vi.fn(() => upload),
      },
    };
    const key = 'releases/0.1.0/linux-x64/app.deb';
    const request = (action, method, body) =>
      handleRequest(
        new Request(
          `https://downloads.test/_publish/${action}?key=${key}&uploadId=upload-id&partNumber=1`,
          { method, body, headers: { Authorization: 'Bearer private-test-key' } },
        ),
        env,
      );
    expect(await (await request('start', 'POST')).json()).toEqual({ uploadId: 'upload-id' });
    expect(await (await request('part', 'PUT', 'installer-part')).json()).toEqual({
      partNumber: 1,
      etag: 'part-hash',
    });
    const parts = [{ partNumber: 1, etag: 'part-hash' }];
    expect((await request('complete', 'POST', JSON.stringify(parts))).status).toBe(200);
    expect(upload.complete).toHaveBeenCalledWith(parts);
    env.RELEASES.head.mockResolvedValue({ size: 123 });
    expect((await request('complete', 'POST', JSON.stringify(parts))).status).toBe(409);
    expect(upload.complete).toHaveBeenCalledTimes(1);
    expect((await request('start', 'POST')).status).toBe(409);
  });
});
