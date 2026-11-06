import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://streamlab.dev";
const siteTitle = "StreamLab | Multi-Protocol Virtual IP Camera Simulator & ONVIF Compliance Lab";
const siteDescription =
  "Enterprise-grade virtual IP camera simulator, streaming testbed, and ONVIF Profile S compliance lab. Stream real RTSP, RTMP, WebRTC, HLS, browser MJPEG, and WS-Discovery feeds with continuous looping, surveillance timestamp burn-in, and zero mock packets.";

export const viewport: Viewport = {
  themeColor: "#050811",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | StreamLab Virtual IP Camera Simulator",
  },
  description: siteDescription,
  keywords: [
    "Virtual IP Camera Simulator",
    "RTSP Test Server",
    "ONVIF Profile S Compliance Lab",
    "Mock IP Camera Software",
    "Video Streaming Testbed",
    "WS-Discovery UDP Simulator",
    "RTMP Ingest and Egress",
    "Browser MJPEG Stream",
    "MediaMTX FFmpeg Pipeline",
    "Computer Vision Stream Testing",
    "NVR Load Testing",
    "Surveillance Wall Clock Overlay",
    "YOLO RTSP Testing",
    "OpenCV Video Stream Simulator",
    "Cross-Language IP Camera Client",
  ],
  authors: [{ name: "StreamLab Engineering", url: "https://github.com/nomi181472/lab-stream-simulator" }],
  creator: "StreamLab Team",
  publisher: "StreamLab",
  applicationName: "StreamLab",
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: "StreamLab",
    images: [
      {
        url: "/streamlab_marketing_demo.gif",
        width: 1200,
        height: 630,
        alt: "StreamLab Multi-Protocol Camera Simulator in Action",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/streamlab_marketing_demo.gif"],
    creator: "@streamlab",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // JSON-LD Structured Data Schema for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "StreamLab",
        "description": siteDescription,
        "publisher": {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "StreamLab",
        "url": siteUrl,
        "logo": `${siteUrl}/favicon.ico`,
        "sameAs": ["https://github.com/nomi181472/lab-stream-simulator"],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        "name": "StreamLab",
        "operatingSystem": "Windows 10, Windows 11, Linux, macOS, Docker",
        "applicationCategory": "DeveloperApplication",
        "applicationSubCategory": "Video Streaming & Protocol Testing Tool",
        "softwareVersion": "1.0.1",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
        "description":
          "Zero mock tolerance virtual IP camera simulator, RTSP/RTMP media testbed, and WSDL SOAP 1.2 ONVIF Profile S compliance lab built on FastAPI, Next.js, MediaMTX, and FFmpeg.",
        "downloadUrl": "https://github.com/nomi181472/lab-stream-simulator/releases",
        "license": "https://opensource.org/licenses/MIT",
        "featureList": [
          "RTSP 1.0 live streaming with TCP-interleaved and UDP RTP delivery",
          "ONVIF Profile S SOAP 1.2 compliance with WS-Discovery UDP 3702 multicast responder",
          "Real-time wall clock burnt into video frames monotonically advancing across loops",
          "Seamless persistent video looping without RTSP session disconnects",
          "Direct zero-plugin browser MJPEG video streaming",
          "RTMP live broadcast streaming and external publisher ingest",
          "WebRTC WHEP and HLS ultra-low latency browser playback",
          "Automated verification test suites in Python, TypeScript/Node.js, Go, Dart, C# .NET, and Kotlin",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is StreamLab and why is it called a zero-mock camera simulator?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "StreamLab is an enterprise-grade virtual IP camera simulator that guarantees Zero Mock Tolerance. Unlike mocks that return fake headers or pre-recorded dummy payloads, StreamLab spawns real FFmpeg encoding pipelines, serves live streams through a MediaMTX media server, delivers WSDL-compliant ONVIF SOAP 1.2 XML responses, and listens on UDP 3702 for genuine WS-Discovery multicast probes.",
            },
          },
          {
            "@type": "Question",
            "name": "How does StreamLab handle seamless video looping without RTSP client disconnects?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "StreamLab uses a custom continuous presentation timestamp (PTS) pipeline in FFmpeg coupled with MediaMTX stream session multiplexing. When a test video file reaches EOF, it loops continuously into the existing stream session with monotonically advancing timestamps. Downstream RTSP, RTMP, and WebRTC clients (like VLC, OpenCV, or NVR software) never receive a TEARDOWN or packet discontinuity.",
            },
          },
          {
            "@type": "Question",
            "name": "Can StreamLab be discovered automatically by NVRs and VMS software like Milestone or Shinobi?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. StreamLab features an integrated WS-Discovery UDP multicast daemon listening on 239.255.255.250:3702. When an NVR or ONVIF client broadcasts a Probe message on the local network, StreamLab replies with RFC-compliant ProbeMatch messages containing device UUIDs and endpoint URLs, allowing 1-click automatic discovery.",
            },
          },
          {
            "@type": "Question",
            "name": "What video transport protocols are supported by StreamLab?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "StreamLab natively supports RTSP 1.0 (TCP interleaved & UDP RTP), RTMP (egress and external publisher ingest), direct browser MJPEG streams (playable in any browser without plugins), WebRTC WHEP (sub-second browser playback), HLS (HTTP Live Streaming), and WebSocket binary JPEG streaming pipelines.",
            },
          },
          {
            "@type": "Question",
            "name": "How can I run StreamLab in CI/CD pipelines for automated computer vision testing?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "StreamLab provides official pre-built Docker containers (botonetics/streamlab-backend and botonetics/streamlab-frontend). You can run them via Docker Compose or directly in GitHub Actions runners to provide live RTSP feeds for automated computer vision inference tests with OpenCV, YOLO, or TensorRT.",
            },
          },
          {
            "@type": "Question",
            "name": "Which programming languages have verified client libraries in StreamLab?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "StreamLab includes dedicated end-to-end client verification test suites in six independent programming languages: Python (httpx, websockets, ffprobe), Node.js/TypeScript (ws, net, fetch), Go (net/http, net.Dial), Dart (dart:io), C#/.NET 10 (HttpClient, TcpClient), and Kotlin JVM (HttpClient, Socket).",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        {/* Inject structured schema metadata */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <meta name="theme-color" content="#050811" />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-background focus:font-bold focus:rounded-md"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
