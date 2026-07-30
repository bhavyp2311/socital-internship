/**
 * utils/otp.js - OTP codes and random tokens for email verification / invites.
 */

import crypto from "crypto";

export function generateOtp(length = 6) {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10);
  }
  return otp;
}

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}