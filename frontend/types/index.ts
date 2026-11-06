export interface StreamStats {
  camera_id?: string;
  path: string;
  readers_count?: number;
  reader_count?: number;
  bytes_received?: number;
  bytes_sent?: number;
  is_publishing?: boolean;
}

export interface Camera {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  firmware_version: string;
  hostname: string;
  video_source_id: string | null;
  playlist_mode: string;
  resolution?: string;
  resolution_width: number;
  resolution_height: number;
  fps: number;
  bitrate_kbps: number;
  video_codec: string;
  audio_codec: string;
  rtsp_path: string;
  rtmp_path: string;
  snapshot_path: string;
  auth_enabled: boolean;
  auth_required?: boolean;
  username: string;
  overlay_enabled: boolean;
  timestamp_overlay_enabled?: boolean;
  overlay_format: string;
  overlay_timezone: string;
  overlay_custom_text: string;
  overlay_font_size: number;
  overlay_font_color: string;
  overlay_bg_color: string;
  overlay_position: string;
  status: "stopped" | "starting" | "running" | "error" | "restarting" | string;
  uptime_seconds: number;
  restart_count: number;
  last_error: string;
  created_at: string;
  updated_at: string;
  rtsp_url: string;
  rtmp_url: string;
  snapshot_url: string;
  hls_url: string;
  webrtc_url: string;
  ws_stream_url?: string;
  profile_token?: string;
  rtsp_port?: number;
  is_enabled?: boolean;
  stats?: StreamStats;
}

export interface VideoSource {
  id: string;
  name: string;
  source_type: string;
  file_path: string;
  file_size_bytes: number;
  duration_sec: number;
  width: number;
  height: number;
  fps: number;
  video_codec: string;
  audio_codec: string;
  is_valid: boolean;
  created_at: string;
}

export interface VideoSourceProbeResult {
  valid: boolean;
  error?: string;
  width: number;
  height: number;
  fps: number;
  duration_sec: number;
  video_codec: string;
  audio_codec: string;
  file_size_bytes: number;
}

export interface TestResultItem {
  language: string;
  protocol: string;
  test_name: string;
  name?: string;
  status: "PASSED" | "FAILED" | "SKIPPED" | "UNSUPPORTED" | string;
  duration_ms?: number;
  duration_seconds?: number;
  error_message?: string;
  error?: string | null;
  description?: string;
  details?: Record<string, any>;
}

export interface TestRun {
  id: string;
  target_language?: string;
  language: string;
  protocol?: string;
  status: "pending" | "running" | "completed" | "failed" | "PASSED" | "FAILED" | "RUNNING" | string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests?: number;
  duration_ms?: number;
  duration_seconds: number;
  stdout_log?: string;
  stderr_log?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  results?: TestResultItem[];
}

export interface WebSocketEvent {
  type: string;
  version?: number;
  camera_id?: string;
  timestamp: string;
  data?: any;
  [key: string]: any;
}
