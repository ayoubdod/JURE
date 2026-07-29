import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import getBlobDuration from 'get-blob-duration';
import { devError, devLog } from '@/utils/devLog';

interface AudioControlProps {
  audioSrc: string;
  isOwn?: boolean;
  className?: string;
}

const AudioControl: React.FC<AudioControlProps> = ({ audioSrc, isOwn = false, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load duration using the get-blob-duration library
  useEffect(() => {
    const loadDuration = async () => {
      if (!audioSrc) return;
      
      setIsLoading(true);
      
      try {
        // Fetch the audio file
        const response = await fetch(audioSrc);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const duration = await getBlobDuration(blob);
        
        if (duration && !isNaN(duration) && isFinite(duration)) {
          setDuration(duration);
          setIsLoading(false);
          devLog('Audio duration loaded:', duration);
        } else {
          throw new Error('Invalid duration received');
        }
      } catch (error) {
        devError('Error loading audio duration:', error);
        setIsLoading(false);
        
        // Fallback: try to get duration from the audio element after a delay
        setTimeout(() => {
          const audio = audioRef.current;
          if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setDuration(audio.duration);
            devLog('Fallback duration loaded:', audio.duration);
          }
        }, 2000);
      }
    };

    loadDuration();
  }, [audioSrc]);

  // Handle audio playback events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      devError('Audio playback error:', e);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioSrc]);

  // Reset state when audio source changes
  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsLoading(true);
  }, [audioSrc]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((e) => devError('Audio play failed:', e));
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border max-w-xs ${className}`}
         style={{
           backgroundColor: isOwn ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
         }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`p-2 rounded-full transition-colors ${
          isOwn 
            ? 'bg-white/20 hover:bg-white/30 text-black' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {/* Audio Waveform/Progress Bar */}
      <div className="flex-1 flex items-center gap-2">
        <Volume2 className={`w-4 h-4 ${isOwn ? 'text-black/70' : 'text-gray-500'}`} />
        
        {/* Progress bar */}
        <div className="flex-1 relative">
          <div 
            className={`h-1 rounded-full ${
              isOwn ? 'bg-white/30' : 'bg-gray-300'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                isOwn ? 'bg-white' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Time Display */}
      <div className={`text-xs font-mono min-w-0 ${
        isOwn ? 'text-black/80' : 'text-gray-600'
      }`}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
};

export default AudioControl;
