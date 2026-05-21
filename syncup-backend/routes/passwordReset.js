import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import transporter from "../config/email.js";

const router = express.Router();

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        message: "This email address is not registered.",
      });
    }

    const rawToken    = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const rawCode     = crypto.randomInt(100000, 1000000).toString();
    const hashedCode  = crypto.createHash("sha256").update(rawCode).digest("hex");

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordCode    = hashedCode;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    // Prefer explicit FRONTEND_URL, then CLIENT_URL, then the request origin, then localhost
    const frontendBase = (process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173').replace(/\/$/, '');
    const resetURL = `${frontendBase}/reset-password?token=${rawToken}`;

    await transporter.sendMail({
      from: `"SyncUp" <${process.env.EMAIL_USER}>`,
      to:   user.email,
      subject: "Reset your SyncUp password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #1e293b; margin-bottom: 8px;">Reset your password</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hi ${user.fullName},<br/><br/>
            We received a request to reset your <strong>SyncUp</strong> password.
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Use the code below to reset your password in the app. It expires in <strong>1 hour</strong>.
          </p>
          <div style="margin: 24px 0; padding: 22px 28px; background: #fff; border-radius: 16px; border: 1px solid #cbd5e1; text-align: center;">
            <p style="margin: 0 0 8px; color: #1e293b; font-size: 14px; letter-spacing: 0.12em;">Your reset code</p>
            <p style="font-size: 28px; font-weight: 700; color: #2563eb; letter-spacing: 0.12em; margin: 0;">${rawCode}</p>
          </div>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            If you prefer, you can also follow the link below to open the reset page directly.
          </p>
          <a href="${resetURL}"
             style="display: inline-block; margin: 24px 0; padding: 14px 28px;
                    background: #76ABAE; color: #fff; text-decoration: none;
                    border-radius: 8px; font-weight: bold; font-size: 15px;">
            Reset Password
          </a>
          <p style="color: #94a3b8; font-size: 13px;">
            This code and link expire in <strong>1 hour</strong>.<br/>
            If you didn't request this, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #cbd5e1; font-size: 12px;">
            Or copy this link into your browser:<br/>
            <span style="color: #76ABAE;">${resetURL}</span>
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      message: "A 6-digit reset code has been sent to your email address.",
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, code, newPassword } = req.body;

    if (!newPassword || (!token && !code)) {
      return res.status(400).json({ message: "A reset token or code and a new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const lookup = {
      resetPasswordExpires: { $gt: Date.now() },
    };

    if (token) {
      lookup.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    } else {
      lookup.resetPasswordCode = crypto.createHash("sha256").update(code).digest("hex");
    }

    const user = await User.findOne(lookup);

    if (!user) {
      return res.status(400).json({
        message: "Reset code or link is invalid or has expired. Please request a new one.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful! You can now sign in." });

  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

export { router as default };