import { mkdirSync, writeFileSync } from "node:fs";
import { buildReportEmailHtml } from "./reportEmailTemplate.js";

mkdirSync("email-previews", { recursive: true });

const base = {
  area: "Profile & settings",
  reporter: "Soumyaranjan",
  appVersion: "1.5.0",
  createdAt: new Date().toISOString(),
  device: { screen: "423x882", lang: "en-GB", theme: "light", standalone: true },
};
const samples = {
  bug: { ...base, type: "bug", title: "Profile card overlaps after adding a photo", severity: "High",
    description: "After adding a profile image, the bottom elements overlap the card.\nPlease check the screenshot.",
    steps: "1. Open Profile 2. Add a photo 3. Scroll down" },
  issue: { ...base, type: "issue", title: "Settings screen feels stuck", severity: "Medium",
    description: "Scrolling stops halfway on the settings screen.", steps: "1. Open Settings 2. Swipe up fast" },
  feature: { ...base, type: "feature", title: "Dark reading mode",
    description: "A dimmer, warmer reading mode for late-night sessions." },
  enhance: { ...base, type: "enhance", title: "Better profile spacing",
    description: "More spacing around the avatar and a clearer stats row." },
};

let n = 1;
for (const [type, report] of Object.entries(samples)) {
  writeFileSync(`email-previews/${type}.html`, buildReportEmailHtml(report, `RC-00000${n++}`, 1, [], "https://example.com"));
}
console.log("Done. Open the files inside email-previews/ in your browser.");