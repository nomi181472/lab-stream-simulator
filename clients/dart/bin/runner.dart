import 'dart:convert';
import 'dart:io';

class TestCaseResult {
  final String name;
  final String protocol;
  final String status;
  final double durationSeconds;
  final String description;
  final String? error;

  TestCaseResult({
    required this.name,
    required this.protocol,
    required this.status,
    required this.durationSeconds,
    required this.description,
    this.error,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'protocol': protocol,
    'status': status,
    'duration_seconds': durationSeconds,
    'description': description,
    if (error != null) 'error': error,
  };
}

const onvifDeviceUrl = 'http://127.0.0.1:8000/onvif/device_service';
const onvifMediaUrl = 'http://127.0.0.1:8000/onvif/media_service';
const rtspUrl = 'rtsp://127.0.0.1:8554/cameras/cam-001/main';
const rtmpUrl = 'rtmp://127.0.0.1:1935/cameras/cam-001/main';
const wsUrl = 'ws://127.0.0.1:8000/ws/cameras';

Future<TestCaseResult> testOnvifDeviceInformation() async {
  final sw = Stopwatch()..start();
  const name = 'test_onvif_device_information';
  const protocol = 'ONVIF';
  const desc = 'Validates ONVIF SOAP 1.2 GetDeviceInformation response';

  try {
    final client = HttpClient();
    final request = await client.postUrl(Uri.parse(onvifDeviceUrl));
    request.headers.contentType = ContentType.parse('application/soap+xml; charset=utf-8');

    const soap = '''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>''';

    request.write(soap);
    final response = await request.close().timeout(const Duration(seconds: 5));
    final body = await response.transform(utf8.decoder).join();
    client.close();

    if (response.statusCode != 200 || !body.contains('GetDeviceInformationResponse')) {
      throw Exception('Failed to receive valid GetDeviceInformationResponse: status ${response.statusCode}');
    }

    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'PASSED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
    );
  } catch (e) {
    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'FAILED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
      error: e.toString(),
    );
  }
}

Future<TestCaseResult> testOnvifMediaProfiles() async {
  final sw = Stopwatch()..start();
  const name = 'test_onvif_media_profiles';
  const protocol = 'ONVIF';
  const desc = 'Validates ONVIF GetProfiles and GetStreamUri RTSP resolution';

  try {
    final client = HttpClient();
    final reqProfiles = await client.postUrl(Uri.parse(onvifMediaUrl));
    reqProfiles.headers.contentType = ContentType.parse('application/soap+xml; charset=utf-8');

    const soapProfiles = '''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetProfiles/>
  </soap:Body>
</soap:Envelope>''';

    reqProfiles.write(soapProfiles);
    final respProfiles = await reqProfiles.close().timeout(const Duration(seconds: 5));
    final bodyProfiles = await respProfiles.transform(utf8.decoder).join();

    if (!bodyProfiles.contains('PROFILE_MAIN_001')) {
      throw Exception('Missing PROFILE_MAIN_001 token in GetProfiles');
    }

    // GetStreamUri
    final reqStream = await client.postUrl(Uri.parse(onvifMediaUrl));
    reqStream.headers.contentType = ContentType.parse('application/soap+xml; charset=utf-8');
    const soapStream = '''<?xml version="1.0" encoding="utf-8"?>
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
</soap:Envelope>''';

    reqStream.write(soapStream);
    final respStream = await reqStream.close().timeout(const Duration(seconds: 5));
    final bodyStream = await respStream.transform(utf8.decoder).join();
    client.close();

    if (!bodyStream.contains('rtsp://')) {
      throw Exception('Missing rtsp:// stream URI in GetStreamUri');
    }

    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'PASSED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
    );
  } catch (e) {
    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'FAILED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
      error: e.toString(),
    );
  }
}

Future<TestCaseResult> testRtspSocketHandshake() async {
  final sw = Stopwatch()..start();
  const name = 'test_rtsp_socket_handshake';
  const protocol = 'RTSP';
  const desc = 'Validates RTSP TCP socket handshake (OPTIONS & DESCRIBE) with SDP negotiation';

  try {
    final socket = await Socket.connect('127.0.0.1', 8554, timeout: const Duration(seconds: 5));
    
    // 1. Send OPTIONS
    const reqOptions = 'OPTIONS rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: StreamLab-Dart-Client\r\n\r\n';
    socket.write(reqOptions);
    await socket.flush();

    final buffer = StringBuffer();
    final sub = socket.listen((data) {
      buffer.write(utf8.decode(data, allowMalformed: true));
    });

    // Wait for OPTIONS response
    var waited = 0;
    while (!buffer.toString().contains('RTSP/1.0 200 OK') && !buffer.toString().contains('Public:') && waited < 30) {
      await Future.delayed(const Duration(milliseconds: 100));
      waited++;
    }

    // 2. Send DESCRIBE
    const reqDescribe = 'DESCRIBE rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 2\r\nAccept: application/sdp\r\nUser-Agent: StreamLab-Dart-Client\r\n\r\n';
    socket.write(reqDescribe);
    await socket.flush();

    waited = 0;
    while (!buffer.toString().contains('m=video') && waited < 30) {
      await Future.delayed(const Duration(milliseconds: 100));
      waited++;
    }

    await sub.cancel();
    socket.destroy();

    if (!buffer.toString().contains('m=video')) {
      throw Exception('SDP did not contain m=video track definition');
    }

    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'PASSED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
    );
  } catch (e) {
    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'FAILED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
      error: e.toString(),
    );
  }
}

