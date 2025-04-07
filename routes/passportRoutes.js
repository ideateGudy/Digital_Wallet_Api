import express from "express";
import passport from "passport";

const router = express.Router();

import {
  googleAuthCallback,
  googleLogout,
  googleLogin,
} from "../controllers/passportController.js"; // Import your controller function

// Generate Google login URL
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Handle callback from Google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/login",
  }),
  googleAuthCallback
);

// Handle logout
router.get("/logout", googleLogout);

// Login with Google link
router.get("/login", googleLogin);

export default router;
