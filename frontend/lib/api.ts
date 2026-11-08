import { Camera, TestRun, StreamStats, VideoSource, VideoSourceProbeResult } from "@/types";

export type { Camera, TestRun, StreamStats, VideoSource, VideoSourceProbeResult };

const API_BASE = "/api/v1";

function normalizeCameraUrls(cam: Camera): Camera {
  if (typeof window === "undefined") return cam;
  const currentHost = window.location.hostname;
  if (!currentHost) return cam;

  const replaceHost = (url?: string) => {
    if (!url) return url;
    return url.replace("://127.0.0.1:", `://${currentHost}:`).replace("://localhost:", `://${currentHost}:`);
  };

  return {
    ...cam,
    rtsp_url: replaceHost(cam.rtsp_url) || cam.rtsp_url,
    rtmp_url: replaceHost(cam.rtmp_url) || cam.rtmp_url,
    snapshot_url: replaceHost(cam.snapshot_url) || cam.snapshot_url,
    hls_url: replaceHost(cam.hls_url) || cam.hls_url,
    webrtc_url: replaceHost(cam.webrtc_url) || cam.webrtc_url,
  };
}

export async function fetchCameras(): Promise<Camera[]> {
  const res = await fetch(`${API_BASE}/cameras`);
  if (!res.ok) throw new Error("Failed to fetch cameras");
  const data: Camera[] = await res.json();
  return data.map(normalizeCameraUrls);
}
export const getCameras = fetchCameras;

export async function fetchCamera(id: string): Promise<Camera> {
  const res = await fetch(`${API_BASE}/cameras/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch camera ${id}`);
  const data: Camera = await res.json();
  return normalizeCameraUrls(data);
}
export const getCamera = fetchCamera;

export async function createCamera(data: Partial<Camera>): Promise<Camera> {
  const res = await fetch(`${API_BASE}/cameras`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create camera" }));
    throw new Error(err.detail || "Failed to create camera");
  }
  const created: Camera = await res.json();
  return normalizeCameraUrls(created);
}

export async function updateCamera(id: string, data: Partial<Camera>): Promise<Camera> {
  const res = await fetch(`${API_BASE}/cameras/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update camera" }));
    throw new Error(err.detail || "Failed to update camera");
  }
  const updated: Camera = await res.json();
  return normalizeCameraUrls(updated);
}

export async function startCamera(id: string): Promise<Camera> {
  const res = await fetch(`${API_BASE}/cameras/${id}/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to start camera");
  return res.json();
}

export async function stopCamera(id: string): Promise<Camera> {
  const res = await fetch(`${API_BASE}/cameras/${id}/stop`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to stop camera");
  return res.json();
}

export async function restartCamera(id: string): Promise<Camera> {
  const res = await fetch(`${API_BASE}/cameras/${id}/restart`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to restart camera");
  return res.json();
}

export async function deleteCamera(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cameras/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete camera");
}

export async function fetchVideoSources(): Promise<VideoSource[]> {
  const res = await fetch(`${API_BASE}/video-sources`);
  if (!res.ok) throw new Error("Failed to fetch video sources");
  return res.json();
}
export const getVideoSources = fetchVideoSources;

export async function scanVideoSources(directory?: string): Promise<VideoSource[]> {
  const url = directory && directory.trim()
    ? `${API_BASE}/video-sources/scan?directory=${encodeURIComponent(directory.trim())}`
    : `${API_BASE}/video-sources/scan`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to scan directory" }));
    throw new Error(err.detail || "Failed to scan directory");
  }
  return res.json();
}

export async function uploadVideoSource(file: File): Promise<VideoSource> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/video-sources/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to upload video file" }));
    throw new Error(err.detail || "Failed to upload video file");
  }
  return res.json();
}

export async function probeVideoSource(pathOrUrl: string): Promise<VideoSourceProbeResult> {
  const res = await fetch(`${API_BASE}/video-sources/probe?path_or_url=${encodeURIComponent(pathOrUrl)}`);
  if (!res.ok) throw new Error("Failed to probe video source");
  return res.json();
}

export async function fetchRTSPStats(): Promise<any> {
  const res = await fetch(`${API_BASE}/rtsp/stats`);
  if (!res.ok) throw new Error("Failed to fetch RTSP statistics");
  return res.json();
}
export const getRtspStats = fetchRTSPStats;

export async function fetchRTMPStats(): Promise<any> {
  const res = await fetch(`${API_BASE}/rtmp/stats`);
  if (!res.ok) throw new Error("Failed to fetch RTMP statistics");
  return res.json();
}
export const getRtmpStats = fetchRTMPStats;

export async function fetchTestRuns(): Promise<TestRun[]> {
  const res = await fetch(`${API_BASE}/test-runs`);
  if (!res.ok) throw new Error("Failed to fetch test runs");
  return res.json();
}
export const getTestRuns = fetchTestRuns;

export async function getTestRun(id: string): Promise<TestRun> {
  const res = await fetch(`${API_BASE}/test-runs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch test run ${id}`);
  return res.json();
}

export async function createTestRun(targetLanguage: string): Promise<TestRun> {
  const res = await fetch(`${API_BASE}/test-runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_language: targetLanguage }),
  });
  if (!res.ok) throw new Error("Failed to trigger test run");
  return res.json();
}

export async function runTest(params: { language: string; protocol?: string; camera_id?: string }): Promise<TestRun> {
  return createTestRun(params.language);
}

export async function fetchHealth(): Promise<{ ready: boolean; checks: Record<string, boolean> }> {
  const res = await fetch("/readyz");
  return res.json();
}

export async function getHealthz(): Promise<{ status: string }> {
  const res = await fetch("/healthz");
  if (!res.ok) throw new Error("Liveness probe failed");
  return res.json();
}

export async function getReadyz(): Promise<any> {
  const res = await fetch("/readyz");
  if (!res.ok) throw new Error("Readiness probe failed");
  return res.json();
}

export async function sendOnvifSoap(endpoint: "device_service" | "media_service", soapAction: string, xmlPayload: string): Promise<string> {
  const res = await fetch(`/onvif/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8",
      SOAPAction: soapAction,
    },
    body: xmlPayload,
  });
  return res.text();
}
