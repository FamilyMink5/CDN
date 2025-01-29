import { useState } from 'react';
import { Backdrop, CircularProgress, Typography } from '@mui/material';
import axios from 'axios';
import { FileInfo, API_CONFIG } from '@/types';
import { handleDecryption, getMimeType } from '@/utils/fileUtils';

interface DownloadManagerProps {
  onError: (message: string) => void;
}

export const DownloadManager = ({ onError }: DownloadManagerProps) => {
  const [downloadProgress, setDownloadProgress] = useState<{file: FileInfo; progress: number} | null>(null);

  const handleDownload = async (file: FileInfo) => {
    try {
      setDownloadProgress({ file, progress: 0 });
      
      const response = await axios.get(`${API_CONFIG.baseURL}/download/${file.name}`, {
        headers: API_CONFIG.headers,
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? progressEvent.loaded));
          setDownloadProgress(prev => prev ? { ...prev, progress } : null);
        }
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
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadProgress(null);
    } catch (error) {
      console.error('다운로드 실패:', error);
      onError('파일 다운로드 중 오류가 발생했습니다.');
      setDownloadProgress(null);
    }
  };

  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2
      }}
      open={downloadProgress !== null}
    >
      <CircularProgress color="inherit" />
      <Typography>
        {downloadProgress?.file?.name} 다운로드 중... {downloadProgress?.progress}%
      </Typography>
    </Backdrop>
  );
}; 