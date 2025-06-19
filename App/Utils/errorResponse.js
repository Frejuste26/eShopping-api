class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message); // Calls the parent Error class constructor with the message
        this.statusCode = statusCode; // Stores the HTTP status code (e.g., 404, 500)
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // Sets status as 'fail' for 4xx errors, 'error' for others
        this.isOperational = true; // Indicates the error is operational (not a programming error)

        Error.captureStackTrace(this, this.constructor); // Captures stack trace, excluding constructor call
    }
}
export default ErrorResponse; // Exports the class as the default export