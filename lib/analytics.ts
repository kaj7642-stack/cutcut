export type AnalyticsEvent =
  | "page_view"
  | "upload_start"
  | "upload_complete"
  | "youtube_start"
  | "youtube_complete"
  | "clip_select"
  | "narration_generate"
  | "tts_generate"
  | "render_start"
  | "render_complete"
  | "share"
  | "stt_start"
  | "stt_complete"
  | "payment_start"
  | "payment_complete"
  | "signup"
  | "login";

export function trackEvent(event: AnalyticsEvent, data?: Record<string, string | number | boolean>) {
  try {
    const payload = {
      event,
      data,
      url: window.location.pathname,
      ts: Date.now(),
    };
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", JSON.stringify(payload));
    } else {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}
