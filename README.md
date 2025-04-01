# 🏦 Digital Wallet API

A secure and user-friendly **Digital Wallet API** built with **Express.js** and **Mongodb**.
- This API provides user authentication, transaction processing, currency conversion, and two-factor authentication (2FA) functionalities.
## 🚀 Features

- **User Authentication** (JWT-based)
- **Currency Conversion Support**
- **2FA & OTP Verification: Enable/disable 2FA, OTP verification.**
- **Currency Conversion: Convert amounts between different currencies using `exchangerate-api`.**
- **Transaction Management: Deposit, withdraw, transfer, transaction history.**

## 🛠 Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDb (via mongoose)
- **Security:** JWT, bcryptjs
- **Other Tools:** Nodemon, axios, nodemailer, otp-generator, zod, Dotenv (environment management)

## ⚡ Getting Started

---

### Installation & Setup

Steps to Run Locally

1. Clone the repository:

git clone https://github.com/your-repo.git
cd your-repo
```bash
git clone https://github.com/ideateGudy/Digital_Wallet_Api
cd Digital_Wallet_Api

```

2. Install dependencies:

npm install


3. Create a .env file with the following variables:

PORT=3000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
APP_PASS=your_app_password_for_nodemailer

4. Start the server:

npm run dev




---

## API Endpoints


### **Authentication**
```markdown
| Method | Endpoint                 | Description                  | Authentication |
|--------|--------------------------|------------------------------|---------------|
| POST   | `/api/auth/register`     | Register a new user          | ❌ No        |
| POST   | `/api/auth/login`        | Login user                   | ❌ No        |
| GET    | `/api/auth/profile/:id`  | Get user profile             | ✅ Yes       |
| PATCH  | `/api/auth/profile/:id`  | Update user profile          | ✅ Yes       |
| POST   | `/api/auth/toogle-2fa`   | Enable/Disable 2FA           | ✅ Yes       |
| POST   | `/api/auth/verify-otp`   | Verify OTP for login         | ❌ No        |
| PATCH  | `/api/auth/set-pin`      | Set transaction PIN          | ✅ Yes       |
| PATCH  | `/api/auth/update-password` | Update user password    | ✅ Yes       |
```
### **Currency Conversion**
```markdown
| Method | Endpoint          | Description                     | Authentication |
|--------|-------------------|---------------------------------|---------------|
| POST   | `/api/currency/convert` | Convert currency          | ✅ Yes       |
```
### **Transactions**
```markdown
| Method | Endpoint               | Description                 | Authentication |
|--------|------------------------|-----------------------------|---------------|
| GET    | `/api/transactions/`   | Get user transactions       | ✅ Yes       |
| POST   | `/api/transactions/deposit` | Deposit money         | ✅ Yes       |
| POST   | `/api/transactions/withdraw` | Withdraw money       | ✅ Yes       |
| POST   | `/api/transactions/transfer` | Transfer money       | ✅ Yes       |
| POST   | `/api/transactions/transfer/verify-otp` | Verify OTP for transfers | ✅ Yes |
```
---

## OTP & 2FA Implementation

OTP is generated and sent via email using Nodemailer.

If 2FA is enabled, users must enter an OTP when logging in or making a transfer.

OTPs expire in 5 minutes.



---

## Default Transaction PIN

A pin is required for each transaction

A default PIN is set for each user to secure transactions.

Users can update their PIN in their profile settings.



---
