import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allow external access (0.0.0.0)
    port: 5173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "uncheaply-donella-unspecialised.ngrok-free.dev", // 👈 your ngrok URL (without https://)
    ],
  },
});