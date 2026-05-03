import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSocket } from "../sockets/socket.js";

const ToastCtx = createContext({
  pushToast: () => {},
});

const SocketCtx = createContext(null);

export function AppProviders({ children }) {
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const s = createSocket();
    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, []);

  const pushToast = useCallback((t) => {
    const id = crypto.randomUUID();
    const toast = { id, ...t };
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 5200);
  }, []);

  const toastApi = useMemo(() => ({ pushToast, toasts }), [pushToast, toasts]);

  return (
    <SocketCtx.Provider value={socket}>
      <ToastCtx.Provider value={toastApi}>{children}</ToastCtx.Provider>
    </SocketCtx.Provider>
  );
}

export function useAppSocket() {
  return useContext(SocketCtx);
}

export function useToasts() {
  return useContext(ToastCtx);
}
