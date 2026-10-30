import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/song-selection-project/",
  plugins: [react()],
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/backup/**"],
  },
});
