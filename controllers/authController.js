import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const handleErrors = (err) => {
  // console.log(err.message, err.code, "here-----------------");

  const errors = {};

  if (err.message === "You are not authorized to view this page") {
    errors.message = "You are not authorized to view this page";
    errors.code = 401;
  }

  //Check if email is correct(Login)
  if (err.message === "Incorrect Email") {
    errors.email = "Email is Incorrect";
    errors.code = 401;
  }

  //Check if username is correct(Login)
  if (err.message === "Incorrect Username") {
    errors.username = "Username is Incorrect";
    errors.code = 401;
  }

  //if user is not found
  if (err.message === "Invalid Credentials") {
    errors.invalid = "User Not Found";
    errors.code = 404;
  }

  //Check if password is correct(Login)
  if (err.message === "Incorrect Password") {
    errors.password = "Password is Incorrect";
    errors.code = 401;
  }

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
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
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

export { register, login, getProfile, updateProfile };
