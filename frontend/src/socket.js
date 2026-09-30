import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export function connectAuctionSocket() {
  const token = localStorage.getItem("cb_token");
  return io(`${API_BASE}/auctions`, {
    auth: token ? { token } : {},
    transports: ["websocket"],
  });
}
