import { useState, useCallback, useEffect } from 'react';
import { 
  Box, Paper, List, ListItem, ListItemText, IconButton, Stack, TextField, 
  InputAdornment, Dialog, DialogContent, DialogTitle, Grid, Chip, Select,
  MenuItem, FormControl, InputLabel, useTheme, useMediaQuery, Tabs, Tab,
  Typography, Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import InfoIcon from '@mui/icons-material/Info';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import MovieIcon from '@mui/icons-material/Movie';
import CloseIcon from '@mui/icons-material/Close';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import CodeIcon from '@mui/icons-material/Code';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import CryptoJS from 'crypto-js';

interface FileInfo {
  name: string;
  size: number;
  uploadDate: string;
  type?: string;
}

// API 설정
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY
  }
};

// AES 키 (Base64 디코딩 후 SHA-256 해시)
const getAESKey = async (base64Key: string): Promise<ArrayBuffer> => {
  try {
    // Base64 디코딩
    const decodedKey = atob(base64Key);
    // 바이너리 데이터로 변환
    const keyBytes = new Uint8Array(decodedKey.length);
    for (let i = 0; i < decodedKey.length; i++) {
      keyBytes[i] = decodedKey.charCodeAt(i);
    }
    // SHA-256 해시를 사용하여 32바이트 키 생성
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyBytes);
    return hashBuffer;
  } catch (e) {
    console.error('Failed to process AES key:', e);
    throw e;
  }
};

