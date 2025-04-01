import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: true,

  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email app password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: "Support < support@gudymedia.com >",
    to: email,
    subject: "Your OTP Code",
    // text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
    // html: `<h1>Your OTP code is: ${otp}. It will expire in 5 minutes.</h1>`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your OTP Code</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 500px; margin: 20px auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); text-align: center; }
                h1 { color: #333; }
                .otp-code { font-size: 24px; font-weight: bold; color: #007BFF; background: #f1f1f1; padding: 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
                p { font-size: 16px; color: #555; }
                .footer { margin-top: 20px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
        <div class="container">
            <h1>Your OTP Code</h1>
            <p>Use the OTP below to complete your verification. This code will expire in 5 minutes.</p>
            <div class="otp-code">${otp}</div>
            <p>If you did not request this OTP, please ignore this email.</p>
            <div class="footer">
                &copy; 2025 Gudy Media. All rights reserved.
            </div>
        </div>
        </body>
        </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error("Error sending OTP:", error);
  }
};
