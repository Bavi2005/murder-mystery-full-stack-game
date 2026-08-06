import React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, type, message, duration };
    setToasts(prev => [...prev, toast]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, success: (m, d) => addToast('success', m, d), error: (m, d) => addToast('error', m, d), info: (m, d) => addToast('info', m, d), warning: (m, d) => addToast('warning', m, d), dismiss }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg min-w-[300px] max-w-md shadow-xl ${toast.type === 'success' ? 'bg-green-900/90 border border-green-500/30' : toast.type === 'error' ? 'bg-red-900/90 border border-red-500/30' : toast.type === 'warning' ? 'bg-yellow-900/90 border border-yellow-500/30' : 'bg-blue-900/90 border border-blue-500/30'}`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />}
            <p className="text-sm font-medium text-white">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="ml-2 text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};