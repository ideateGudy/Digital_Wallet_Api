import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import Otp from "../models/Otp.js";
import { generateOTP } from "../utils/generateOtp.js";

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const handleErrors = (err) => {
  // console.log(err.message, err.code, "here-----------------");

  const errors = {};

  //Check if email exists
  if (err.code === 11000 && err.message.includes("email")) {
    errors.email = "Email Already Exists";
    errors.code = 409;
  }

  //Validation Errors
  if (err.message.includes("User validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      // console.log("properties---------", properties);

      errors[properties.path] = properties.message;
      errors.error = properties.path;
      errors.code = 400;
    });
  }

  return errors;
};

const register = async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const userExists = await User.findOne({ email: validatedData.email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create(validatedData);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(400).json({ message: error.errors || "Invalid input" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!user || !validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.twoFAEnabled) {
      const resEmail = await generateOTP(email);
      return res.json({ message: `OTP sent successfully to ${resEmail}` });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const storedOtp = await Otp.findOne({ email, otp });

    if (!storedOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > storedOtp.expiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // OTP is valid, delete it from DB
    await Otp.deleteOne({ email });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      status: "success",
      message: "OTP verified successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

const setPin = async (req, res) => {
  const { newPin } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.pin = newPin; // Hash the new PIN before saving
  await user.save();
  return { success: true, message: "PIN set successfully!" };
};

const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    const errors = handleErrors(error);
    res.status(errors.code || 400).json({ message: errors || "Bad Request" });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    // console.error(error);
    const errors = handleErrors(error);
    res.status(errors.code || 400).json({ message: errors || "Invalid input" });
  }
};

const enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.twoFAEnabled = true;
    await user.save();
    res.json({ message: "2FA enabled" });
  } catch (error) {
    res.status(500).json({ message: "Error enabling 2FA" });
  }
};

export {
  register,
  login,
  getProfile,
  updateProfile,
  enable2FA,
  verifyOTP,
  setPin,
};
