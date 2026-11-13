import { redis } from "@/lib/redis";

export async function GET() {
  await redis.set("line-bot:test", "connected");

  const result = await redis.get("line-bot:test");

  return Response.json({
    success: result === "connected",
    result,
  });
}