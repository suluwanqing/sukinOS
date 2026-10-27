import React, { useState, useRef, useEffect, useCallback } from 'react';
import CanvasControls from './CanvasControls';
import style from '../style.module.css';

export default function HybridMediaCanvas({
  isMixingBoard = false,
  layers = [],
  onUpdateLayer,
  onRemoveLayer,
  selectedLayerId,
  onSelectLayer,
  onRequestAddLayer,

  isAutoPlayEnabled = false,
  playlistFolderName = '',
  onRequestSelectFolder,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  loopMode = 'list',
  onToggleLoopMode,
  imageDelay = 5,
  onChangeImageDelay,
  playlist = [],
  currentIndex = -1,
  allowHybrid = true,
  onToggleAllowHybrid,
  onToggleAutoPlay
}) {
  const containerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // 全局漫游视口
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const isPanningCanvasRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // 单个图层拖拽
  const isDraggingLayerRef = useRef(false);
  const activeDragIdRef = useRef(null);
  const layerDragOffsetRef = useRef({ x: 0, y: 0 });

  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeLayer = layers.find(l => l.id === selectedLayerId) || layers[0] || null;

  // 视频播放控制
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // 图片轮播进度
  const [imageProgress, setImageProgress] = useState(0);

  // 滚轮缩放
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    if (activeLayer) {
      const nextScale = Math.min(Math.max(0.1, (activeLayer.scale || 1) + delta), 10);
      onUpdateLayer(activeLayer.id, { scale: nextScale });
    } else {
      setCanvasZoom(z => Math.min(Math.max(0.2, z + delta), 5));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (!isDraggingLayerRef.current) {
      isPanningCanvasRef.current = true;
      panStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingLayerRef.current && activeDragIdRef.current) {
      onUpdateLayer(activeDragIdRef.current, {
        x: e.clientX - layerDragOffsetRef.current.x,
        y: e.clientY - layerDragOffsetRef.current.y
      });
      return;
    }

    if (isPanningCanvasRef.current) {
      setCanvasOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    isPanningCanvasRef.current = false;
    isDraggingLayerRef.current = false;
    activeDragIdRef.current = null;
  };

  const handleLayerMouseDown = (e, layer) => {
    e.stopPropagation();
    onSelectLayer(layer.id);
    isDraggingLayerRef.current = true;
    activeDragIdRef.current = layer.id;
    layerDragOffsetRef.current = {
      x: e.clientX - (layer.x || 0),
      y: e.clientY - (layer.y || 0)
    };
  };

  const resetViewport = () => {
    setCanvasOffset({ x: 0, y: 0 });
    setCanvasZoom(1);
    layers.forEach(l => {
      onUpdateLayer(l.id, { x: 0, y: 0, scale: 1, rotation: 0 });
    });
  };

  // 图片轮播倒计时推进
  useEffect(() => {
    if (!isAutoPlayEnabled || isMixingBoard || !activeLayer || activeLayer.category === 'video') {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setImageProgress(0);
      return;
    }

    if (loopMode === 'single') {
      setImageProgress(0);
      return;
    }

    const intervalTime = 100;
    const totalSteps = (imageDelay * 1000) / intervalTime;
    let step = 0;

    countdownTimerRef.current = setInterval(() => {
      step += 1;
      const pct = (step / totalSteps) * 100;
      setImageProgress(pct);

      if (step >= totalSteps) {
        clearInterval(countdownTimerRef.current);
        if (onNext) onNext();
      }
    }, intervalTime);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isAutoPlayEnabled, isMixingBoard, activeLayer, imageDelay, loopMode, onNext]);

  const handleVideoEnded = () => {
    if (loopMode === 'single') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else if (isAutoPlayEnabled && onNext) {
      onNext();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (newProgress) => {
    if (!videoRef.current) return;
    const targetTime = (newProgress / 100) * duration;
    videoRef.current.currentTime = targetTime;
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      if (videoRef.current) videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      if (videoRef.current) videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const changePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) videoRef.current.playbackRate = nextRate;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none flex items-center justify-center cursor-grab active:cursor-grabbing ${style.dotGrid}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 满屏大画布 */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})`,
          transformOrigin: 'center center'
        }}
      >
        {layers.map((layer) => {
          const isSelected = layer.id === selectedLayerId;
          const isVideo = layer.category === 'video';

          return (
            <div
              key={layer.id}
              onMouseDown={(e) => handleLayerMouseDown(e, layer)}
              className={`absolute transition-shadow duration-150 pointer-events-auto cursor-move rounded-xl ${
                isMixingBoard
                  ? (isSelected ? 'ring-2 ring-pink-500 shadow-2xl shadow-pink-500/10' : 'hover:ring-1 hover:ring-cyan-300 shadow-lg')
                  : 'shadow-2xl'
              }`}
              style={{
                transform: `translate(${layer.x || 0}px, ${layer.y || 0}px) scale(${layer.scale || 1}) rotate(${layer.rotation || 0}deg)`,
                zIndex: layer.zIndex || 10,
                transformOrigin: 'center center'
              }}
            >
              {isVideo ? (
                <video
                  ref={isSelected ? videoRef : null}
                  src={layer.src}
                  autoPlay
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  onTimeUpdate={isSelected ? () => setCurrentTime(videoRef.current?.currentTime || 0) : null}
                  onLoadedMetadata={() => {
                    if (isSelected && videoRef.current) {
                      setDuration(videoRef.current.duration || 0);
                    }
                  }}
                  onEnded={handleVideoEnded}
                  className="rounded-xl max-w-none max-h-[75vh] pointer-events-auto bg-black/5"
                />
              ) : (
                <img
                  src={layer.src}
                  alt={layer.name}
                  draggable={false}
                  className="rounded-xl max-w-none max-h-[75vh] pointer-events-none drop-shadow-md"
                />
              )}

              {isMixingBoard && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs border border-pink-100 text-[10px] text-pink-700 font-mono shadow-xs pointer-events-none truncate max-w-[160px]">
                  {layer.name}
                </div>
              )}
            </div>
          );
        })}
      </div>


      <CanvasControls
        activeLayer={activeLayer}
        layersCount={layers.length}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        playbackRate={playbackRate}
        onChangePlaybackRate={changePlaybackRate}
        imageProgress={imageProgress}
        imageDelay={imageDelay}
        onChangeImageDelay={onChangeImageDelay}
        isAutoPlayEnabled={isAutoPlayEnabled}
        onToggleAutoPlay={onToggleAutoPlay}
        playlistFolderName={playlistFolderName}
        onRequestSelectFolder={onRequestSelectFolder}
        onNext={onNext}
        onPrev={onPrev}
        hasNext={hasNext}
        hasPrev={hasPrev}
        loopMode={loopMode}
        onToggleLoopMode={onToggleLoopMode}
        playlistLength={playlist.length}
        currentPlaylistIndex={currentIndex}
        allowHybrid={allowHybrid}
        onToggleAllowHybrid={onToggleAllowHybrid}
        isMixingBoard={isMixingBoard}
        onRequestAddLayer={onRequestAddLayer}
        onRemoveCurrentLayer={() => activeLayer && onRemoveLayer(activeLayer.id)}
        onZoomIn={() => activeLayer && onUpdateLayer(activeLayer.id, { scale: Math.min((activeLayer.scale || 1) + 0.2, 8) })}
        onZoomOut={() => activeLayer && onUpdateLayer(activeLayer.id, { scale: Math.max((activeLayer.scale || 1) - 0.2, 0.2) })}
        onRotate={() => activeLayer && onUpdateLayer(activeLayer.id, { rotation: ((activeLayer.rotation || 0) + 90) % 360 })}
        onResetViewport={resetViewport}
        onToggleFullscreen={toggleFullscreen}
        settingsOpen={settingsOpen}
        onToggleSettingsOpen={() => setSettingsOpen(!settingsOpen)}
      />
    </div>
  );
}
