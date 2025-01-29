import { 
  Image, Description, Movie, FolderZip, AudioFile, Code, InsertDriveFile 
} from '@mui/icons-material';

interface FileIconProps {
  type: string;
}

export const FileIcon = ({ type }: FileIconProps) => {
  switch (type) {
    case 'image': return <Image />;
    case 'video': return <Movie />;
    case 'document': return <Description />;
    case 'archive': return <FolderZip />;
    case 'audio': return <AudioFile />;
    case 'code': return <Code />;
    default: return <InsertDriveFile />;
  }
}; 