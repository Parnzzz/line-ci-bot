import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const richMenuName = "Arayatime Flutter CI";
const applyChanges = process.argv.includes("--apply");
const imagePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/rich-menu.png"
);

const richMenu = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: richMenuName,
  chatBarText: "เมนู CI",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: {
        type: "postback",
        label: "ดูสถานะ CI",
        data: "action=status",
      },
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: {
        type: "postback",
        label: "ผล Build ล่าสุด",
        data: "action=latest",
      },
    },
  ],
};

if (!applyChanges) {
  console.log(`Dry run: ${richMenuName}`);
  console.log("Image: public/rich-menu.png (2500 x 843 PNG)");
  console.log("Actions: action=status, action=latest");
  console.log("No LINE API calls were made. Add --apply to create and set it as default.");
  process.exit(0);
}

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!channelAccessToken) {
  throw new Error("LINE_CHANNEL_ACCESS_TOKEN is required when using --apply");
}

const image = await readFile(imagePath);
if (image.length > 1024 * 1024) {
  throw new Error("Rich menu image must be no larger than 1 MB");
}

async function lineRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`LINE API request failed (${response.status})`);
  }

  return response;
}

const existingMenusResponse = await lineRequest(
  "https://api.line.me/v2/bot/richmenu/list"
);
const existingMenus = await existingMenusResponse.json();
if (existingMenus.richmenus?.some((menu) => menu.name === richMenuName)) {
  throw new Error(
    `A rich menu named "${richMenuName}" already exists; stopping to avoid creating a duplicate`
  );
}

const createResponse = await lineRequest("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(richMenu),
});
const { richMenuId } = await createResponse.json();
if (!richMenuId) {
  throw new Error("LINE API did not return a richMenuId");
}

await lineRequest(
  `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
  {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: new Uint8Array(image),
  }
);

await lineRequest(
  `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
  { method: "POST" }
);

console.log(`Rich menu created and set as default. ID: ${richMenuId}`);
