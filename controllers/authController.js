import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import Otp from "../models/Otp.js";
import { generateOTP } from "../utils/generateOtp.js";

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  name: z.object({
    firstName: z.string().min(1).max(30),
    lastName: z.string().min(1).max(30),
  }),
  email: z.string().email(() => "Invalid email"),
  password: z.string().min(6),
});

const handleErrors = (err) => {
  // console.log(err.message, err.code, "here-----------------");

  const errors = {};

  //Incorrect email
  if (err.message === "Incorrect email") {
    errors.email = "Email not registered";
    errors.code = 404;
  }
  //Incorrect password
  if (err.message === "Incorrect password") {
    errors.password = "Password is incorrect";
    errors.code = 401;
  }

  //Check if email exists
  if (err.code === 11000 && err.message.includes("email")) {
    errors.email = "Email Already Exists";
    errors.code = 409;
  }
  //Check if username exists
  if (err.code === 11000 && err.message.includes("username")) {
    errors.username = "Username Already Exists";
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
    const userExists = await User.findOne({
      email: validatedData.email,
      username: validatedData.username,
    });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create(validatedData);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Error-------", error);
    const errors = handleErrors(error);
    res
      .status(400)
      .json({ message: errors || error.errors || "Invalid input" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new Error("Incorrect email");
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new Error("Incorrect password");

    if (user.twoFAEnabled) {
      console.log("2FA enabled for user:", email);
      const resEmail = await generateOTP(email);
      console.log("OTP sent to:", resEmail);
      return res.json({ message: `OTP sent successfully to ${resEmail}` });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    res.json({
      token,
      user: { id: user._id, name: user.username, email: user.email },
    });
  } catch (error) {
    // console.error(error);
    const errors = handleErrors(error);
    res.status(errors.code || 400).json({ message: errors || "Bad Request" });
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
      await Otp.deleteOne({ email, otp });
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

  const isMatch = await bcrypt.compare(newPin, user.pin);
  if (isMatch)
    return res
      .status(400)
      .json({ message: "New PIN cannot be same as old PIN" });

  user.pin = newPin;
  await user.save();
  res.status(200).json({ success: true, message: "PIN updated successfully!" });
};
const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    // console.log("user", user);

    const isMatchOld = await bcrypt.compare(oldPassword, user.password);
    if (!isMatchOld)
      return res.status(400).json({ message: "Old password is incorrect" });

    const isMatch = await bcrypt.compare(newPassword, user.password);
    if (isMatch) {
      return res
        .status(400)
        .json({ message: "New password cannot be same as old password" });
    }

    user.password = newPassword;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    const errors = handleErrors(error);
    res.status(errors.code || 400).json({ message: errors || "Bad Request" });
  }
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

const toogle2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    //Toggle 2FA
    if (user.twoFAEnabled) {
      user.twoFAEnabled = false;
      await user.save();
      return res.json({ message: "2FA disabled" });
    }

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
  toogle2FA,
  verifyOTP,
  setPin,
  updatePassword,
};
