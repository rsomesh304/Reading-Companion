import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));
if (import.meta.env.DEV && window.location.pathname === "/story-assets") {
	import("./story/StoryAssetGallery.jsx").then(({ default: Gallery }) => root.render(<Gallery />));
} else {
	root.render(<App />);
}