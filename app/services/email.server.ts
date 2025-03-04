import invariant from "tiny-invariant";

import type { User } from "~/models/user.server";

// Check if Mailgun API keys are set
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

/**
 * Sends a password reset email to the user with a reset link
 */
export async function sendPasswordResetEmail(user: User, resetToken: string) {
  try {
    invariant(MAILGUN_API_KEY, "MAILGUN_API_KEY must be set");
    invariant(MAILGUN_DOMAIN, "MAILGUN_DOMAIN must be set");

    const resetUrl = `${APP_URL}/reset-password/${resetToken}`;
    const formData = new FormData();
    
    formData.append("from", `Coffee Diary <noreply@${MAILGUN_DOMAIN}>`);
    formData.append("to", user.email);
    formData.append("subject", "Reset Your Coffee Diary Password");
    formData.append(
      "text",
      `Hello,

You requested to reset your password for your Coffee Diary account.

Please click the link below to reset your password. This link will expire in 5 minutes:

${resetUrl}

If you did not request a password reset, please ignore this email.

Thanks,
The Coffee Diary Team`
    );
    formData.append(
      "html",
      `<p>Hello,</p>
<p>You requested to reset your password for your Coffee Diary account.</p>
<p>Please click the link below to reset your password. This link will expire in 5 minutes:</p>
<p><a href="${resetUrl}" style="padding: 10px 15px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
<p>If you did not request a password reset, please ignore this email.</p>
<p>Thanks,<br>The Coffee Diary Team</p>`
    );

    // Make the API call to Mailgun
    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const responseData = await response.text();
      console.error("Mailgun API error:", responseData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
} 