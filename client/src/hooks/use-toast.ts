import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

const toasts: Toast[] = [];
const listeners: Array<(toasts: Toast[]) => void> = [];

function addToast(toast: Omit<Toast, "id">) {
  const id = Math.random().toString(36).substr(2, 9);
  const newToast = { ...toast, id };
  toasts.push(newToast);
  
  listeners.forEach((listener) => listener([...toasts]));
  
  // Auto-remove toast after duration
  setTimeout(() => {
    removeToast(id);
  }, toast.duration || 5000);
  
  return id;
}

function removeToast(id: string) {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    listeners.forEach((listener) => listener([...toasts]));
  }
}

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>([...toasts]);

  const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const toast = useCallback((toast: Omit<Toast, "id">) => {
    return addToast(toast);
  }, []);

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  return {
    toast,
    dismiss,
    toasts: toastList,
  };
}