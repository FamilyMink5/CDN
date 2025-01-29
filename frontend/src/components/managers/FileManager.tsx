import { useState, useCallback, useEffect } from 'react';
import { 
  Box, Paper, List, ListItem, ListItemText, IconButton, Stack, TextField, 
  Grid, Chip, Select, MenuItem, FormControl, InputLabel, useTheme, 
  useMediaQuery, Typography, Tooltip, InputAdornment, CircularProgress
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Search, Sort,
  Pause,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FileInfo, API_CONFIG } from '@/types';
import { FileIcon } from '../FileIcon';

interface FileManagerProps {
  onPlayRequest: (file: FileInfo) => void;
  onInfoRequest: (file: FileInfo) => void;
  onDownloadRequest: (file: FileInfo) => void;
  currentPlayingFile: FileInfo | null;
  isPlaying: boolean;
}

export const FileManager = ({ 
  onPlayRequest, 
  onInfoRequest, 
  onDownloadRequest,
  currentPlayingFile,
  isPlaying
}: FileManagerProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [fileType, setFileType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_CONFIG.baseURL}/files`, {
        headers: API_CONFIG.headers,
        timeout: 10000
      });
      const filesWithType = response.data.map((file: FileInfo) => ({
        ...file,
        type: getFileType(file.name),
      }));
      setFiles(filesWithType);
    } catch (error: any) {
      console.error('파일 목록 불러오기 실패:', error);
      let errorMessage = '';
      
      if (error.response) {
        // 서버 응답이 있는 경우
        if (error.response.status === 401) {
          errorMessage = '인증에 실패했습니다. API 키를 확인해주세요.';
        } else if (error.response.status === 403) {
          errorMessage = '접근이 거부되었습니다. CORS 설정을 확인해주세요.';
        } else {
          errorMessage = error.response.data?.error || '서버 오류가 발생했습니다.';
        }
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없는 경우
        if (error.code === 'ECONNABORTED') {
          errorMessage = '서버 응답 시간이 초과되었습니다.';
        } else if (error.message.includes('Network Error')) {
          errorMessage = '서버에 연결할 수 없습니다.\n모바일 데이터나 와이파이 연결을 확인해주세요.';
        } else {
          errorMessage = '서버와의 통신이 실패했습니다.';
        }
      } else {
        errorMessage = '알 수 없는 오류가 발생했습니다.';
      }
      
      setError(errorMessage);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 30000);
    return () => clearInterval(interval);
  }, [fetchFiles]);

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v', '3gp'].includes(ext)) return 'video';
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'md'].includes(ext)) return 'document';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'archive';
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'].includes(ext)) return 'audio';
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'go', 'rs'].includes(ext)) return 'code';
    return 'other';
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
      case 'name': return multiplier * a.name.localeCompare(b.name);
      case 'size': return multiplier * (a.size - b.size);
      case 'date': return multiplier * (new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime());
      default: return 0;
    }
  };

  const filteredFiles = files
    .filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(file => fileType === 'all' || file.type === fileType)
    .sort(sortFiles);

  const ListItemActions = ({ file }: { file: FileInfo }) => {
    const isCurrentlyPlaying = currentPlayingFile?.name === file.name;

    return (
      <Stack direction="row" spacing={1}>
        {(file.type === 'audio' || file.type === 'video') && (
          <Tooltip title={isCurrentlyPlaying ? (isPlaying ? "일시정지" : "재생") : "재생"}>
            <IconButton
              size={isMobile ? "small" : "medium"}
              onClick={() => onPlayRequest(file)}
            >
              {isCurrentlyPlaying && isPlaying ? <Pause /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="상세 정보">
          <IconButton
            size={isMobile ? "small" : "medium"}
            onClick={() => onInfoRequest(file)}
          >
            <InfoIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="다운로드">
          <IconButton
            size={isMobile ? "small" : "medium"}
            onClick={() => onDownloadRequest(file)}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  };

  return (
    <Stack spacing={2}>
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
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
            <InputLabel>정렬 기준</InputLabel>
            <Select
              value={sortBy}
              label="정렬 기준"
              onChange={(e) => setSortBy(e.target.value)}
              startAdornment={<Sort />}
            >
              <MenuItem value="name">이름순</MenuItem>
              <MenuItem value="size">크기순</MenuItem>
              <MenuItem value="date">날짜순</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
            <InputLabel>파일 종류</InputLabel>
            <Select
              value={fileType}
              label="파일 종류"
              onChange={(e) => setFileType(e.target.value)}
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

      <Paper elevation={3} sx={{ mb: isMobile ? 8 : 2 }}>
        <AnimatePresence>
          <List>
            {loading ? (
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={20} />
                      <Typography>파일 목록을 불러오는 중...</Typography>
                    </Box>
                  }
                />
              </ListItem>
            ) : error ? (
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'error.main' }}>
                      <Typography sx={{ whiteSpace: 'pre-line', flex: 1 }}>{error}</Typography>
                      <IconButton size="small" onClick={fetchFiles}>
                        <RefreshIcon />
                      </IconButton>
                    </Box>
                  }
                  secondary="새로고침 버튼을 클릭하거나 나중에 다시 시도해주세요"
                />
              </ListItem>
            ) : filteredFiles.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="파일을 찾을 수 없습니다"
                  secondary="검색어를 변경하거나 나중에 다시 시도해주세요"
                />
              </ListItem>
            ) : (
              filteredFiles.map((file) => (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ListItem
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      px: 2
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 1,
                      flex: 1,
                      minWidth: 0 // 이것이 텍스트 오버플로우를 방지합니다
                    }}>
                      <FileIcon type={file.type || 'other'} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap>
                          {file.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {formatFileSize(file.size)} | {file.uploadDate}
                        </Typography>
                      </Box>
                      {currentPlayingFile?.name === file.name && (
                        <Chip 
                          size="small" 
                          color="primary" 
                          label={isPlaying ? "재생 중" : "일시정지"} 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <ListItemActions file={file} />
                  </ListItem>
                </motion.div>
              ))
            )}
          </List>
        </AnimatePresence>
      </Paper>
    </Stack>
  );
}; 