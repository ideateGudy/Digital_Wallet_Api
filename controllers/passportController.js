import jwt from "jsonwebtoken";

const googleAuthCallback = (req, res) => {
  const user = req.user;

  const payload = {
    id: user._id,
    username: user.username,
    email: user.email,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.status(200).json({
    message: "Login successful",
    token,
    user,
  });
};

const googleLogout = (req, res) => {
  //logout and redirect to login page
  req.logout(() => {
    console.log("User logged out successfully.");
    res.redirect("/auth/login");
  });

  // res.status(200).json({ message: "Logged out successfully" });
};

const googleLogin = (req, res) => {
  res.send(`<html><a href="/auth/google">Login with Google</a></html>`);
};

export { googleAuthCallback, googleLogout, googleLogin };
