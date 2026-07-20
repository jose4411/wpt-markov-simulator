import axios from "axios";

// Pega aquí la URL pública exacta de tu backend desplegado en Render:
const BASE_URL = "https://wpt-markov-backend-api.onrender.coms"; 

const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });

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