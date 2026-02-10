/**
 * TokenMedia — renders token image or video.
 * If the URL is a video (.m3u8, .mp4, .webm), renders a <video> player.
 * Otherwise renders an <img>.
 */

const VIDEO_EXTENSIONS = /\.(m3u8|mp4|webm|ogg|mov)(\?|$)/i;
const HLS_EXTENSION = /\.m3u8(\?|$)/i;

interface TokenMediaProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function TokenMedia({ src, alt, className = "w-full h-full object-cover", fallback }: TokenMediaProps) {
  const isVideo = VIDEO_EXTENSIONS.test(src);
  const isHLS = HLS_EXTENSION.test(src);

  if (isVideo) {
    return (
      <video
        src={isHLS ? undefined : src}
        autoPlay
        loop
        muted
        playsInline
        className={className}
        onError={(e) => {
          (e.target as HTMLVideoElement).style.display = 'none';
        }}
        ref={(el) => {
          // HLS.js for .m3u8 support in non-Safari browsers
          if (el && isHLS) {
            if (el.canPlayType('application/vnd.apple.mpegurl')) {
              // Safari supports HLS natively
              el.src = src;
            } else {
              // Dynamically load HLS.js for other browsers
              import('hls.js').then(({ default: Hls }) => {
                if (Hls.isSupported()) {
                  const hls = new Hls({ enableWorker: false });
                  hls.loadSource(src);
                  hls.attachMedia(el);
                }
              }).catch(() => {
                // Fallback: try native playback anyway
                el.src = src;
              });
            }
          }
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
