import { io } from "socket.io-client";
import { getApiOrigin } from "../config/apiOrigin.js";

export function createSocket() {
  const origin = getApiOrigin();
  return io(origin, {
    path: "/socket.io",
    autoConnect: true,
    transports: ["websocket", "polling"],
  });
}
