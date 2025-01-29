import { useState, useCallback, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { FileInfo } from '@/types';
import { FileManager as FileListComponent } from './managers/FileManager';
import { PlayManager } from './managers/PlayManager';
import { DownloadManager } from './managers/DownloadManager';
import { InfoManager } from './managers/InfoManager';
import { API_CONFIG, handleDecryption, getMimeType } from '@/utils/fileUtils';

const MainFileManager = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const getBaseUrl = () => {
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:17233'
      : `${window.location.protocol}//${window.location.host}/api`;
    console.log('Current hostname:', window.location.hostname);
    console.log('Base URL:', baseUrl);
    return baseUrl;
  };

  const handleDownload = async (file: FileInfo) => {
    const baseUrl = getBaseUrl();
    try {
      const downloadUrl = `${baseUrl}/download/${file.name}`;
      console.log('Download URL:', downloadUrl);

      const response = await axios.get(downloadUrl, {
        headers: API_CONFIG.headers,
        responseType: 'text'
      });

      // Base64 디코딩
      const binaryString = atob(response.data);
      const encryptedData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        encryptedData[i] = binaryString.charCodeAt(i);
      }

      const decryptedBuffer = await handleDecryption(encryptedData);
      const blob = new Blob([decryptedBuffer], { type: getMimeType(file.name) });
      const url = URL.createObjectURL(blob);

      // 다운로드 링크 생성 및 클릭
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      enqueueSnackbar('파일 다운로드가 시작되었습니다.', { variant: 'success' });
    } catch (error) {
      console.error('다운로드 실패:', error);
      console.error('Request URL:', `${baseUrl}/download/${file.name}`);
      enqueueSnackbar('파일 다운로드 중 오류가 발생했습니다.', { variant: 'error' });
    }
  };

  const handlePlayRequest = async (file: FileInfo) => {
    const baseUrl = getBaseUrl();
    try {
      // 이미 재생 중인 파일인 경우 토글
      if (currentFile?.name === file.name) {
        setIsPlaying(!isPlaying);
        return;
      }

      const downloadUrl = `${baseUrl}/download/${file.name}`;
      console.log('Download URL:', downloadUrl);
      
      const response = await axios.get(downloadUrl, {
        headers: API_CONFIG.headers,
        responseType: 'text'
      });

      // Base64 디코딩
      const binaryString = atob(response.data);
      const encryptedData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        encryptedData[i] = binaryString.charCodeAt(i);
      }

      const decryptedBuffer = await handleDecryption(encryptedData);
      const blob = new Blob([decryptedBuffer], { type: getMimeType(file.name) });
      
      // 이전 URL 정리
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }

      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      setCurrentFile(file);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing file:', error);
      console.error('Request URL:', `${baseUrl}/download/${file.name}`);
      enqueueSnackbar('파일 재생 중 오류가 발생했습니다.', { variant: 'error' });
    }
  };

  const handlePlayClose = () => {
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
    setMediaUrl('');
    setCurrentFile(null);
    setIsPlaying(false);
  };

  const handleInfoRequest = (file: FileInfo) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  return (
    <>
      <FileListComponent
        onPlayRequest={handlePlayRequest}
        onInfoRequest={handleInfoRequest}
        onDownloadRequest={handleDownload}
        currentPlayingFile={currentFile}
        isPlaying={isPlaying}
      />

      {currentFile && mediaUrl && (
        <PlayManager
          file={currentFile}
          mediaUrl={mediaUrl}
          onClose={handlePlayClose}
        />
      )}

      <DownloadManager
        onError={(message) => enqueueSnackbar(message, { variant: 'error' })}
      />

      <InfoManager
        file={selectedFile}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
};

export default MainFileManager; 
