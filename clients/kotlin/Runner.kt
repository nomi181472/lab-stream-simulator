package streamlab.client

import java.io.File
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.net.http.WebSocket
import java.time.Duration
import java.time.Instant
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CompletionStage
import java.util.concurrent.TimeUnit

data class TestCaseResult(
    val name: String,
    val protocol: String,
    val status: String,
    val duration_seconds: Double,
    val description: String,
    val error: String? = null
)

object KotlinClientRunner {
    private const val BASE_URL = "http://127.0.0.1:8000"
    private const val ONVIF_DEVICE_URL = "$BASE_URL/onvif/device_service"
    private const val ONVIF_MEDIA_URL = "$BASE_URL/onvif/media_service"
    private const val RTSP_URL = "rtsp://127.0.0.1:8554/cameras/cam-001/main"
    private const val RTMP_URL = "rtmp://127.0.0.1:1935/cameras/cam-001/main"
    private const val WS_URL = "ws://127.0.0.1:8000/ws/cameras"

    private val httpClient = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .connectTimeout(Duration.ofSeconds(5))
        .build()

    fun testOnvifDeviceInformation(): TestCaseResult {
        val start = System.currentTimeMillis()
        val name = "test_onvif_device_information"
        val protocol = "ONVIF"
        val desc = "Validates ONVIF SOAP 1.2 GetDeviceInformation response"

        return try {
            val soap = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>""".trimIndent()

            val req = HttpRequest.newBuilder()
                .uri(URI.create(ONVIF_DEVICE_URL))
                .header("Content-Type", "application/soap+xml; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(soap))
                .timeout(Duration.ofSeconds(5))
                .build()

            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            if (resp.statusCode() != 200 || !resp.body().contains("GetDeviceInformationResponse")) {
                throw RuntimeException("Invalid SOAP response or HTTP code: ${resp.statusCode()}")
            }

            TestCaseResult(name, protocol, "PASSED", (System.currentTimeMillis() - start) / 1000.0, desc)
        } catch (e: Exception) {
            TestCaseResult(name, protocol, "FAILED", (System.currentTimeMillis() - start) / 1000.0, desc, e.message)
        }
    }

    fun testOnvifMediaProfiles(): TestCaseResult {
        val start = System.currentTimeMillis()
        val name = "test_onvif_media_profiles"
        val protocol = "ONVIF"
        val desc = "Validates ONVIF GetProfiles and GetStreamUri RTSP resolution"

        return try {
            val soapProfiles = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetProfiles/>
  </soap:Body>
</soap:Envelope>""".trimIndent()

            val req = HttpRequest.newBuilder()
                .uri(URI.create(ONVIF_MEDIA_URL))
                .header("Content-Type", "application/soap+xml; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(soapProfiles))
                .timeout(Duration.ofSeconds(5))
                .build()

            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            if (!resp.body().contains("PROFILE_MAIN_001")) {
                throw RuntimeException("Profile PROFILE_MAIN_001 not returned")
            }

            // GetStreamUri
            val soapStream = """<?xml version="1.0" encoding="utf-8"?>
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
</soap:Envelope>""".trimIndent()

            val reqStream = HttpRequest.newBuilder()
                .uri(URI.create(ONVIF_MEDIA_URL))
                .header("Content-Type", "application/soap+xml; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(soapStream))
                .timeout(Duration.ofSeconds(5))
                .build()

            val respStream = httpClient.send(reqStream, HttpResponse.BodyHandlers.ofString())
            if (!respStream.body().contains("rtsp://")) {
                throw RuntimeException("GetStreamUri did not return RTSP URL")
            }

            TestCaseResult(name, protocol, "PASSED", (System.currentTimeMillis() - start) / 1000.0, desc)
        } catch (e: Exception) {
            TestCaseResult(name, protocol, "FAILED", (System.currentTimeMillis() - start) / 1000.0, desc, e.message)
        }
    }

    fun testRtspSocketHandshake(): TestCaseResult {
        val start = System.currentTimeMillis()
        val name = "test_rtsp_socket_handshake"
        val protocol = "RTSP"
        val desc = "Validates RTSP TCP socket handshake (OPTIONS & DESCRIBE) with SDP negotiation"

        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress("127.0.0.1", 8554), 5000)
                socket.soTimeout = 5000
                val out = socket.getOutputStream()
                val reader = socket.getInputStream().bufferedReader()

                // 1. OPTIONS
                val reqOptions = "OPTIONS rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: StreamLab-Kotlin-Client\r\n\r\n"
                out.write(reqOptions.toByteArray())
                out.flush()

                val line = reader.readLine()
                if (line == null || (!line.contains("200 OK") && !line.contains("RTSP/1.0"))) {
                    throw RuntimeException("OPTIONS handshake failed: $line")
                }

                // Consume remaining OPTIONS headers
                while (reader.readLine().isNotEmpty()) {}

                // 2. DESCRIBE
                val reqDescribe = "DESCRIBE rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 2\r\nAccept: application/sdp\r\nUser-Agent: StreamLab-Kotlin-Client\r\n\r\n"
                out.write(reqDescribe.toByteArray())
                out.flush()

                val sdpBuffer = StringBuilder()
                val charBuf = CharArray(2048)
                val readChars = reader.read(charBuf)
                if (readChars > 0) {
                    sdpBuffer.append(charBuf, 0, readChars)
                }

                if (!sdpBuffer.toString().contains("m=video")) {
                    throw RuntimeException("SDP payload does not contain m=video track")
                }
            }

            TestCaseResult(name, protocol, "PASSED", (System.currentTimeMillis() - start) / 1000.0, desc)
        } catch (e: Exception) {
            TestCaseResult(name, protocol, "FAILED", (System.currentTimeMillis() - start) / 1000.0, desc, e.message)
        }
    }

    fun testRtspMediaProbe(): TestCaseResult {
        val start = System.currentTimeMillis()
        val name = "test_rtsp_media_probe"
        val protocol = "RTSP"
        val desc = "Decodes live RTSP video stream packets via FFprobe"

        return try {
            val pb = ProcessBuilder("ffprobe", "-v", "error", "-rtsp_transport", "tcp", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name", "-of", "json", RTSP_URL)
            pb.redirectErrorStream(true)
            val proc = pb.start()
            val stdout = proc.inputStream.bufferedReader().readText()
            proc.waitFor(8, TimeUnit.SECONDS)

            if (!stdout.contains("\"codec_name\": \"h264\"")) {
                throw RuntimeException("ffprobe did not detect h264 video stream: $stdout")
            }

            TestCaseResult(name, protocol, "PASSED", (System.currentTimeMillis() - start) / 1000.0, desc)
        } catch (e: Exception) {
            TestCaseResult(name, protocol, "FAILED", (System.currentTimeMillis() - start) / 1000.0, desc, e.message)
        }
    }

    fun testRtmpMediaProbe(): TestCaseResult {
        val start = System.currentTimeMillis()
        val name = "test_rtmp_media_probe"
        val protocol = "RTMP"
        val desc = "Inspects live RTMP video delivery stream via FFprobe"

        return try {
            val pb = ProcessBuilder("ffprobe", "-v", "error", "-show_entries", "format=format_name:stream=codec_name", "-of", "json", RTMP_URL)
            pb.redirectErrorStream(true)
            val proc = pb.start()
            val stdout = proc.inputStream.bufferedReader().readText()
            proc.waitFor(8, TimeUnit.SECONDS)

            if (!stdout.contains("flv")) {
                throw RuntimeException("ffprobe did not detect flv format: $stdout")
            }

            TestCaseResult(name, protocol, "PASSED", (System.currentTimeMillis() - start) / 1000.0, desc)
        } catch (e: Exception) {
            TestCaseResult(name, protocol, "FAILED", (System.currentTimeMillis() - start) / 1000.0, desc, e.message)
        }
    }

    fun testWebSocketTelemetry(): TestCaseResult {
        val start = System.currentTimeMillis()
        val name = "test_websocket_telemetry"
        val protocol = "WebSocket"
        val desc = "Establishes WebSocket session and exchanges telemetry messages"

        return try {
            val receivedFuture = CompletableFuture<String>()
            val wsClient = HttpClient.newHttpClient()

            val ws = wsClient.newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .buildAsync(URI.create(WS_URL), object : WebSocket.Listener {
                    override fun onText(webSocket: WebSocket, data: CharSequence, last: Boolean): CompletionStage<*> {
                        receivedFuture.complete(data.toString())
                        return CompletableFuture.completedFuture(null)
                    }
                })
                .get(5, TimeUnit.SECONDS)

            ws.sendText("{\"type\":\"ping\",\"client\":\"streamlab-kotlin-test\"}", true)
            val msg = receivedFuture.get(5, TimeUnit.SECONDS)
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "Done")

            if (!msg.contains("\"type\"")) {
                throw RuntimeException("WebSocket message missing type: $msg")
            }

            TestCaseResult(name, protocol, "PASSED", (System.currentTimeMillis() - start) / 1000.0, desc)
        } catch (e: Exception) {
            TestCaseResult(name, protocol, "FAILED", (System.currentTimeMillis() - start) / 1000.0, desc, e.message)
        }
    }

    @JvmStatic
    fun main(args: Array<String>) {
        println("[StreamLab] Starting Kotlin JVM Interoperability Test Suite...")
        val overallStart = System.currentTimeMillis()

        val results = listOf(
            testOnvifDeviceInformation(),
            testOnvifMediaProfiles(),
            testRtspSocketHandshake(),
            testRtspMediaProbe(),
            testRtmpMediaProbe(),
            testWebSocketTelemetry()
        )

        val passed = results.count { it.status == "PASSED" }
        val failed = results.size - passed
        val overallStatus = if (failed == 0) "PASSED" else "FAILED"
        val duration = (System.currentTimeMillis() - overallStart) / 1000.0

        println("\n========================================")
        println("Kotlin Test Suite: $overallStatus ($passed/${results.size} passed in ${String.format("%.2fs", duration)}s)")
        println("========================================\n")

        results.forEach { r ->
            val symbol = if (r.status == "PASSED") "✓" else "✗"
            println("  $symbol [${r.protocol}] ${r.name} (${String.format("%.2fs", r.duration_seconds)})")
            if (r.error != null) println("      Error: ${r.error}")
        }

        val reportDir = File("../../integration-tests/reports")
        reportDir.mkdirs()
        val reportFile = File(reportDir, "report_kotlin.json")

        val testsJson = results.joinToString(",\n") { r ->
            val errField = if (r.error != null) ",\n      \"error\": \"${r.error.replace("\"", "\\\"")}\"" else ""
            """    {
      "name": "${r.name}",
      "protocol": "${r.protocol}",
      "status": "${r.status}",
      "duration_seconds": ${r.duration_seconds},
      "description": "${r.description}"$errField
    }"""
        }

        val reportJson = """{
  "language": "kotlin",
  "timestamp": "${Instant.now()}",
  "status": "$overallStatus",
  "total_tests": ${results.size},
  "passed_tests": $passed,
  "failed_tests": $failed,
  "duration_seconds": $duration,
  "tests": [
$testsJson
  ]
}"""

        reportFile.writeText(reportJson)
        println("\n[OK] Standardized Kotlin report saved to: ${reportFile.canonicalPath}")

        if (failed > 0) System.exit(1)
    }
}
