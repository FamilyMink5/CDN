export interface FileInfo {
  name: string;
  size: number;
  uploadDate: string;
  type?: string;
}

// API 설정
const getBaseUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost';
  console.log('Current hostname:', window.location.hostname);  // 호스트명 확인
  console.log('Is localhost:', isLocalhost);  // localhost 여부 확인
  
  const baseUrl = isLocalhost 
    ? 'http://localhost:17233'
    : `${window.location.protocol}//${window.location.host}/api`;
  
  console.log('Selected base URL:', baseUrl);  // 선택된 URL 확인
  return baseUrl;
};

export const API_CONFIG = {
  baseURL: getBaseUrl(),
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY
  }
}; 