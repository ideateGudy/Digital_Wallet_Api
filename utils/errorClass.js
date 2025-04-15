export class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "APIError";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
