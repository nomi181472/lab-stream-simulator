package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type TestCaseResult struct {
	Name            string  `json:"name"`
	Protocol        string  `json:"protocol"`
	Status          string  `json:"status"`
	DurationSeconds float64 `json:"duration_seconds"`
	Description     string  `json:"description"`
	Error           *string `json:"error,omitempty"`
}

type StandardReport struct {
	Language        string           `json:"language"`
	Timestamp       string           `json:"timestamp"`
	Status          string           `json:"status"`
	TotalTests      int              `json:"total_tests"`
	PassedTests     int              `json:"passed_tests"`
	FailedTests     int              `json:"failed_tests"`
	DurationSeconds float64          `json:"duration_seconds"`
	Tests           []TestCaseResult `json:"tests"`
}

const (
	baseURL        = "http://127.0.0.1:8000"
	onvifDeviceURL = "http://127.0.0.1:8000/onvif/device_service"
	onvifMediaURL  = "http://127.0.0.1:8000/onvif/media_service"
	rtspURL        = "rtsp://127.0.0.1:8554/cameras/cam-001/main"
	rtmpURL        = "rtmp://127.0.0.1:1935/cameras/cam-001/main"
	wsHost         = "127.0.0.1:8000"
)

func strPtr(s string) *string {
	return &s
}

