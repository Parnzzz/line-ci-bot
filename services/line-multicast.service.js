import { getRecipients } from "@/services/line-recipient.service";

const LINE_MULTICAST_URL =
  "https://api.line.me/v2/bot/message/multicast";

export async function sendMulticast(messages) {
  // 1. ตรวจสอบข้อความ
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 5) {
    throw new Error("Messages must contain between 1 and 5 items");
  }

  // 2. ดึงผู้รับทั้งหมดจาก Redis
  const recipients = await getRecipients();

  // 3. ไม่มีผู้รับ ไม่ต้องส่ง API
  if (recipients.length === 0) {
    console.log("No LINE recipients found");
    return {
      success: true,
      sent: 0,
    };
  }

  // 4. ตรวจสอบ LINE Channel Access Token
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");
  }

  // 5. แบ่งผู้รับเป็นกลุ่ม กลุ่มละไม่เกิน 500 คน
  const batches = [];

  for (let i = 0; i < recipients.length; i += 500) {
    batches.push(recipients.slice(i, i + 500));
  }

  // 6. ส่งข้อความให้แต่ละกลุ่ม
  for (const batch of batches) {
    const response = await fetch(LINE_MULTICAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: batch,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.error("LINE Multicast API failed:", {
        status: response.status,
        error: errorBody,
      });

      throw new Error(`LINE Multicast failed: ${response.status}`);
    }

    console.log(`LINE Multicast sent to ${batch.length} recipients`);
  }

  return {
    success: true,
    sent: recipients.length,
  };
}