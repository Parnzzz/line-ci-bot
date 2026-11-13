import { redis } from "@/lib/redis";

const RECIPIENTS_KEY = "line:recipients";

export async function addRecipient(userId) { //	เพิ่ม LINE User ID
  if (!userId) return;

  await redis.sadd(RECIPIENTS_KEY, userId);
}

export async function removeRecipient(userId) { //	ลบ LINE User ID
  if (!userId) return;

  await redis.srem(RECIPIENTS_KEY, userId);
}

export async function getRecipients() {  //ดึง LINE User ID ทั้งหมด
  return await redis.smembers(RECIPIENTS_KEY);
}