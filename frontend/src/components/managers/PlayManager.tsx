import { useState, useRef, useEffect } from 'react';
import { Box, Paper, Grid, Stack, Typography, IconButton, Slider } from '@mui/material';
import { Close as CloseIcon, PlayArrow, Pause } from '@mui/icons-material';
import { FileInfo } from '@/types';

interface PlayManagerProps {
  file: FileInfo;
  mediaUrl: string;
  onClose: () => void;
}

export const PlayManager = ({ file, mediaUrl, onClose }: PlayManagerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setCurrentTime(0);
      // 자동 재생
      audio.play().catch(console.error);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  const handleTimeChange = (_: Event, value: number | number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = value as number;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, zIndex: 1000, borderRadius: '12px 12px 0 0', boxShadow: 3 }}>
        <audio
          ref={audioRef}
          src={mediaUrl}
        />
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography noWrap>{file.name}</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Grid>
        <Grid item xs={12} md={9}>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={handlePlayPause}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <Typography sx={{ minWidth: 45 }}>{formatTime(currentTime)}</Typography>
              <Slider
                value={currentTime}
                max={duration}
                onChange={handleTimeChange}
                aria-label="재생 진행도"
              />
              <Typography sx={{ minWidth: 45 }}>{formatTime(duration)}</Typography>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}; 