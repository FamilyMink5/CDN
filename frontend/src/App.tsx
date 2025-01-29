import { useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MainFileManager from './components/MainFileManager';

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#fff' : '#1e1e1e'
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s ease'
          }
        }
      }
    }
  }), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <Box sx={{ 
        minHeight: '100vh',
        p: 3,
        position: 'relative',
        bgcolor: 'background.default',
        transition: 'background-color 0.3s ease'
      }}>
        <IconButton
          onClick={() => setMode(prev => prev === 'light' ? 'dark' : 'light')}
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
              opacity: 0.9
            }
          }}
        >
          {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
        </IconButton>
        <MainFileManager />
      </Box>
    </ThemeProvider>
  );
}

export default App;