const FileManager = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [fileType, setFileType] = useState('all');

  const fetchFiles = useCallback(async () => {
    try {
      const response = await axios.get(`${API_CONFIG.baseURL}/files`, {
        headers: API_CONFIG.headers
      });
      const filesWithType = response.data.map((file: FileInfo) => ({
        ...file,
        type: getFileType(file.name),
      }));
      setFiles(filesWithType);
    } catch (error) {
      console.error('파일 목록 가져오기 실패:', error);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    // 30초마다 파일 목록 자동 새로고침
    const interval = setInterval(fetchFiles, 30000);
    return () => clearInterval(interval);
  }, [fetchFiles]);

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    // 이미지 파일
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'].includes(ext)) {
      return 'image';
    }
    // 비디오 파일
    if (['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v', '3gp'].includes(ext)) {
      return 'video';
    }
    // 문서 파일
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'md'].includes(ext)) {
      return 'document';
    }
    // 압축 파일
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
      return 'archive';
    }
    // 오디오 파일
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'].includes(ext)) {
      return 'audio';
    }
    // 코드 파일
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'go', 'rs'].includes(ext)) {
      return 'code';
    }
    return 'other';
  };

  const handleDownload = async (fileName: string) => {
    try {
      console.log('다운로드 시작:', fileName);
      
      const response = await axios.get(`${API_CONFIG.baseURL}/download/${fileName}`, {
        headers: API_CONFIG.headers,
        responseType: 'text'
      });
      
      console.log('서버 응답 받음, 데이터 길이:', response.data.length);
      console.log('응답 데이터 샘플:', response.data.slice(0, 100));
      
      try {
        // Base64 디코딩
        console.log('Base64 디코딩 시작');
        const encryptedData = atob(response.data);
        console.log('Base64 디코딩 완료, 길이:', encryptedData.length);
        
        const encryptedBytes = new Uint8Array(encryptedData.length);
        for (let i = 0; i < encryptedData.length; i++) {
          encryptedBytes[i] = encryptedData.charCodeAt(i);
        }
        console.log('Uint8Array 변환 완료, 길이:', encryptedBytes.length);

        // GCM 모드의 nonce 크기는 12바이트
        const nonceSize = 12;
        const nonce = encryptedBytes.slice(0, nonceSize);
        const ciphertext = encryptedBytes.slice(nonceSize);

        console.log('Nonce 크기:', nonce.length);
        console.log('암호화된 데이터 크기:', ciphertext.length);

        // AES 키 생성
        const keyBuffer = await getAESKey(import.meta.env.VITE_AES_KEY);
        console.log('AES 키 생성 완료, 길이:', keyBuffer.byteLength);

        // Web Crypto API를 사용하여 복호화
        console.log('키 임포트 시작');
        const key = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );
        console.log('키 임포트 완료');

        console.log('복호화 시작');
        const decryptedData = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: nonce
          },
          key,
          ciphertext
        );
        console.log('복호화 완료, 데이터 크기:', decryptedData.byteLength);

        // 복호화된 데이터로 파일 생성
        console.log('파일 생성 시작');
        const blob = new Blob([decryptedData]);
        console.log('Blob 생성됨, 크기:', blob.size);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        console.log('다운로드 완료');
      } catch (error) {
        console.error('데이터 처리 중 오류:', error);
        throw error;
      }
    } catch (error) {
      console.error('전체 다운로드 프로세스 실패:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const sortFiles = (a: FileInfo, b: FileInfo) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'size':
        return multiplier * (a.size - b.size);
      case 'date':
        return multiplier * (new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime());
      default:
        return 0;
    }
  };

  const filteredFiles = files
    .filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(file => fileType === 'all' || file.type === fileType)
    .sort(sortFiles);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <MovieIcon />;
      case 'document':
        return <DescriptionIcon />;
      case 'archive':
        return <FolderZipIcon />;
      case 'audio':
        return <AudioFileIcon />;
      case 'code':
        return <CodeIcon />;
      default:
        return <InsertDriveFileIcon />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'image': '이미지 파일',
      'video': '비디오 파일',
      'document': '문서 파일',
      'archive': '압축 파일',
      'audio': '오디오 파일',
      'code': '코드 파일',
      'other': '기타 파일'
    };
    return labels[type] || '기타 파일';
  };

  const FilePreview = ({ file }: { file: FileInfo }) => {
    if (file.type === 'image') {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <img 
            src={`${API_CONFIG.baseURL}/download/${file.name}`}
            alt={file.name}
            style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
          />
        </Box>
      );
    }
    return (
      <Box sx={{ p: 2 }}>
        <Typography>미리보기를 지원하지 않는 파일 형식입니다.</Typography>
      </Box>
    );
  };

  return (
    <Stack spacing={3}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="파일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>정렬 기준</InputLabel>
            <Select
              value={sortBy}
              label="정렬 기준"
              onChange={(e) => setSortBy(e.target.value)}
              startAdornment={<SortIcon sx={{ mr: 1 }} />}
              sx={{ minWidth: '150px' }}
            >
              <MenuItem value="name">이름순</MenuItem>
              <MenuItem value="size">크기순</MenuItem>
              <MenuItem value="date">날짜순</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>파일 종류</InputLabel>
            <Select
              value={fileType}
              label="파일 종류"
              onChange={(e) => setFileType(e.target.value)}
              sx={{ minWidth: '150px' }}
            >
              <MenuItem value="all">전체</MenuItem>
              <MenuItem value="image">이미지</MenuItem>
              <MenuItem value="video">비디오</MenuItem>
              <MenuItem value="document">문서</MenuItem>
              <MenuItem value="archive">압축파일</MenuItem>
              <MenuItem value="audio">오디오</MenuItem>
              <MenuItem value="code">코드</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Paper elevation={3}>
        <AnimatePresence>
          <List>
            {filteredFiles.map((file) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ListItem
                  secondaryAction={
                    <Box>
                      <Tooltip title="상세 정보">
                        <IconButton
                          edge="end"
                          onClick={() => {
                            setSelectedFile(file);
                            setPreviewOpen(true);
                          }}
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="다운로드">
                        <IconButton
                          edge="end"
                          onClick={() => handleDownload(file.name)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFileIcon(file.type || 'other')}
                        {file.name}
                      </Box>
                    }
                    secondary={`${formatFileSize(file.size)} | ${file.uploadDate}`}
                  />
                </ListItem>
              </motion.div>
            ))}
            {filteredFiles.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="파일을 찾을 수 없습니다"
                  secondary="검색어를 변경하거나 나중에 다시 시도해주세요"
                />
              </ListItem>
            )}
          </List>
        </AnimatePresence>
      </Paper>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            minHeight: '400px',
            maxHeight: '600px'
          }
        }}
      >
        {selectedFile && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{selectedFile.name}</Typography>
              <IconButton onClick={() => setPreviewOpen(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
                <Tab label="미리보기" />
                <Tab label="상세 정보" />
              </Tabs>
              <Box sx={{ mt: 2 }}>
                {selectedTab === 0 ? (
                  <FilePreview file={selectedFile} />
                ) : (
                  <Stack spacing={2}>
                    <Typography><strong>파일명:</strong> {selectedFile.name}</Typography>
                    <Typography><strong>크기:</strong> {formatFileSize(selectedFile.size)}</Typography>
                    <Typography><strong>업로드 날짜:</strong> {selectedFile.uploadDate}</Typography>
                    <Typography><strong>파일 형식:</strong> {getFileTypeLabel(selectedFile.type || 'other')}</Typography>
                    <Typography><strong>확장자:</strong> {selectedFile.name.split('.').pop()?.toUpperCase() || '없음'}</Typography>
                  </Stack>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Stack>
  );
};

export default FileManager; 