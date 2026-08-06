import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <GameProvider>
              <App />
              <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgb(20, 10, 35)',
                  color: 'rgb(230, 225, 248)',
                  border: '1px solid rgb(65, 35, 100)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                },
                success: {
                  iconTheme: {
                    primary: '#daa520',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#8b0000',
                    secondary: 'white',
                  },
                },
              }}
            />
          </GameProvider>
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
</React.StrictMode>
);