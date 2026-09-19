'use client';
import {useCallback, useMemo, useRef, useState} from 'react';
import {ReactFlowProvider} from 'reactflow';
import {
  Alert,
  CssBaseline,
  Snackbar,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {useMindMapStore} from '@/components/organisms/MindMapStore/useMindMapStore';
import {
  AppActions,
  MindMapActionsContext,
  MindMapStateContext,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {MindMapCanvas} from '@/components/organisms/MindMapCanvas';
import {AppToolbar} from '@/components/molecules/AppToolbar';
import {EditorModal} from '@/components/molecules/EditorModal';
import {useGenerateIdeas} from '@/components/molecules/AiGeneratedNodes/useGenerateIdeas';
import {useMindMapKeyboardShortcuts} from '@/components/molecules/MindMapKeyboardEvents/useMindMapKeyboardShortcuts';

const theme = createTheme({
  palette: {
    primary: {main: '#4f6bed'},
    background: {default: '#f8fafc'},
  },
  shape: {borderRadius: 8},
  typography: {
    fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    button: {textTransform: 'none', fontWeight: 600},
  },
});

interface Toast {
  key: number;
  message: string;
  severity: 'success' | 'error' | 'info';
}

function HomePage() {
  const {state, actions: storeActions} = useMindMapStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback(
    (message: string, severity: Toast['severity'] = 'info') =>
      setToast({key: Date.now(), message, severity}),
    [],
  );

  const generateIdeas = useGenerateIdeas(stateRef, storeActions, notify);
  const actions = useMemo<AppActions>(
    () => ({...storeActions, generateIdeas, notify}),
    [storeActions, generateIdeas, notify],
  );

  useMindMapKeyboardShortcuts(state, actions);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MindMapStateContext.Provider value={state}>
        <MindMapActionsContext.Provider value={actions}>
          <ReactFlowProvider>
            <div className="mm-app">
              <AppToolbar />
              <MindMapCanvas />
            </div>
            <EditorModal />
          </ReactFlowProvider>
        </MindMapActionsContext.Provider>
      </MindMapStateContext.Provider>
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={toast?.severity === 'error' ? 6000 : 3000}
        onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ThemeProvider>
  );
}

export {HomePage};