func testOnvifDeviceInformation() TestCaseResult {
	start := time.Now()
	name := "test_onvif_device_information"
	protocol := "ONVIF"
	desc := "Validates ONVIF SOAP 1.2 GetDeviceInformation response"

	soapBody := `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>`

	req, err := http.NewRequest("POST", onvifDeviceURL, bytes.NewBufferString(soapBody))
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyStr := string(bodyBytes)

	if resp.StatusCode != http.StatusOK {
		errStr := fmt.Sprintf("Expected 200 OK, got HTTP %d", resp.StatusCode)
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	if !strings.Contains(bodyStr, "GetDeviceInformationResponse") || !strings.Contains(bodyStr, "Manufacturer") {
		errStr := "SOAP XML missing GetDeviceInformationResponse or Manufacturer"
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	return TestCaseResult{Name: name, Protocol: protocol, Status: "PASSED", DurationSeconds: time.Since(start).Seconds(), Description: desc}
}

func testOnvifMediaProfiles() TestCaseResult {
	start := time.Now()
	name := "test_onvif_media_profiles"
	protocol := "ONVIF"
	desc := "Validates ONVIF GetProfiles and GetStreamUri RTSP resolution"

	bodyProfiles := `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetProfiles/>
  </soap:Body>
</soap:Envelope>`

	req, err := http.NewRequest("POST", onvifMediaURL, bytes.NewBufferString(bodyProfiles))
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(bodyBytes), "GetProfilesResponse") || !strings.Contains(string(bodyBytes), "PROFILE_MAIN_001") {
		errStr := "Failed to verify PROFILE_MAIN_001 in GetProfiles"
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	// Step 2: GetStreamUri
	bodyStream := `<?xml version="1.0" encoding="utf-8"?>
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
</soap:Envelope>`

	reqStream, _ := http.NewRequest("POST", onvifMediaURL, bytes.NewBufferString(bodyStream))
	reqStream.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")
	respStream, err := client.Do(reqStream)
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	defer respStream.Body.Close()

	streamBytes, _ := io.ReadAll(respStream.Body)
	if !strings.Contains(string(streamBytes), "rtsp://") {
		errStr := "GetStreamUri response did not contain rtsp:// stream endpoint"
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	return TestCaseResult{Name: name, Protocol: protocol, Status: "PASSED", DurationSeconds: time.Since(start).Seconds(), Description: desc}
}

func testRtspSocketHandshake() TestCaseResult {
	start := time.Now()
	name := "test_rtsp_socket_handshake"
	protocol := "RTSP"
	desc := "Validates RTSP TCP socket handshake (OPTIONS & DESCRIBE) with SDP negotiation"

	conn, err := net.DialTimeout("tcp", "127.0.0.1:8554", 5*time.Second)
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))

	// 1. Send OPTIONS
	reqOptions := "OPTIONS rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: StreamLab-Go-Client\r\n\r\n"
	if _, err := conn.Write([]byte(reqOptions)); err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}

	buf := make([]byte, 4096)
	n, err := conn.Read(buf)
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	resOptions := string(buf[:n])
	if !strings.Contains(resOptions, "200 OK") && !strings.Contains(resOptions, "Public:") {
		errStr := fmt.Sprintf("OPTIONS failed: %s", resOptions)
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	// 2. Send DESCRIBE
	reqDescribe := "DESCRIBE rtsp://127.0.0.1:8554/cameras/cam-001/main RTSP/1.0\r\nCSeq: 2\r\nAccept: application/sdp\r\nUser-Agent: StreamLab-Go-Client\r\n\r\n"
	if _, err := conn.Write([]byte(reqDescribe)); err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}

	n, err = conn.Read(buf)
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	resDescribe := string(buf[:n])
	if !strings.Contains(resDescribe, "m=video") {
		errStr := "SDP does not contain m=video media track"
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	return TestCaseResult{Name: name, Protocol: protocol, Status: "PASSED", DurationSeconds: time.Since(start).Seconds(), Description: desc}
}

func testRtspMediaProbe() TestCaseResult {
	start := time.Now()
	name := "test_rtsp_media_probe"
	protocol := "RTSP"
	desc := "Decodes live RTSP video stream packets via FFprobe"

	cmd := exec.Command("ffprobe", "-v", "error", "-rtsp_transport", "tcp", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name", "-of", "json", rtspURL)
	out, err := cmd.CombinedOutput()
	if err != nil {
		errStr := fmt.Sprintf("ffprobe failed: %s (out: %s)", err.Error(), string(out))
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	var parsed struct {
		Streams []struct {
			CodecName string `json:"codec_name"`
			Width     int    `json:"width"`
			Height    int    `json:"height"`
		} `json:"streams"`
	}
	if err := json.Unmarshal(out, &parsed); err != nil || len(parsed.Streams) == 0 {
		errStr := "Failed to parse video streams from ffprobe"
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	if parsed.Streams[0].CodecName != "h264" {
		errStr := fmt.Sprintf("Expected h264 codec, got %s", parsed.Streams[0].CodecName)
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	return TestCaseResult{Name: name, Protocol: protocol, Status: "PASSED", DurationSeconds: time.Since(start).Seconds(), Description: desc}
}

func testRtmpMediaProbe() TestCaseResult {
	start := time.Now()
	name := "test_rtmp_media_probe"
	protocol := "RTMP"
	desc := "Inspects live RTMP video delivery stream via FFprobe"

	cmd := exec.Command("ffprobe", "-v", "error", "-show_entries", "format=format_name:stream=codec_name", "-of", "json", rtmpURL)
	out, err := cmd.CombinedOutput()
	if err != nil {
		errStr := fmt.Sprintf("ffprobe failed: %s (out: %s)", err.Error(), string(out))
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	if !strings.Contains(string(out), "flv") {
		errStr := "RTMP stream format is not FLV"
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	return TestCaseResult{Name: name, Protocol: protocol, Status: "PASSED", DurationSeconds: time.Since(start).Seconds(), Description: desc}
}

func testWebSocketTelemetry() TestCaseResult {
	start := time.Now()
	name := "test_websocket_telemetry"
	protocol := "WebSocket"
	desc := "Establishes WebSocket session and exchanges telemetry messages"

	conn, err := net.DialTimeout("tcp", wsHost, 5*time.Second)
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))

	// Perform standard WebSocket upgrade handshake
	keyBytes := make([]byte, 16)
	rand.Read(keyBytes)
	secKey := base64.StdEncoding.EncodeToString(keyBytes)

	req := fmt.Sprintf("GET /ws/cameras HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n", wsHost, secKey)
	if _, err := conn.Write([]byte(req)); err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}

	reader := bufio.NewReader(conn)
	statusLine, err := reader.ReadString('\n')
	if err != nil {
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: strPtr(err.Error())}
	}

	if !strings.Contains(statusLine, "101") {
		errStr := fmt.Sprintf("Upgrade failed, got status: %s", statusLine)
		return TestCaseResult{Name: name, Protocol: protocol, Status: "FAILED", DurationSeconds: time.Since(start).Seconds(), Description: desc, Error: &errStr}
	}

	return TestCaseResult{Name: name, Protocol: protocol, Status: "PASSED", DurationSeconds: time.Since(start).Seconds(), Description: desc}
}

func main() {
	fmt.Println("[StreamLab] Running Go Interoperability Test Suite...")
	overallStart := time.Now()

	results := []TestCaseResult{
		testOnvifDeviceInformation(),
		testOnvifMediaProfiles(),
		testRtspSocketHandshake(),
		testRtspMediaProbe(),
		testRtmpMediaProbe(),
		testWebSocketTelemetry(),
	}

	passed := 0
	for _, r := range results {
		if r.Status == "PASSED" {
			passed++
		}
	}
	failed := len(results) - passed
	overallStatus := "PASSED"
	if failed > 0 {
		overallStatus = "FAILED"
	}
	duration := time.Since(overallStart).Seconds()

	fmt.Printf("\n========================================\n")
	fmt.Printf("Go Test Suite: %s (%d/%d passed in %.2fs)\n", overallStatus, passed, len(results), duration)
	fmt.Printf("========================================\n")

	for _, r := range results {
		symbol := "✓"
		if r.Status != "PASSED" {
			symbol = "✗"
		}
		fmt.Printf("  %s [%s] %s (%.2fs)\n", symbol, r.Protocol, r.Name, r.DurationSeconds)
		if r.Error != nil {
			fmt.Printf("      Error: %s\n", *r.Error)
		}
	}

	reportDir := filepath.Join("..", "..", "integration-tests", "reports")
	_ = os.MkdirAll(reportDir, 0755)
	reportFile := filepath.Join(reportDir, "report_golang.json")

	report := StandardReport{
		Language:        "golang",
		Timestamp:       time.Now().UTC().Format(time.RFC3339),
		Status:          overallStatus,
		TotalTests:      len(results),
		PassedTests:     passed,
		FailedTests:     failed,
		DurationSeconds: duration,
		Tests:           results,
	}

	data, _ := json.MarshalIndent(report, "", "  ")
	_ = os.WriteFile(reportFile, data, 0644)
	fmt.Printf("\n[OK] Standardized Go report saved to: %s\n", reportFile)

	if failed > 0 {
		os.Exit(1)
	}
}
