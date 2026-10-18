using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace StreamLab.DotNetClient
{
    public class TestCaseResult
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("protocol")]
        public string Protocol { get; set; } = "";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "";

        [JsonPropertyName("duration_seconds")]
        public double DurationSeconds { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    public class StandardReport
    {
        [JsonPropertyName("language")]
        public string Language { get; set; } = "dotnet";

        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = "";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "";

        [JsonPropertyName("total_tests")]
        public int TotalTests { get; set; }

        [JsonPropertyName("passed_tests")]
        public int PassedTests { get; set; }

        [JsonPropertyName("failed_tests")]
        public int FailedTests { get; set; }

        [JsonPropertyName("duration_seconds")]
        public double DurationSeconds { get; set; }

        [JsonPropertyName("tests")]
        public List<TestCaseResult> Tests { get; set; } = new();
    }

    class Program
    {
        private static readonly HttpClient httpClient = new() { Timeout = TimeSpan.FromSeconds(5) };
        private const string OnvifDeviceUrl = "http://127.0.0.1:8000/onvif/device_service";
        private const string OnvifMediaUrl = "http://127.0.0.1:8000/onvif/media_service";
        private const string RtspUrl = "rtsp://127.0.0.1:8554/cameras/cam-001/main";
        private const string RtmpUrl = "rtmp://127.0.0.1:1935/cameras/cam-001/main";
        private const string WsUrl = "ws://127.0.0.1:8000/ws/cameras";

        static async Task<int> Main(string[] args)
        {
            Console.WriteLine("[StreamLab] Starting C# / .NET Interoperability Test Suite...");
            var overallWatch = Stopwatch.StartNew();
            var results = new List<TestCaseResult>
            {
                await TestOnvifDeviceInformation(),
                await TestOnvifMediaProfiles(),
                await TestRtspSocketHandshake(),
                TestRtspMediaProbe(),
                TestRtmpMediaProbe(),
                await TestWebSocketTelemetry()
            };

            overallWatch.Stop();
            int passed = results.FindAll(r => r.Status == "PASSED").Count;
            int failed = results.Count - passed;
            string overallStatus = failed == 0 ? "PASSED" : "FAILED";
            double duration = overallWatch.Elapsed.TotalSeconds;

            Console.WriteLine($"\n========================================");
            Console.WriteLine($"C# / .NET Test Suite: {overallStatus} ({passed}/{results.Count} passed in {duration:F2}s)");
            Console.WriteLine($"========================================\n");

            foreach (var r in results)
            {
                string symbol = r.Status == "PASSED" ? "✓" : "✗";
                Console.WriteLine($"  {symbol} [{r.Protocol}] {r.Name} ({r.DurationSeconds:F2}s)");
                if (r.Error != null) Console.WriteLine($"      Error: {r.Error}");
            }

            var reportDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../integration-tests/reports"));
            Directory.CreateDirectory(reportDir);
            var reportPath = Path.Combine(reportDir, "report_dotnet.json");

            var report = new StandardReport
            {
                Language = "dotnet",
                Timestamp = DateTime.UtcNow.ToString("o"),
                Status = overallStatus,
                TotalTests = results.Count,
                PassedTests = passed,
                FailedTests = failed,
                DurationSeconds = duration,
                Tests = results
            };

            var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
            File.WriteAllText(reportPath, JsonSerializer.Serialize(report, jsonOptions));
            Console.WriteLine($"\n[OK] Standardized C# / .NET report saved to: {reportPath}");

            return failed > 0 ? 1 : 0;
        }

        static async Task<TestCaseResult> TestOnvifDeviceInformation()
        {
            var sw = Stopwatch.StartNew();
            string name = "test_onvif_device_information";
            string protocol = "ONVIF";
            string desc = "Validates ONVIF SOAP 1.2 GetDeviceInformation response";

            try
            {
                string soap = @"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:soap=""http://www.w3.org/2003/05/soap-envelope""
               xmlns:tds=""http://www.onvif.org/ver10/device/wsdl"">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>";

                var content = new StringContent(soap, Encoding.UTF8, "application/soap+xml");
                var res = await httpClient.PostAsync(OnvifDeviceUrl, content);
                var body = await res.Content.ReadAsStringAsync();

                if (!res.IsSuccessStatusCode) throw new Exception($"HTTP status {res.StatusCode}");
                if (!body.Contains("GetDeviceInformationResponse") || !body.Contains("Manufacturer"))
                    throw new Exception("Missing GetDeviceInformationResponse or Manufacturer in XML");

                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "PASSED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "FAILED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc, Error = ex.Message };
            }
        }

        static async Task<TestCaseResult> TestOnvifMediaProfiles()
        {
            var sw = Stopwatch.StartNew();
            string name = "test_onvif_media_profiles";
            string protocol = "ONVIF";
            string desc = "Validates ONVIF GetProfiles and GetStreamUri RTSP resolution";

            try
            {
                string soapProfiles = @"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:soap=""http://www.w3.org/2003/05/soap-envelope""
               xmlns:trt=""http://www.onvif.org/ver10/media/wsdl"">
  <soap:Body>
    <trt:GetProfiles/>
  </soap:Body>
</soap:Envelope>";

                var content = new StringContent(soapProfiles, Encoding.UTF8, "application/soap+xml");
                var res = await httpClient.PostAsync(OnvifMediaUrl, content);
                var body = await res.Content.ReadAsStringAsync();

                if (!body.Contains("GetProfilesResponse") || !body.Contains("PROFILE_MAIN_001"))
                    throw new Exception("Missing PROFILE_MAIN_001 in GetProfiles response");

                string soapStream = @"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:soap=""http://www.w3.org/2003/05/soap-envelope""
               xmlns:trt=""http://www.onvif.org/ver10/media/wsdl""
               xmlns:tt=""http://www.onvif.org/ver10/schema"">
  <soap:Body>
    <trt:GetStreamUri>
      <trt:StreamSetup>
        <tt:Stream>RTP-Unicast</tt:Stream>
        <tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport>
      </trt:StreamSetup>
      <trt:ProfileToken>PROFILE_MAIN_001</trt:ProfileToken>
    </trt:GetStreamUri>
  </soap:Body>
</soap:Envelope>";

                var streamContent = new StringContent(soapStream, Encoding.UTF8, "application/soap+xml");
                var resStream = await httpClient.PostAsync(OnvifMediaUrl, streamContent);
                var streamBody = await resStream.Content.ReadAsStringAsync();

                if (!streamBody.Contains("rtsp://"))
                    throw new Exception("Missing rtsp:// stream URI in GetStreamUri response");

                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "PASSED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "FAILED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc, Error = ex.Message };
            }
        }

        static async Task<TestCaseResult> TestRtspSocketHandshake()
        {
            var sw = Stopwatch.StartNew();
            string name = "test_rtsp_socket_handshake";
            string protocol = "RTSP";
            string desc = "Validates RTSP TCP socket handshake (OPTIONS & DESCRIBE) with SDP negotiation";

            try
            {
                using var tcp = new TcpClient();
                await tcp.ConnectAsync("127.0.0.1", 8554);
                using var stream = tcp.GetStream();
                stream.ReadTimeout = 5000;

                // 1. OPTIONS
                string reqOptions = "OPTIONS rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: StreamLab-DotNet-Client\r\n\r\n";
                byte[] optBytes = Encoding.UTF8.GetBytes(reqOptions);
                await stream.WriteAsync(optBytes);

                byte[] buffer = new byte[4096];
                int read = await stream.ReadAsync(buffer);
                string resOptions = Encoding.UTF8.GetString(buffer, 0, read);
                if (!resOptions.Contains("200 OK") && !resOptions.Contains("Public:"))
                    throw new Exception($"OPTIONS failed: {resOptions}");

                // 2. DESCRIBE
                string reqDescribe = "DESCRIBE rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 2\r\nAccept: application/sdp\r\nUser-Agent: StreamLab-DotNet-Client\r\n\r\n";
                byte[] descBytes = Encoding.UTF8.GetBytes(reqDescribe);
                await stream.WriteAsync(descBytes);

                read = await stream.ReadAsync(buffer);
                string resDescribe = Encoding.UTF8.GetString(buffer, 0, read);
                if (!resDescribe.Contains("m=video"))
                    throw new Exception("SDP missing m=video track");

                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "PASSED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "FAILED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc, Error = ex.Message };
            }
        }

        static TestCaseResult TestRtspMediaProbe()
        {
            var sw = Stopwatch.StartNew();
            string name = "test_rtsp_media_probe";
            string protocol = "RTSP";
            string desc = "Decodes live RTSP video stream packets via FFprobe";

            try
            {
                var psi = new ProcessStartInfo("ffprobe", $"-v error -rtsp_transport tcp -select_streams v:0 -show_entries stream=width,height,codec_name -of json {RtspUrl}")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false
                };
                using var proc = Process.Start(psi);
                string stdout = proc!.StandardOutput.ReadToEnd();
                proc.WaitForExit(8000);

                if (!stdout.Contains("\"codec_name\": \"h264\""))
                    throw new Exception($"H.264 video stream not found in ffprobe output: {stdout}");

                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "PASSED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "FAILED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc, Error = ex.Message };
            }
        }

        static TestCaseResult TestRtmpMediaProbe()
        {
            var sw = Stopwatch.StartNew();
            string name = "test_rtmp_media_probe";
            string protocol = "RTMP";
            string desc = "Inspects live RTMP video delivery stream via FFprobe";

            try
            {
                var psi = new ProcessStartInfo("ffprobe", $"-v error -show_entries format=format_name:stream=codec_name -of json {RtmpUrl}")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false
                };
                using var proc = Process.Start(psi);
                string stdout = proc!.StandardOutput.ReadToEnd();
                proc.WaitForExit(8000);

                if (!stdout.Contains("flv"))
                    throw new Exception($"FLV format not found in ffprobe output: {stdout}");

                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "PASSED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "FAILED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc, Error = ex.Message };
            }
        }

        static async Task<TestCaseResult> TestWebSocketTelemetry()
        {
            var sw = Stopwatch.StartNew();
            string name = "test_websocket_telemetry";
            string protocol = "WebSocket";
            string desc = "Establishes WebSocket session and exchanges telemetry messages";

            try
            {
                using var ws = new ClientWebSocket();
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await ws.ConnectAsync(new Uri(WsUrl), cts.Token);

                byte[] sendBytes = Encoding.UTF8.GetBytes("{\"type\":\"ping\",\"client\":\"streamlab-dotnet-test\"}");
                await ws.SendAsync(new ArraySegment<byte>(sendBytes), WebSocketMessageType.Text, true, cts.Token);

                byte[] recBuffer = new byte[4096];
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(recBuffer), cts.Token);
                string msg = Encoding.UTF8.GetString(recBuffer, 0, result.Count);

                if (!msg.Contains("\"type\""))
                    throw new Exception($"Invalid WebSocket message received: {msg}");

                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Done", CancellationToken.None);

                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "PASSED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new TestCaseResult { Name = name, Protocol = protocol, Status = "FAILED", DurationSeconds = sw.Elapsed.TotalSeconds, Description = desc, Error = ex.Message };
            }
        }
    }
}
