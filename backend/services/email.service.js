/**
 * services/email.service.js - Sends transactional email via Brevo's API.
 */

import axios from "axios";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function senderPayload() {
  return {
    email: process.env.BREVO_SENDER_EMAIL,
    name: process.env.BREVO_SENDER_NAME || "Nagar AI",
  };
}

const BASE_LAYOUT = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#1d4ed8;padding:28px 32px;text-align:center">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="left" style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">
              Nagar AI
            </td>
            <td align="right" style="color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:1px">
              Municipal Services
            </td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 32px">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6">
            This is an automated message from Nagar AI Municipal Management System.<br>
            Please do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export async function sendOtpEmail(toEmail, toName, otp) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1c1917;font-weight:600">Verify Your Email</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
      Hi <strong>${toName}</strong>,
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6">
      Use the verification code below to complete your registration. This code expires in <strong>10 minutes</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 24px">
      <div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:10px;padding:18px 32px;display:inline-block">
        <span style="font-size:28px;font-weight:700;color:#1d4ed8;letter-spacing:6px;font-family:monospace">${otp}</span>
      </div>
    </td></tr></table>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center">
      If you did not request this, please ignore this email.
    </p>`;

  await axios.post(
    BREVO_API_URL,
    {
      sender: senderPayload(),
      to: [{ email: toEmail, name: toName }],
      subject: `Your verification code: ${otp}`,
      htmlContent: BASE_LAYOUT("Verify Your Email", content),
    },
    { headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" } }
  );
}

export async function sendWorkerInviteEmail(toEmail, toName, setPasswordUrl) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1c1917;font-weight:600">You're Invited!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
      Hi <strong>${toName}</strong>,
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6">
      You've been invited to join the <strong>Nagar AI Municipal Management System</strong>. Click the button below to set your password and activate your account.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 28px">
      <a href="${setPasswordUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 36px;border-radius:8px;letter-spacing:0.2px">
        Set Your Password
      </a>
    </td></tr></table>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin-bottom:24px">
      <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">Or copy this link:</p>
      <p style="margin:0;font-size:12px;color:#3b82f6;word-break:break-all;line-height:1.5">${setPasswordUrl}</p>
    </div>
    <p style="margin:0;font-size:13px;color:#ef4444;line-height:1.5">
      This link expires in <strong>48 hours</strong>.
    </p>`;

  await axios.post(
    BREVO_API_URL,
    {
      sender: senderPayload(),
      to: [{ email: toEmail, name: toName }],
      subject: "Set up your Nagar AI account",
      htmlContent: BASE_LAYOUT("You're Invited!", content),
    },
    { headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" } }
  );
}
