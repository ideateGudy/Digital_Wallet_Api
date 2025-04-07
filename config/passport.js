import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js"; // your existing User model
import dotenv from "dotenv";
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({
          email: profile.emails[0].value,
        });

        if (existingUser) return done(null, existingUser);

        // Create new user with Google data
        const newUser = new User({
          googleId: profile.id,
          fullName: profile.displayName,
          name: {
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
          },
          email: profile.emails[0].value,
          username: profile.emails[0].value.split("@")[0],
          password: Date.now().toString(), // Dummy password
        });

        await newUser.save();
        done(null, newUser);
      } catch (err) {
        done(err, null);
      }
    }
  )
);
