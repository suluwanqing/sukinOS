import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Disc3, RotateCcw } from 'lucide-react';
import style from '../style.module.css';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function AudioViewer({ src, name }) {
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    const curr = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(curr);
    setProgress(dur ? (curr / dur) * 100 : 0);
  };

  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value);
    const targetTime = (newProgress / 100) * duration;
    audioRef.current.currentTime = targetTime;
    setProgress(newProgress);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center w-full h-full select-none ${style.dotGrid}`}>
      <div className="flex flex-col items-center justify-center gap-6 p-8">
        <div className="relative flex items-center justify-center">
          <div className={`w-52 h-52 rounded-full border-8 border-white bg-gradient-to-tr from-slate-200 to-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex items-center justify-center ${style.spinAnimation} ${!isPlaying ? style.spinPaused : ''}`}>
            <Disc3 size={90} className="text-sky-500/70" />
            <div className="absolute w-10 h-10 rounded-full bg-white border-4 border-slate-100 shadow-inner" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-sm font-semibold text-slate-800 tracking-wide truncate max-w-xs">{name}</h3>
          <p className="text-[11px] text-slate-400 mt-1 font-mono tracking-wider">AUDIO ENGINE</p>
        </div>

        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[480px]">
        <div className="px-5 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.06)] flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 min-w-[36px]">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:h-1.5 transition-all"
            />
            <span className="text-[11px] font-mono text-slate-400 min-w-[36px]">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition shadow-sm"
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
              <button
                onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                title="重新播放"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-slate-400 hover:text-slate-600 transition">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
