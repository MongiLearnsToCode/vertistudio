import worker from './worker.mjs';
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/_publish/'))
      return new Response('Publishing is not enabled.', { status: 404 });
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    return worker.fetch(request, env);
  },
};
