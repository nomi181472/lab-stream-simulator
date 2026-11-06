import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { execFile } from 'child_process';
import { WebSocket } from 'ws';

interface TestCaseResult {
  name: string;
  protocol: string;
  status: 'PASSED' | 'FAILED';
  duration_seconds: number;
  description: string;
  error?: string | null;
}

const BASE_URL = 'http://127.0.0.1:8000';
const ONVIF_DEVICE_URL = `${BASE_URL}/onvif/device_service`;
const ONVIF_MEDIA_URL = `${BASE_URL}/onvif/media_service`;
const RTSP_URL = 'rtsp://127.0.0.1:8554/cameras/cam-001/main';
const RTMP_URL = 'rtmp://127.0.0.1:1935/cameras/cam-001/main';
const WS_URL = 'ws://127.0.0.1:8000/ws/cameras';

async function testOnvifDeviceInformation(): Promise<TestCaseResult> {
  const start = Date.now();
  const name = 'test_onvif_device_information';
  const protocol = 'ONVIF';
  const description = 'Validates ONVIF SOAP 1.2 GetDeviceInformation response';

  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>`;

  try {
    const res = await fetch(ONVIF_DEVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body
    });

    if (!res.ok) throw new Error(`HTTP status: ${res.status}`);
    const xml = await res.text();
    if (!xml.includes('GetDeviceInformationResponse')) {
      throw new Error('Missing GetDeviceInformationResponse in body');
    }
    if (!xml.includes('Manufacturer')) {
      throw new Error('Missing Manufacturer element');
    }

    return {
      name,
      protocol,
      status: 'PASSED',
      duration_seconds: (Date.now() - start) / 1000,
      description
    };
  } catch (err: any) {
    return {
      name,
      protocol,
      status: 'FAILED',
      duration_seconds: (Date.now() - start) / 1000,
      description,
      error: err.message
    };
  }
}

async function testOnvifMediaProfiles(): Promise<TestCaseResult> {
  const start = Date.now();
  const name = 'test_onvif_media_profiles';
  const protocol = 'ONVIF';
  const description = 'Validates ONVIF SOAP 1.2 GetProfiles and GetStreamUri RTSP resolution';

  const bodyProfiles = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetProfiles/>
  </soap:Body>
</soap:Envelope>`;

  try {
    const res = await fetch(ONVIF_MEDIA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: bodyProfiles
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml.includes('GetProfilesResponse') || !xml.includes('PROFILE_MAIN_001')) {
      throw new Error('Failed to resolve profile token PROFILE_MAIN_001');
    }

    const bodyStream = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
               xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Body>
    <trt:GetStreamUri>
      <trt:StreamSetup>
        <tt:Stream>RTP-Unicast</tt:Stream>
        <tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport>
      </trt:StreamSetup>
      <trt:ProfileToken>PROFILE_MAIN_001</trt:ProfileToken>
    </trt:GetStreamUri>
  </soap:Body>
</soap:Envelope>`;

    const resStream = await fetch(ONVIF_MEDIA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: bodyStream
    });
    const streamXml = await resStream.text();
    if (!streamXml.includes('rtsp://')) {
      throw new Error('GetStreamUri did not return valid rtsp:// URL');
    }

    return {
      name,
      protocol,
      status: 'PASSED',
      duration_seconds: (Date.now() - start) / 1000,
      description
    };
  } catch (err: any) {
    return {
      name,
      protocol,
      status: 'FAILED',
      duration_seconds: (Date.now() - start) / 1000,
      description,
      error: err.message
    };
  }
}

async function testRtspSocketHandshake(): Promise<TestCaseResult> {
  const start = Date.now();
  const name = 'test_rtsp_socket_handshake';
  const protocol = 'RTSP';
  const description = 'Validates RTSP TCP socket handshake (OPTIONS & DESCRIBE) with SDP negotiation';

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let stage = 0;
    let sdpData = '';

    socket.setTimeout(5000);

    socket.connect(8554, '127.0.0.1', () => {
      // Step 1: OPTIONS
      socket.write(
        'OPTIONS rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\n' +
        'CSeq: 1\r\n' +
        'User-Agent: StreamLab-Node-Client\r\n\r\n'
      );
      stage = 1;
    });

    socket.on('data', (data) => {
      const resp = data.toString('utf-8');
      if (stage === 1) {
        if (!resp.includes('200 OK') && !resp.includes('Public:')) {
          socket.destroy();
          return resolve({
            name, protocol, status: 'FAILED',
            duration_seconds: (Date.now() - start) / 1000,
            description,
            error: `OPTIONS returned invalid response: ${resp.slice(0, 100)}`
          });
        }
        // Step 2: DESCRIBE
        socket.write(
          'DESCRIBE rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\n' +
          'CSeq: 2\r\n' +
          'Accept: application/sdp\r\n' +
          'User-Agent: StreamLab-Node-Client\r\n\r\n'
        );
        stage = 2;
      } else if (stage === 2) {
        sdpData += resp;
        if (sdpData.includes('m=video')) {
          socket.end();
          return resolve({
            name, protocol, status: 'PASSED',
            duration_seconds: (Date.now() - start) / 1000,
            description
          });
        }
      }
    });

    socket.on('error', (err) => {
      resolve({
        name, protocol, status: 'FAILED',
        duration_seconds: (Date.now() - start) / 1000,
        description,
        error: err.message
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        name, protocol, status: 'FAILED',
        duration_seconds: (Date.now() - start) / 1000,
        description,
        error: 'RTSP TCP connection timed out after 5000ms'
      });
    });
  });
}

function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', args, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      resolve(stdout);
    });
  });
}

async function testRtspMediaProbe(): Promise<TestCaseResult> {
  const start = Date.now();
  const name = 'test_rtsp_media_probe';
  const protocol = 'RTSP';
  const description = 'Decodes live RTSP video stream packets via FFprobe';

  try {
    const stdout = await runFfprobe([
      '-v', 'error',
      '-rtsp_transport', 'tcp',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,codec_name',
      '-of', 'json',
      RTSP_URL
    ]);
    const info = JSON.parse(stdout);
    const stream = info.streams?.[0];
    if (!stream || stream.codec_name !== 'h264') {
      throw new Error(`Invalid video stream or codec: ${JSON.stringify(stream)}`);
    }

    return {
      name, protocol, status: 'PASSED',
      duration_seconds: (Date.now() - start) / 1000,
      description
    };
  } catch (err: any) {
    return {
      name, protocol, status: 'FAILED',
      duration_seconds: (Date.now() - start) / 1000,
      description,
      error: err.message
    };
  }
}

async function testRtmpMediaProbe(): Promise<TestCaseResult> {
  const start = Date.now();
  const name = 'test_rtmp_media_probe';
  const protocol = 'RTMP';
  const description = 'Inspects live RTMP video delivery stream via FFprobe';

  try {
    const stdout = await runFfprobe([
      '-v', 'error',
      '-show_entries', 'format=format_name:stream=codec_name',
      '-of', 'json',
      RTMP_URL
    ]);
    const info = JSON.parse(stdout);
    if (!info.format?.format_name?.includes('flv')) {
      throw new Error(`Format not flv: ${info.format?.format_name}`);
    }

    return {
      name, protocol, status: 'PASSED',
      duration_seconds: (Date.now() - start) / 1000,
      description
    };
  } catch (err: any) {
    return {
      name, protocol, status: 'FAILED',
      duration_seconds: (Date.now() - start) / 1000,
      description,
      error: err.message
    };
  }
}

async function testWebSocketTelemetry(): Promise<TestCaseResult> {
  const start = Date.now();
  const name = 'test_websocket_telemetry';
  const protocol = 'WebSocket';
  const description = 'Establishes WebSocket session and exchanges telemetry messages';

  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (err: any) {
      return resolve({
        name, protocol, status: 'FAILED',
        duration_seconds: (Date.now() - start) / 1000,
        description,
        error: err.message
      });
    }

    const timer = setTimeout(() => {
      ws.terminate();
      resolve({
        name, protocol, status: 'FAILED',
        duration_seconds: (Date.now() - start) / 1000,
        description,
        error: 'WebSocket timed out waiting for event response'
      });
    }, 5000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'ping', client: 'streamlab-node-test' }));
    });

    ws.on('message', (msgData) => {
      clearTimeout(timer);
      try {
        const payload = JSON.parse(msgData.toString());
        if (!payload.type) throw new Error('Missing event type in WS message');
        ws.close();
        resolve({
          name, protocol, status: 'PASSED',
          duration_seconds: (Date.now() - start) / 1000,
          description
        });
      } catch (err: any) {
        ws.close();
        resolve({
          name, protocol, status: 'FAILED',
          duration_seconds: (Date.now() - start) / 1000,
          description,
          error: `Malformed JSON: ${err.message}`
        });
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        name, protocol, status: 'FAILED',
        duration_seconds: (Date.now() - start) / 1000,
        description,
        error: err.message
      });
    });
  });
}

async function main() {
  console.log('[StreamLab] Starting Node.js / TypeScript Interoperability Test Suite...');
  const overallStart = Date.now();

  const results: TestCaseResult[] = [];
  results.push(await testOnvifDeviceInformation());
  results.push(await testOnvifMediaProfiles());
  results.push(await testRtspSocketHandshake());
  results.push(await testRtspMediaProbe());
  results.push(await testRtmpMediaProbe());
  results.push(await testWebSocketTelemetry());

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const overallStatus = failed === 0 ? 'PASSED' : 'FAILED';
  const duration = (Date.now() - overallStart) / 1000;

  console.log(`\n========================================`);
  console.log(`Node.js Test Suite: ${overallStatus}`);
  console.log(`Passed: ${passed}/${total} in ${duration.toFixed(2)}s`);
  console.log(`========================================\n`);

  for (const r of results) {
    const symbol = r.status === 'PASSED' ? '✓' : '✗';
    console.log(`  ${symbol} [${r.protocol}] ${r.name} (${r.duration_seconds.toFixed(2)}s)`);
    if (r.error) console.log(`      Error: ${r.error}`);
  }

  const reportDir = path.resolve(__dirname, '../../../integration-tests/reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'report_node.json');

  const report = {
    language: 'node',
    timestamp: new Date().toISOString(),
    status: overallStatus,
    total_tests: total,
    passed_tests: passed,
    failed_tests: failed,
    duration_seconds: duration,
    tests: results
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[OK] Standardized Node.js report saved to: ${reportPath}`);

  if (overallStatus !== 'PASSED') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
