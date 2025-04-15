import { APIError } from "../utils/errorClass.js";
import { catchAsync } from "../utils/catchAsync.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import Otp from "../models/Otp.js";
import { generateOTP } from "../utils/generateOtp.js";

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  fullName: z.string(),
  name: z.object({
    firstName: z.string().min(1).max(30),
    lastName: z.string().min(1).max(30),
  }),
  email: z.string(),
  password: z.string().min(6),
});

// const handleErrors = (err) => {
//   // console.log(
//   //   err.message,
//   //   err.code,
//   //   "here-----------------",

//   // );

//   const errors = {};

//   if (err.message)
//     if (err.message === "Incorrect email") {
//       //Incorrect email
//       errors.email = "Email not registered";
//       errors.code = 404;
//     }
//   //Incorrect password
//   if (err.message === "Incorrect password") {
//     errors.password = "Password is incorrect";
//     errors.code = 401;
//   }

//   //Check if email exists
//   if (err.code === 11000 && err.message.includes("email")) {
//     errors.email = "Email Already Exists";
//     errors.code = 409;
//   }
//   //Check if username exists
//   if (err.code === 11000 && err.message.includes("username")) {
//     errors.username = "Username Already Exists";
//     errors.code = 409;
//   }

//   //Validation Errors
//   if (err.message.includes("User validation failed")) {
//     Object.values(err.errors).forEach(({ properties }) => {
//       // console.log("properties---------", properties);

//       errors[properties.path] = properties.message;
//       errors.error = properties.path;
//       errors.code = 400;
//     });
//   }

//   // if (err.errors) {
//   //   if (err.errors[0].validation === "email") {
//   //     errors[err.errors[0].validation] = err.errors[0].message;
//   //     errors.code = 400;
//   //   }
//   // }

//   return errors;
// };

const register = catchAsync(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);
  // const userExistss = await User.findOne({
  //   email: validatedData.email,
  //   username: validatedData.username,
  // });

  const {
    username,
    fullName,
    name: { firstName, lastName },
    email,
    password,
  } = validatedData;

  const userExists = await User.findOne({
    $or: [{ email }, { username }],
  });

  const isEmail = await User.findOne({ email });
  if (isEmail) throw new APIError(`Email already exists`, 400);
  const isUsername = await User.findOne({ username });
  if (isUsername) throw new APIError(`Username already exists`, 400);

  // return res.status(400).json({ message: "User already exists" });

  const user = await User.create(validatedData);

  const { password: _, ...userWithoutPassword } = user.toObject();
  res.status(201).json({
    status: true,
    message: "User registered successfully",
    user: userWithoutPassword,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, username, password } = req.body;

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user)
    throw new APIError(
      `Incorrect Crendetials. ${user.email ? user.email : user.username}`,
      400
    );
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new APIError("Incorrect password", 400);

  if (user.twoFAEnabled) {
    console.log("2FA enabled for user:", email);
    const emailUser = await generateOTP(email);
    // console.log("OTP sent to:auth", emailUser);
    return res.json({
      status: true,
      message: `OTP sent successfully to ${emailUser}`,
    });
  }

  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  const { password: _, ...userWithoutPassword } = user.toObject();
  res.status(200).json({
    token,
    user: userWithoutPassword,
  });
});

const verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user)
    return res.status(404).json({ status: false, message: "User not found" });

  const storedOtp = await Otp.findOne({ email, otp });

  if (!storedOtp) {
    return res.status(400).json({ status: false, message: "Invalid OTP" });
  }

  if (new Date() > storedOtp.expiresAt) {
    await Otp.deleteOne({ email, otp });
    return res.status(400).json({ status: false, message: "OTP expired" });
  }

  // OTP is valid, delete it from DB
  await Otp.deleteOne({ email });

  // Generate JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  const { password: _, ...userWithoutPassword } = user.toObject();

  res.status(200).json({
    status: true,
    message: "OTP verified successfully",
    token,
    user: { userWithoutPassword },
  });
});

const setPin = catchAsync(async (req, res) => {
  const { newPin } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ status: false, message: "User not found" });

  const isMatch = await bcrypt.compare(newPin, user.pin);
  if (isMatch)
    return res
      .status(400)
      .json({ status: false, message: "New PIN cannot be same as old PIN" });

  user.pin = newPin;
  await user.save();
  res.status(200).json({ success: true, message: "PIN updated successfully!" });
});

const updatePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ status: false, message: "User not found" });
  // console.log("user", user);

  const isMatchOld = await bcrypt.compare(oldPassword, user.password);
  if (!isMatchOld)
    return res
      .status(400)
      .json({ status: false, message: "Old password is incorrect" });

  const isMatch = await bcrypt.compare(newPassword, user.password);
  if (isMatch) {
    return res.status(400).json({
      status: false,
      message: "New password cannot be same as old password",
    });
  }

  user.password = newPassword;
  await user.save();
  res
    .status(200)
    .json({ success: true, message: "Password updated successfully!" });
});

const getProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select("-password");

  if (!user)
    return res.status(404).json({ status: false, message: "User not found" });
  res.status(200).json(user);
});

const updateProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;
  const user = await User.findByIdAndUpdate(
    userId,
    { name, email },
    { new: true, runValidators: true }
  ).select("-password");
  if (!user)
    return res.status(404).json({ status: false, message: "User not found" });
  res.status(200).json(user);
});

const toogle2FA = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user)
    return res.status(404).json({ status: false, message: "User not found" });
  //Toggle 2FA
  if (user.twoFAEnabled) {
    user.twoFAEnabled = false;
    await user.save();
    return res.json({ message: "2FA disabled" });
  }

  user.twoFAEnabled = true;
  await user.save();
  res.json({ message: "2FA enabled" });
});

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
