import { useEffect, useRef } from 'react';

// Playback of the sample clip; zoom scales the video like a digital zoom.
export default function CameraView({ halted, zoom }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (halted) v.pause();
    else v.play().catch(() => {});
  }, [halted]);

  return (
    <div className="feed">
      <video
        ref={videoRef} src="/media/camera.mp4" autoPlay muted loop playsInline
        style={{ transform: `scale(${zoom})` }}
      />
    </div>
  );
}
