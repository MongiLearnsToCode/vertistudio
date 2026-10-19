import { protocol } from 'electron';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { videoService } from '../services/video/video-service';
import { mediaRange } from '../services/video/media-range';
import { logEngine } from '../../logging';
const log = logEngine.createLogger('VideoProtocol');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'verti-media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);
export function registerVideoProtocol(): void {
  protocol.handle('verti-media', async (request) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 });
      const url = new URL(request.url);
      if (url.hostname !== 'local' || !/^\/[0-9a-f-]{36}$/.test(url.pathname))
        return new Response(null, { status: 404 });
      const file = await videoService.resolveMedia(url.pathname.slice(1));
      const { size } = await stat(file);
      const header = request.headers.get('range');
      const range = mediaRange(header, size);
      if (!range)
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      const mime: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.m4v': 'video/mp4',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm',
        '.mkv': 'video/x-matroska',
      };
      const headers: Record<string, string> = {
        'Accept-Ranges': 'bytes',
        'Content-Type': mime[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': String(range.end - range.start + 1),
      };
      if (header) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
      const stream = request.method === 'HEAD' ? null : createReadStream(file, range);
      if (stream) {
        const abort = () => stream.destroy();
        request.signal.addEventListener('abort', abort, { once: true });
        stream.once('close', () => request.signal.removeEventListener('abort', abort));
      }
      return new Response(stream ? (Readable.toWeb(stream) as ReadableStream<Uint8Array>) : null, {
        status: header ? 206 : 200,
        headers,
      });
    } catch (error) {
      log.warn('Media request rejected', { error: String(error) });
      return new Response(null, { status: 404 });
    }
  });
}
