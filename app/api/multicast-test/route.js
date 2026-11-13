import { sendMulticast } from "@/services/line-multicast.service";

export async function POST() {
  // อนุญาตให้ทดสอบเฉพาะ Local Development
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const result = await sendMulticast([
      {
        type: "text",
        text: "ทดสอบระบบ LINE Multicast สำเร็จ 🚀",
      },
    ]);

    return Response.json(result);
  } catch (error) {
    console.error("Multicast test failed:", error);

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}