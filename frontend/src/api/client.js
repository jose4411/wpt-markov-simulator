import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const client = axios.create({ baseURL: BASE_URL, timeout: 5000 });

export const api = {
  getState: () => client.get("/api/state").then((r) => r.data),
  step: () => client.post("/api/step").then((r) => r.data),
  reset: (battery_pct = 20) =>
    client.post("/api/reset", { battery_pct }).then((r) => r.data),
  updateControls: (payload) =>
    client.post("/api/controls", payload).then((r) => r.data),
  getHistory: () => client.get("/api/history").then((r) => r.data),
  explain: () => client.get("/api/explain").then((r) => r.data),
  getPolicy: () => client.get("/api/policy").then((r) => r.data),
};

export default api;
