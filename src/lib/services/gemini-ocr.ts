/**
 * Google Gemini Vision OCR Service using gemini-flash-latest
 * Extracts payment screenshot details (Platform, Amount, Sender, Memo, Status, Date)
 */

export interface ExtractedPaymentDetails {
  platform: "CashApp" | "Venmo" | "PayPal" | "Chime" | "Crypto" | "Other";
  amount: number | null;
  sender: string | null;
  memo: string | null;
  status: "Complete" | "Pending" | "Failed" | string | null;
  date: string | null;
  rawText?: string;
}

export async function extractPaymentDetailsFromImage(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<ExtractedPaymentDetails> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not set in environment.");
    return {
      platform: "Other",
      amount: null,
      sender: null,
      memo: null,
      status: "Failed",
      date: null,
    };
  }

  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

  const prompt = `
Extract exact details from this payment receipt image into strict JSON:
JSON keys:
- platform: ("CashApp" | "Venmo" | "PayPal" | "Chime" | "Crypto" | "Other")
- amount: number (e.g. 25.00 or 100.00 - read the exact dollar amount shown on the screenshot)
- sender: string (the name or handle of sender/recipient)
- memo: string (transaction ID or note text)
- status: string ("Complete" | "Pending" | "Failed")
- date: string

Output ONLY raw valid JSON. Do not include markdown codeblocks or extra text.
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    const jsonStr = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as ExtractedPaymentDetails;

    return {
      platform: parsed.platform || "Other",
      amount: parsed.amount !== undefined && parsed.amount !== null ? Number(parsed.amount) : null,
      sender: parsed.sender || null,
      memo: parsed.memo || null,
      status: parsed.status || "Complete",
      date: parsed.date || null,
      rawText,
    };
  } catch (error) {
    console.error("❌ Gemini Vision OCR extraction failed:", error);
    return {
      platform: "Other",
      amount: null,
      sender: null,
      memo: null,
      status: "Failed",
      date: null,
    };
  }
}
