"use client";

import { useState, useRef, useCallback } from "react";

interface VideoThumbnailProps {
  src: string;
  className?: string;
  controls?: boolean;
}

export function VideoThumbnail({ src, className, controls = true }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [poster, setPoster] = useState<string>("");

  const capturePoster = useCallback(() => {
    const video = videoRef.current;
    if (!video || poster) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      if (dataUrl.length > 100) {
        setPoster(dataUrl);
      }
    } catch {
      // CORS or security error — skip poster
    }
  }, [poster]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      controls={controls}
      preload="metadata"
      poster={poster || undefined}
      onLoadedData={capturePoster}
    />
  );
}
