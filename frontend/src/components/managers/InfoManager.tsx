import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogTitle, Box, Tabs, Tab, Stack, 
  Typography, Alert, CircularProgress
} from '@mui/material';
import { FileInfo } from '@/types';
import { getFileTypeLabel, formatFileSize } from '@/utils/fileUtils';
import { FileIcon } from '../FileIcon';

interface InfoManagerProps {
  file: FileInfo | null;
  open: boolean;
  onClose: () => void;
}

export const InfoManager = ({ file, open, onClose }: InfoManagerProps) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  if (!file) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileIcon type={file.type || 'other'} />
          {file.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
            <Tab label="미리보기" />
            <Tab label="상세 정보" />
          </Tabs>
          <Box sx={{ mt: 2 }}>
            {selectedTab === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                {previewLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : previewError ? (
                  <Alert severity="error">{previewError}</Alert>
                ) : ['image', 'video', 'audio'].includes(file.type || '') ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                  />
                ) : (
                  <Typography>미리보기를 지원하지 않는 파일 형식입니다.</Typography>
                )}
              </Box>
            ) : (
              <Stack spacing={2}>
                <Typography><strong>파일명:</strong> {file.name}</Typography>
                <Typography><strong>크기:</strong> {formatFileSize(file.size)}</Typography>
                <Typography><strong>업로드 날짜:</strong> {file.uploadDate}</Typography>
                <Typography><strong>파일 형식:</strong> {getFileTypeLabel(file.type || 'other')}</Typography>
                <Typography><strong>확장자:</strong> {file.name.split('.').pop()?.toUpperCase() || '없음'}</Typography>
              </Stack>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}; 