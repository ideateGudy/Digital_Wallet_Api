import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: 'true, "Please enter a name' },
    email: {
      type: String,
      required: [true, "Please enter an email"],
      unique: true,
    },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    twoFAEnabled: { type: Boolean, default: false },
    pin: { type: String },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("pin")) return next();
  const salt = await bcrypt.genSalt();
  this.pin = await bcrypt.hash(this.pin, salt);
  next();
});

export default mongoose.model("User", UserSchema);
