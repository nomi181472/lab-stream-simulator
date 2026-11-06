import { Camera, Github, Shield, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-surface-400 border-t border-border pt-16 pb-12 text-sm text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">StreamLab</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-semibold">
                v1.0.1
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-6">
              Enterprise-grade virtual IP camera simulator, streaming testbed, and ONVIF Profile S compliance lab. Built for zero-mock reliability with real FFmpeg pipelines and MediaMTX multiplexing.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/nomi181472/lab-stream-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-surface-200 border border-border flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                aria-label="GitHub Repository"
              >
                <Github className="w-4 h-4" />
              </a>
              <span className="text-xs text-slate-400 font-mono">MIT Licensed</span>
            </div>
          </div>

          {/* Protocols Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Protocols &amp; APIs
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#protocols" className="hover:text-primary transition-colors">
                  RTSP 1.0 (TCP &amp; UDP RTP)
                </a>
              </li>
              <li>
                <a href="#protocols" className="hover:text-primary transition-colors">
                  ONVIF Profile S (SOAP 1.2)
                </a>
              </li>
              <li>
                <a href="#protocols" className="hover:text-primary transition-colors">
                  WS-Discovery (UDP 3702)
                </a>
              </li>
              <li>
                <a href="#protocols" className="hover:text-primary transition-colors">
                  Direct Browser MJPEG
                </a>
              </li>
              <li>
                <a href="#protocols" className="hover:text-primary transition-colors">
                  RTMP Ingest &amp; Egress
                </a>
              </li>
              <li>
                <a href="#protocols" className="hover:text-primary transition-colors">
                  WebRTC WHEP &amp; HLS
                </a>
              </li>
            </ul>
          </div>

          {/* Client SDKs Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Client Ecosystem
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#sdks" className="hover:text-primary transition-colors">
                  Python (pytest / httpx)
                </a>
              </li>
              <li>
                <a href="#sdks" className="hover:text-primary transition-colors">
                  Node.js / TypeScript (ws)
                </a>
              </li>
              <li>
                <a href="#sdks" className="hover:text-primary transition-colors">
                  Go (net/http / net.Dial)
                </a>
              </li>
              <li>
                <a href="#sdks" className="hover:text-primary transition-colors">
                  Dart (dart:io)
                </a>
              </li>
              <li>
                <a href="#sdks" className="hover:text-primary transition-colors">
                  C# / .NET 10 (HttpClient)
                </a>
              </li>
              <li>
                <a href="#sdks" className="hover:text-primary transition-colors">
                  Kotlin JVM (Socket / HTTP)
                </a>
              </li>
            </ul>
          </div>

          {/* Resources & Open Source */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Project Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://github.com/nomi181472/lab-stream-simulator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  GitHub Source Code
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nomi181472/lab-stream-simulator/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Releases &amp; Binaries
                </a>
              </li>
              <li>
                <a
                  href="https://hub.docker.com/r/botonetics/streamlab-backend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Docker Hub Images
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nomi181472/lab-stream-simulator/blob/main/SECURITY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Security Policy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nomi181472/lab-stream-simulator/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  MIT License
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-500">
            &copy; {new Date().getFullYear()} StreamLab Project. Developed by Botonetics. Released under the MIT License.
          </p>
          <div className="flex items-center gap-6 text-slate-400">
            <span>FastAPI</span>
            <span>•</span>
            <span>Next.js</span>
            <span>•</span>
            <span>MediaMTX</span>
            <span>•</span>
            <span>FFmpeg</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
