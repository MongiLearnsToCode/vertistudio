import { session } from 'electron';

// Production CSP — strict by default.
//
// Style policy uses the CSP Level 3 split:
//   style-src-elem 'self'       → blocks all inline <style> blocks (the
//                                 dangerous form: one injected <style> can
//                                 target the whole DOM via selectors).
//                                 External stylesheets must come from 'self'.
//   style-src-attr 'unsafe-inline' → permits inline `style="..."` attributes,
//                                 which React's `style={...}` JSX prop emits.
//                                 An attacker who injects a `style="..."`
//                                 attribute can only affect the element they
//                                 already injected — much smaller blast
//                                 radius than a stylesheet. CSS-based data
//                                 exfiltration via `background: url(...)` is
//                                 separately blocked by `connect-src 'self'`
//                                 and `img-src 'self' data:`.
//
// If you need inline <script> or <style>, prefer a nonce-based CSP rather
// than relaxing this policy.
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' verti-media:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

const DEV_CSP = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*",
  "style-src 'self' 'unsafe-inline' http://localhost:*",
  "img-src 'self' data: http://localhost:*",
  "font-src 'self' data: http://localhost:*",
  "connect-src 'self' http://localhost:* ws://localhost:*",
  "media-src 'self' verti-media:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function registerCSP(isProduction: boolean): void {
  const policy = isProduction ? PROD_CSP : DEV_CSP;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['Content-Security-Policy'] = [policy];
    callback({ responseHeaders });
  });
}
