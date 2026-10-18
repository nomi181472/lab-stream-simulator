# Security Policy & Hardening Guidelines: StreamLab

StreamLab provides a multi-protocol IP camera simulator and interoperability testing environment. While designed as a simulation and validation tool, production-grade security controls and hardening have been baked into all layers.

---

## 1. Zero-Trust Media Pipeline & Ingest Security

### 1.1 Path Traversal Protections
- All video file selections, fixture ingestions, and directory scans undergo strict path resolution:
  - Paths are resolved to their canonical, absolute representation using `Path.resolve()`.
  - The resolved path is checked using `.is_relative_to(STORAGE_ROOT)` to ensure no directory traversal (`../`) escapes permitted storage boundaries.
  - Direct symlink traversal outside designated roots is rejected with HTTP 403.

### 1.2 Server-Side Request Forgery (SSRF) Protections
- Ingesting video sources via HTTP/HTTPS triggers rigorous URL validation:
  - IP resolution checks: Local loopbacks (e.g. `127.0.0.1`, `localhost`, `::1`), link-local (`169.254.0.0/16`), and internal metadata addresses (e.g., AWS/GCP instance metadata `169.254.169.254`) are rejected unless explicitly allowed in development mode.
  - Scheme restrictions: Only `http://` and `https://` protocols are permitted; file schemes (`file://`), `gopher://`, and shell commands are blocked.

### 1.3 XML External Entity (XXE) & Billion Laughs Protections
- ONVIF SOAP requests and WS-Discovery envelopes are parsed strictly with `defusedxml.ElementTree`:
  - DTD processing is completely disabled.
  - External entity resolution is disabled to prevent local file inclusion (LFI) and out-of-band data exfiltration.
  - Maximum entity expansion depth is bounded to prevent Denial-of-Service (Billion Laughs attack).

---

## 2. Authentication & Credential Management

### 2.1 ONVIF WS-Security UsernameToken
StreamLab cameras support WS-Security `UsernameToken` authentication with password digest calculation:
$$\text{PasswordDigest} = \text{Base64}(\text{SHA1}(\text{Nonce} + \text{Created} + \text{Password}))$$
- **Nonce Replay Prevention**: Nonces are stored in an in-memory sliding cache; duplicate nonces within a 5-minute window are rejected.
- **Clock Drift Tolerance**: Timestamps (`Created`) are validated with a maximum allowed drift of $\pm 300$ seconds.

### 2.2 RTSP / RTMP Transport Security
- Camera endpoints can enforce Digest/Basic authentication policies mapped directly from camera records into MediaMTX configuration paths.

---

## 3. Subprocess & Resource Isolation

### 3.1 Bounded Process Supervisor
- Every FFmpeg process is managed through `SubprocessManager`:
  - Retries are bounded with exponential backoff (initial delay 1s, max delay 30s, max 5 consecutive retries).
  - Clean lifecycle teardown: Processes receive `SIGTERM` followed by a hard `SIGKILL` timeout after 3.0 seconds.
  - Monitored process groups prevent orphan `ffmpeg.exe` or `ffprobe.exe` processes upon backend termination.

### 3.2 WebSocket Backpressure Protection
- FastAPI WebSocket connections maintain an in-memory queue bounded to `maxsize=256`.
- Slow clients that fail to consume messages are safely dropped rather than exhausting server RAM.

---

## 4. Reporting Security Vulnerabilities

To report a vulnerability or security issue, please contact the maintainers with a detailed description, reproduction script, and affected version.
