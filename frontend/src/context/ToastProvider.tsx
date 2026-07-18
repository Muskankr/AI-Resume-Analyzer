import React, { useState, useCallback, useRef, useEffect } from "react";
import { Toast } from "../components/Toast";
import { ToastContext, type ToastType } from "./ToastContext";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeouts.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeouts.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    const timeoutId = setTimeout(() => {
      removeToast(id);
    }, 4000);

    timeouts.current.set(id, timeoutId);
  }, [removeToast]);

  useEffect(() => {
    const timeoutMap = timeouts.current;
    return () => {
      timeoutMap.forEach(clearTimeout);
      timeoutMap.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
