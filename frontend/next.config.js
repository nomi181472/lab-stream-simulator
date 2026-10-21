/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    let backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST;
    if (!backendHost) {
      if (process.platform === "win32") {
        backendHost = "http://127.0.0.1:8000";
      } else {
        try {
          const { execSync } = require("child_process");
          const gw = execSync("ip route | awk '/default/ {print $3}'", { timeout: 1000, stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
          backendHost = gw ? `http://${gw}:8000` : "http://127.0.0.1:8000";
        } catch (e) {
          backendHost = "http://127.0.0.1:8000";
        }
      }
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backendHost}/api/:path*`,
      },
      {
        source: "/onvif/:path*",
        destination: `${backendHost}/onvif/:path*`,
      },
      {
        source: "/healthz",
        destination: `${backendHost}/healthz`,
      },
      {
        source: "/readyz",
        destination: `${backendHost}/readyz`,
      },
    ];
  },
};

module.exports = nextConfig;
