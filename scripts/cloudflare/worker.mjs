import { publishRequest } from './publish-api.mjs';
const platforms = {
  'win-x64': ['Windows', 'Windows 10 or later · Intel / AMD 64-bit'],
  'mac-arm64': ['macOS · Apple Silicon', 'Apple M-series Macs'],
  'mac-x64': ['macOS · Intel', 'Intel Macs'],
  'linux-x64': ['Linux · Debian / Ubuntu', '64-bit .deb package'],
};
const safeFile = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;
const releasePath =
  /^releases\/\d+\.\d+\.\d+\/(win-x64|mac-arm64|mac-x64|linux-x64)\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
function headers(type, cache = 'no-store') {
  return new Headers({
    'Content-Type': type,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  });
}
async function current(bucket, platform) {
  const object = await bucket.get(`updates/${platform}/release.json`);
  if (!object) return null;
  if (object.size > 16384) throw new Error('Invalid release metadata size');
  const value = JSON.parse(await object.text());
  if (!/^\d+\.\d+\.\d+$/.test(value.version) || !safeFile.test(value.installer))
    throw new Error('Invalid release metadata');
  return value;
}
export async function handleRequest(request, env) {
  if (new URL(request.url).pathname.startsWith('/_publish/')) return publishRequest(request, env);
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const url = new URL(request.url);
  if (url.pathname === '/') {
    const cards = await Promise.all(
      Object.entries(platforms).map(async ([key, [name, detail]]) => {
        const release = await current(env.RELEASES, key);
        return `<article><h2>${name}</h2><p>${detail}</p>${release ? `<a href="/download/${key}">Download ${key.startsWith('mac') ? '.dmg' : key.startsWith('win') ? '.exe' : '.deb'}</a><small>Version ${escape(release.version)} · ${Math.ceil(release.size / 1048576)} MB</small><small>SHA-256: <code>${escape(release.sha256)}</code></small>` : '<span class="pending">Not yet released</span>'}</article>`;
      }),
    );
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Download Verti Studio</title><style>body{margin:0;background:#151518;color:#eee;font:16px system-ui,sans-serif}main{max-width:1000px;margin:8vh auto;padding:24px}h1{font-size:clamp(36px,6vw,64px);letter-spacing:-2px;margin:10px 0}p{color:#aaa;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px;margin:48px 0}article{padding:24px;border:1px solid #38383e;border-radius:12px}h2{font-size:20px}a{display:inline-block;background:#b9adff;color:#17131f;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600}small{display:block;color:#aaa;margin-top:16px;font-size:12px;overflow-wrap:anywhere}.pending{color:#aaa}footer{border-top:1px solid #38383e;padding-top:24px;color:#aaa;font-size:13px}</style><main><small>LOCAL VIDEO EDITING</small><h1>Make the cut.</h1><p>One source video. As many shorts as you want.<br>Download Verti Studio for your computer. Your footage stays on your device.</p><div class="grid">${cards.join('')}</div><footer>Full offline installers include the video tools. No account or internet connection is needed to edit and export. Internet is used to check for and download app updates. Automatic downloads are optional.<p>Windows and macOS releases are currently unsigned; your operating system may show a publisher warning. Automatic macOS installation requires an Apple-signed release.</p><p>Includes FFmpeg and FFprobe. Their licenses, build provenance, and source-access information are included with each release.</p></footer></main></html>`;
    return new Response(request.method === 'HEAD' ? null : html, {
      headers: headers('text/html; charset=utf-8'),
    });
  }
  const download = /^\/download\/(win-x64|mac-arm64|mac-x64|linux-x64)$/.exec(url.pathname);
  if (download) {
    const platform = download[1];
    const release = await current(env.RELEASES, platform);
    if (!release)
      return new Response('This platform has not been released yet.', {
        status: 404,
        headers: headers('text/plain'),
      });
    const target = `releases/${release.version}/${platform}/${release.installer}`;
    if (!(await env.RELEASES.head(target)))
      return new Response('Installer unavailable.', { status: 503 });
    return new Response(null, {
      status: 302,
      headers: { Location: `/${target}`, 'Cache-Control': 'no-store' },
    });
  }
  let key;
  try {
    key = decodeURIComponent(url.pathname.slice(1));
  } catch {
    return new Response('Invalid path', { status: 400 });
  }
  const manifest =
    /^updates\/(win-x64|mac-arm64|mac-x64|linux-x64)\/(latest(?:-mac|-linux)?\.yml|release\.json)$/.test(
      key,
    );
  if (!manifest && !releasePath.test(key)) return new Response('Not found', { status: 404 });
  const object =
    request.method === 'HEAD'
      ? await env.RELEASES.head(key)
      : await env.RELEASES.get(key, { range: request.headers });
  if (!object) return new Response('Not found', { status: 404, headers: headers('text/plain') });
  const result = headers(
    key.endsWith('.json')
      ? 'application/json'
      : key.endsWith('.yml')
        ? 'text/yaml'
        : 'application/octet-stream',
    manifest ? 'no-store' : 'public, max-age=31536000, immutable',
  );
  object.writeHttpMetadata(result);
  result.set('Cache-Control', manifest ? 'no-store' : 'public, max-age=31536000, immutable');
  result.set('ETag', object.httpEtag);
  result.set('Accept-Ranges', 'bytes');
  if (request.headers.get('If-None-Match') === object.httpEtag)
    return new Response(null, { status: 304, headers: result });
  let status = 200;
  if (object.range) {
    const offset = object.range.offset ?? object.size - object.range.suffix;
    const length = object.range.length ?? object.range.suffix ?? object.size - offset;
    result.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    result.set('Content-Length', String(length));
    status = 206;
  } else result.set('Content-Length', String(object.size));
  if (!manifest)
    result.set('Content-Disposition', `attachment; filename="${key.split('/').at(-1)}"`);
  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers: result });
}
export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error(JSON.stringify({ message: 'Release request failed', error: String(error) }));
      return new Response('Downloads are temporarily unavailable. Please try again.', {
        status: 503,
        headers: headers('text/plain'),
      });
    }
  },
};