Future<TestCaseResult> testRtspMediaProbe() async {
  final sw = Stopwatch()..start();
  const name = 'test_rtsp_media_probe';
  const protocol = 'RTSP';
  const desc = 'Decodes live RTSP video stream packets via FFprobe';

  try {
    final result = await Process.run('ffprobe', [
      '-v', 'error',
      '-rtsp_transport', 'tcp',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,codec_name',
      '-of', 'json',
      rtspUrl,
    ]).timeout(const Duration(seconds: 8));

    if (result.exitCode != 0 || !result.stdout.toString().contains('"codec_name": "h264"')) {
      throw Exception('RTSP video stream failed verification: ${result.stderr}');
    }

    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'PASSED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
    );
  } catch (e) {
    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'FAILED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
      error: e.toString(),
    );
  }
}

Future<TestCaseResult> testRtmpMediaProbe() async {
  final sw = Stopwatch()..start();
  const name = 'test_rtmp_media_probe';
  const protocol = 'RTMP';
  const desc = 'Inspects live RTMP video delivery stream via FFprobe';

  try {
    final result = await Process.run('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=format_name:stream=codec_name',
      '-of', 'json',
      rtmpUrl,
    ]).timeout(const Duration(seconds: 8));

    if (result.exitCode != 0 || !result.stdout.toString().contains('flv')) {
      throw Exception('RTMP stream format not FLV: ${result.stderr}');
    }

    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'PASSED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
    );
  } catch (e) {
    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'FAILED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
      error: e.toString(),
    );
  }
}

Future<TestCaseResult> testWebSocketTelemetry() async {
  final sw = Stopwatch()..start();
  const name = 'test_websocket_telemetry';
  const protocol = 'WebSocket';
  const desc = 'Establishes WebSocket session and exchanges telemetry messages';

  try {
    final ws = await WebSocket.connect(wsUrl).timeout(const Duration(seconds: 5));
    ws.add(jsonEncode({'type': 'ping', 'client': 'streamlab-dart-test'}));

    final msg = await ws.first.timeout(const Duration(seconds: 5));
    await ws.close();

    final data = jsonDecode(msg.toString());
    if (data['type'] == null) {
      throw Exception('Missing type field in WebSocket message');
    }

    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'PASSED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
    );
  } catch (e) {
    sw.stop();
    return TestCaseResult(
      name: name,
      protocol: protocol,
      status: 'FAILED',
      durationSeconds: sw.elapsedMilliseconds / 1000.0,
      description: desc,
      error: e.toString(),
    );
  }
}

void main() async {
  print('[StreamLab] Starting Dart Interoperability Test Suite...');
  final overallWatch = Stopwatch()..start();

  final results = [
    await testOnvifDeviceInformation(),
    await testOnvifMediaProfiles(),
    await testRtspSocketHandshake(),
    await testRtspMediaProbe(),
    await testRtmpMediaProbe(),
    await testWebSocketTelemetry(),
  ];

  overallWatch.stop();
  final passed = results.where((r) => r.status == 'PASSED').length;
  final failed = results.length - passed;
  final overallStatus = failed == 0 ? 'PASSED' : 'FAILED';
  final duration = overallWatch.elapsedMilliseconds / 1000.0;

  print('\n========================================');
  print('Dart Test Suite: $overallStatus ($passed/${results.length} passed in ${duration.toStringAsFixed(2)}s)');
  print('========================================\n');

  for (final r in results) {
    final symbol = r.status == 'PASSED' ? '✓' : '✗';
    print('  $symbol [${r.protocol}] ${r.name} (${r.durationSeconds.toStringAsFixed(2)}s)');
    if (r.error != null) print('      Error: ${r.error}');
  }

  final reportDir = Directory('${Directory.current.path}/../../integration-tests/reports');
  if (!reportDir.existsSync()) reportDir.createSync(recursive: true);
  final reportFile = File('${reportDir.path}/report_dart.json');

  final report = {
    'language': 'dart',
    'timestamp': DateTime.now().toUtc().toIso8601String(),
    'status': overallStatus,
    'total_tests': results.length,
    'passed_tests': passed,
    'failed_tests': failed,
    'duration_seconds': duration,
    'tests': results.map((r) => r.toJson()).toList(),
  };

  reportFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(report));
  print('\n[OK] Standardized Dart report saved to: ${reportFile.path}');

  if (failed > 0) exit(1);
}
