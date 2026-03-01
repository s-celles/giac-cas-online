# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest on `main` | Yes |
| Older commits | No |

## Architecture

CAScad is a **client-side only** web application. All computation, storage, and data handling occur entirely in the browser. There is no backend server, database, or user authentication system.

### Data Flow

- **Notebook data** is stored in-memory and optionally exported as local JSON files.
- **QR sharing** encodes notebook data in URL hash fragments (`#nb=`, `#nbe=`), which are never sent to an HTTP server.
- **Encrypted sharing** uses AES-256-GCM via the Web Crypto API with PBKDF2 key derivation (100,000 iterations).
- **P2P transfer** uses WebRTC data channels (DTLS-encrypted). Notebook data travels directly between browsers and never passes through the PeerJS signaling server. A 4-digit confirmation code provides visual anti-spoofing verification.

### External Services

| Service | Purpose | Data Exposed |
|---------|---------|-------------|
| PeerJS Cloud (`0.peerjs.com`) | WebRTC signaling relay | SDP offers/answers, ICE candidates (no notebook data) |
| Google STUN (`stun.l.google.com`) | NAT traversal | IP addresses (standard WebRTC behavior) |
| CDN libraries (esm.sh, jsdelivr, unpkg) | Dependency loading | Standard HTTP requests |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue.**
2. Email the maintainer directly at the address listed in the [GitHub profile](https://github.com/s-celles).
3. Include a clear description of the vulnerability, steps to reproduce, and potential impact.
4. Allow reasonable time for a fix before public disclosure.

## Scope

The following are considered **in scope**:

- XSS via notebook content (math cells, text cells, imported JSON)
- Data exfiltration through QR codes or P2P transfer
- Bypassing encrypted sharing (AES-GCM)
- Code injection through Giac evaluation
- Malicious notebook files that execute unintended operations on import

The following are **out of scope**:

- Vulnerabilities in upstream dependencies (MathLive, KaTeX, JSXGraph, PeerJS, Giac) — report these to the respective projects
- Attacks requiring physical access to the user's device
- Social engineering
- Denial of service against CDN providers

## Security Design Principles

1. **Client-side execution** — No server-side code; no data leaves the browser except through explicit user action (QR share, P2P transfer, file export).
2. **External notebook review** — Imported notebooks (via file, QR, or P2P) are validated before loading (`type === 'cascad-notebook'` and `Array.isArray(cells)`).
3. **Progressive enhancement** — Features like P2P transfer degrade gracefully when unavailable, without exposing error details.
4. **No eval of untrusted input** — Math expressions are processed through MathJSON/Giac pipelines, not raw `eval()`.
