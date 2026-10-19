const keyPattern =
  /^(releases\/\d+\.\d+\.\d+\/(win-x64|mac-arm64|mac-x64|linux-x64)\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}|updates\/(win-x64|mac-arm64|mac-x64|linux-x64)\/(latest(?:-mac|-linux)?\.yml|release\.json))$/;
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function publishRequest(request, env) {
  if (!env.PUBLISH_TOKEN) return json({ error: 'Publishing not configured' }, 503);
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
    crypto.subtle.digest('SHA-256', encoder.encode(env.PUBLISH_TOKEN)),
  ]);
  if (!crypto.subtle.timingSafeEqual(a, b)) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);
  const key = url.searchParams.get('key') ?? '';
  if (!keyPattern.test(key)) return json({ error: 'Invalid release path' }, 400);
  const type = key.endsWith('.json')
    ? 'application/json'
    : key.endsWith('.yml')
      ? 'text/yaml'
      : 'application/octet-stream';
  const metadata = {
    contentType: type,
    cacheControl: key.startsWith('updates/') ? 'no-store' : 'public, max-age=31536000, immutable',
  };
  const action = url.pathname.slice('/_publish/'.length);
  if (action === 'object' && request.method === 'PUT') {
    if (key.startsWith('releases/') && (await env.RELEASES.head(key)))
      return json({ error: 'Release files are immutable; publish a new version.' }, 409);
    const object = await env.RELEASES.put(key, request.body, {
      httpMetadata: metadata,
      onlyIf: key.startsWith('releases/') ? { etagDoesNotMatch: '*' } : undefined,
    });
    return object ? json({ ok: true }) : json({ error: 'Object already exists' }, 409);
  }
  if (!key.startsWith('releases/'))
    return json({ error: 'Multipart upload requires a versioned release path' }, 400);
  if (action === 'start' && request.method === 'POST') {
    if (await env.RELEASES.head(key)) return json({ error: 'Release already exists' }, 409);
    const upload = await env.RELEASES.createMultipartUpload(key, { httpMetadata: metadata });
    return json({ uploadId: upload.uploadId });
  }
  const uploadId = url.searchParams.get('uploadId');
  if (!uploadId || uploadId.length > 1024) return json({ error: 'Missing upload ID' }, 400);
  const upload = env.RELEASES.resumeMultipartUpload(key, uploadId);
  if (action === 'part' && request.method === 'PUT') {
    const number = Number(url.searchParams.get('partNumber'));
    if (!Number.isInteger(number) || number < 1 || number > 10000 || !request.body)
      return json({ error: 'Invalid part' }, 400);
    return json(await upload.uploadPart(number, request.body));
  }
  if (action === 'complete' && request.method === 'POST') {
    if (Number(request.headers.get('Content-Length')) > 1048576)
      return json({ error: 'Metadata too large' }, 413);
    const parts = await request.json();
    if (
      !Array.isArray(parts) ||
      parts.length < 1 ||
      parts.length > 10000 ||
      parts.some(
        (p, i) => p.partNumber !== i + 1 || typeof p.etag !== 'string' || p.etag.length > 200,
      )
    )
      return json({ error: 'Invalid part list' }, 400);
    if (await env.RELEASES.head(key)) return json({ error: 'Release already exists' }, 409);
    await upload.complete(parts);
    return json({ ok: true });
  }
  if (action === 'abort' && request.method === 'DELETE') {
    await upload.abort();
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
}
