// Isolated static reference map, served only by Vite's development test server.
import { createRoot } from "react-dom/client";
import { RailBrowser } from "../src/rail/RailBrowser";
const root = document.getElementById("root");
if (!root) throw new Error("Missing test root");
createRoot(root).render(<RailBrowser />);
