import React, { memo } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, RotateCw,
  ZoomIn, ZoomOut, Maximize2, SkipForward, SkipBack,
  Repeat, Repeat1, Sliders, Timer, Film, Image as ImageIcon,
  Trash2, Plus, FolderSync
} from 'lucide-react';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CanvasControls = memo(function CanvasControls({
  activeLayer,
  layersCount = 0,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  volume,
  isMuted,
  onToggleMute,
  onVolumeChange,
  playbackRate,
  onChangePlaybackRate,
  imageProgress,
  imageDelay,
  onChangeImageDelay,
  isAutoPlayEnabled,
  onToggleAutoPlay,
  playlistFolderName,
  onRequestSelectFolder,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  loopMode,
  onToggleLoopMode,
  playlistLength = 0,
  currentPlaylistIndex = -1,
  allowHybrid,
  onToggleAllowHybrid,
  isMixingBoard,
  onRequestAddLayer,
  onRemoveCurrentLayer,
  onZoomIn,
  onZoomOut,
  onRotate,
  onResetViewport,
  onToggleFullscreen,
  settingsOpen,
  onToggleSettingsOpen
}) {
  const isVideo = activeLayer?.category === 'video';

  return (

    <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-5 group pointer-events-none">
      <div className="w-96 h-5 bg-transparent cursor-pointer pointer-events-auto" />
      <div
        className="flex flex-col gap-2 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_12px_40px_rgba(236,72,153,0.08)] transition-all duration-300 pointer-events-auto w-[92%] max-w-[680px] transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-1">
          {isVideo ? (
            <>
              <span className="text-[11px] font-mono text-slate-400 min-w-[36px]">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:h-1.5 transition-all"
              />
              <span className="text-[11px] font-mono text-slate-400 min-w-[36px]">{formatTime(duration)}</span>
            </>
          ) : (
            <div className="w-full flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 min-w-[48px]">
                <Timer size={11} className="text-pink-500" /> {imageDelay}s
              </span>
              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all ease-linear rounded-full ${isAutoPlayEnabled ? 'duration-100' : ''}`}
                  style={{ width: `${imageProgress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400 min-w-[42px] text-right">
                {isMixingBoard ? `画板: ${layersCount}` : (isAutoPlayEnabled ? `${currentPlaylistIndex + 1}/${playlistLength}` : '单图')}
              </span>
            </div>
          )}
        </div>

        {/* 核心操作按钮聚合行 */}
        <div className="flex items-center justify-between text-slate-600 pt-0.5">
          {/* 左侧：播放控制与切首 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrev}
              disabled={!hasPrev || !isAutoPlayEnabled}
              className={`p-1.5 rounded transition ${hasPrev && isAutoPlayEnabled ? 'hover:bg-pink-50 hover:text-pink-600 text-slate-600' : 'text-slate-300 cursor-not-allowed'}`}
              title="播放上一个文件"
            >
              <SkipBack size={15} />
            </button>

            {isVideo && (
              <button
                onClick={onTogglePlay}
                className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white flex items-center justify-center transition shadow-sm shadow-pink-500/20"
              >
                {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
              </button>
            )}

            <button
              onClick={onNext}
              disabled={!hasNext || !isAutoPlayEnabled}
              className={`p-1.5 rounded transition ${hasNext && isAutoPlayEnabled ? 'hover:bg-cyan-50 hover:text-cyan-600 text-slate-600' : 'text-slate-300 cursor-not-allowed'}`}
              title="播放下一个文件"
            >
              <SkipForward size={15} />
            </button>

            <button
              onClick={onToggleLoopMode}
              className={`p-1.5 rounded transition ${loopMode === 'single' ? 'text-pink-600 bg-pink-50 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
              title={loopMode === 'single' ? '单文件循环' : '文件夹列表循环'}
            >
              {loopMode === 'single' ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>

            {isVideo && (
              <>
                <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />
                <button onClick={onToggleMute} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition">
                  {isMuted ? <VolumeX size={15} className="text-pink-500" /> : <Volume2 size={15} className="text-cyan-500" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-14 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </>
            )}
          </div>


          <div className="flex items-center gap-1">
            <button onClick={onZoomIn} className="p-1.5 hover:bg-cyan-50 hover:text-cyan-600 rounded text-slate-700 transition" title="放大">
              <ZoomIn size={15} />
            </button>
            <button onClick={onZoomOut} className="p-1.5 hover:bg-cyan-50 hover:text-cyan-600 rounded text-slate-700 transition" title="缩小">
              <ZoomOut size={15} />
            </button>
            <button onClick={onRotate} className="p-1.5 hover:bg-pink-50 hover:text-pink-600 rounded text-slate-700 transition" title="顺时针旋转 90°">
              <RotateCw size={15} />
            </button>
            <button onClick={onResetViewport} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition" title="复位画布">
              <Maximize2 size={15} />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />


            <button
              onClick={onRequestSelectFolder}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                isAutoPlayEnabled
                  ? 'bg-gradient-to-r from-cyan-50 to-pink-50 text-slate-800 border border-pink-200 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="指定轮播目录"
            >
              <FolderSync size={13} className={isAutoPlayEnabled ? 'text-pink-500 animate-spin-slow' : 'text-cyan-500'} />
              <span>{playlistFolderName ? playlistFolderName : '指定轮播目录'}</span>
            </button>


            <button
              onClick={onRequestAddLayer}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                isMixingBoard ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="追加新文件混入当前画布"
            >
              <Plus size={15} />
            </button>

            {isMixingBoard && activeLayer && layersCount > 1 && (
              <button
                onClick={onRemoveCurrentLayer}
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded transition"
                title="移除当前图层"
              >
                <Trash2 size={14} />
              </button>
            )}

            {isVideo && (
              <button
                onClick={onChangePlaybackRate}
                className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                {playbackRate}x
              </button>
            )}

            <button
              onClick={onToggleSettingsOpen}
              className={`p-1.5 rounded transition ${settingsOpen ? 'bg-cyan-50 text-cyan-600' : 'hover:bg-slate-100 text-slate-700'}`}
              title="偏好设置"
            >
              <Sliders size={15} />
            </button>

            <button onClick={onToggleFullscreen} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition" title="全屏">
              <Maximize size={15} />
            </button>
          </div>
        </div>

        {/* 展开的轮播偏好配置抽屉 */}
        {settingsOpen && (
          <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 px-1 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleAutoPlay}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  isAutoPlayEnabled ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isAutoPlayEnabled ? '轮播开启' : '轮播停用'}
              </button>

              <button
                onClick={onToggleAllowHybrid}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                  allowHybrid ? 'bg-pink-50 text-pink-700 font-semibold border border-pink-100' : 'hover:bg-slate-100 text-slate-500'
                }`}
                title="是否允许视频与图片混合连续播发"
              >
                <Film size={12} className="text-cyan-500" />
                <ImageIcon size={12} className="text-pink-500" />
                <span>图视混播: {allowHybrid ? '开' : '关'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">图片停留:</span>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={imageDelay}
                onChange={(e) => onChangeImageDelay(parseInt(e.target.value, 10))}
                className="w-16 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-pink-500"
              />
              <span className="font-mono text-[11px] text-slate-600 min-w-[24px]">{imageDelay}s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default CanvasControls;
