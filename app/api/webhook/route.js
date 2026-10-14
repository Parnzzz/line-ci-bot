import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function hasValidSignature(rawBody, signature, channelSecret) {
  if (!signature) return false;

  const actual = Buffer.from(signature, "base64");
  const expected = createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest();

  return (
    actual.length === expected.length &&
    actual.toString("base64") === signature &&
    timingSafeEqual(actual, expected)
  );
}

async function replyToTextMessage(event, accessToken) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [{ type: "text", text: event.message.text }],
    }),
  });

  if (!response.ok) {
    throw new Error(`LINE reply API returned ${response.status}`);
  }
}

export async function POST(request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return Response.json(
      { error: "LINE_CHANNEL_SECRET is not configured" },
      { status: 500 },
    );
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-line-signature");

  if (!hasValidSignature(rawBody, signature, channelSecret)) {
    return Response.json({ error: "Invalid LINE signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || !Array.isArray(payload.events)) {
    return Response.json(
      { error: "Invalid LINE webhook payload" },
      { status: 400 },
    );
  }

  const textEvents = payload.events.filter(
    (event) =>
      event?.type === "message" &&
      event.message?.type === "text" &&
      typeof event.message.text === "string" &&
      typeof event.replyToken === "string",
  );

  if (textEvents.length > 0) {
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!accessToken) {
      return Response.json(
        { error: "LINE_CHANNEL_ACCESS_TOKEN is not configured" },
        { status: 500 },
      );
    }

    try {
      await Promise.all(
        textEvents.map((event) => replyToTextMessage(event, accessToken)),
      );
    } catch {
      return Response.json(
        { error: "Failed to reply through LINE" },
        { status: 502 },
      );
    }
  }

  return Response.json({ ok: true, processedTextEvents: textEvents.length });
}
