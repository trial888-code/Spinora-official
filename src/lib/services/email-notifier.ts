/**
 * Email Confirmation Notification Service
 * Sends email notices when money gets deposited or flagged for review
 */

export interface DepositEmailPayload {
  toEmail: string;
  userName?: string;
  amount: number;
  platform: string;
  status: "verified" | "pending_review" | "rejected";
  orderId: string;
}

export async function sendDepositStatusEmail(payload: DepositEmailPayload) {
  const { toEmail, userName, amount, platform, status, orderId } = payload;

  console.log(`📧 Sending Deposit Status Email to ${toEmail}:`, {
    Order: orderId,
    Amount: `$${amount.toFixed(2)}`,
    Platform: platform,
    Status: status,
  });

  const isVerified = status === "verified";
  const subject = isVerified
    ? `✅ Payment Confirmed — $${amount.toFixed(2)} Deposited to Spinora`
    : `⏳ Deposit Notification — Order #${orderId.slice(0, 8)}`;

  const htmlBody = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #333; background: #0f0b1e; color: #fff; border-radius: 12px;">
  <h2 style="color: ${isVerified ? "#34d399" : "#fbbf24"}; margin-top: 0;">
    ${isVerified ? "✅ Deposit Verified & Credited!" : "⏳ Payment Under Review"}
  </h2>
  <p>Hello <strong>${userName || "Valued Player"}</strong>,</p>
  <p>
    ${
      isVerified
        ? `Your payment of <strong>$${amount.toFixed(2)}</strong> via <strong>${platform}</strong> has been successfully verified and credited to your Spinora Play Balance!`
        : `Your payment screenshot for <strong>$${amount.toFixed(2)}</strong> via <strong>${platform}</strong> has been received and is pending email confirmation.`
    }
  </p>
  <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Order ID:</strong> <code>#${orderId}</code></p>
    <p style="margin: 5px 0;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
    <p style="margin: 5px 0;"><strong>Method:</strong> ${platform}</p>
    <p style="margin: 5px 0;"><strong>Status:</strong> ${status.toUpperCase()}</p>
  </div>
  <p style="color: #9ca3af; font-size: 12px;">Spinora Automated Payment Verification System</p>
</div>
`;

  try {
    // If custom SMTP or Resend API Key is set in environment
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Spinora Payments <payments@spinoracasinos.com>",
          to: [toEmail],
          subject,
          html: htmlBody,
        }),
      });
    }
    return { ok: true };
  } catch (err) {
    console.error("❌ Email notification error:", err);
    return { ok: false };
  }
}
