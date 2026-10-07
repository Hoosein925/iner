import React, { useRef, useState, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  poster,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check if URL is Aparat or YouTube embed
  const isAparat = src.includes('aparat.com');
  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');

  // Convert Aparat standard link to embed URL
  const getAparatEmbedUrl = (url: string) => {
    if (url.includes('/video/video/embed/videohash/')) return url;
    const match = url.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://www.aparat.com/video/video/embed/videohash/${match[1]}/vt/frame`;
    }
    return url;
  };

  // Convert YouTube standard link to embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('/embed/')) return url;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const triggerControlsVisibility = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
    setControlsTimeout(timeout);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${mm}:${ss}`;
  };

  // If Aparat or YouTube iframe
  if (isAparat || isYouTube) {
    const embedSrc = isAparat ? getAparatEmbedUrl(src) : getYouTubeEmbedUrl(src);
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black border border-slate-700 ${className}`}>
        <iframe
          src={embedSrc}
          title={title || 'پخش ویدئو آموزشی'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerControlsVisibility}
      onTouchStart={triggerControlsVisibility}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border border-slate-800 select-none group ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onClick={handlePlayPause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Center Big Play Button (when paused) */}
      {!isPlaying && (
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform transform hover:scale-110 focus:outline-none"
          title="پخش ویدئو"
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* Video Title Bar */}
      {title && (
        <div
          className={`absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent text-white text-xs sm:text-sm font-bold flex items-center justify-between transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <span className="truncate">{title}</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">ویدئو آموزشی</span>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 p-2 sm:p-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-white transition-opacity duration-300 flex flex-col gap-1.5 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seek timeline */}
        <div className="flex items-center gap-2 w-full">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
          />
        </div>

        {/* Buttons and volume row */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="p-1 hover:text-indigo-400 focus:outline-none transition-colors"
              title={isPlaying ? 'توقف' : 'پخش'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Time display */}
            <span className="font-mono text-[11px] sm:text-xs text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button onClick={handleToggleMute} className="p-1 hover:text-indigo-400 transition-colors">
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Rate Dropdown */}
            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg text-[11px] font-mono">
              {[0.75, 1, 1.25, 1.5].map(rate => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    playbackRate === rate ? 'bg-indigo-600 text-white font-bold' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleToggleFullscreen}
              className="p-1 hover:text-indigo-400 focus:outline-none transition-colors"
              title={isFullscreen ? 'خروج از تمام صفحه' : 'تمام صفحه'}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
