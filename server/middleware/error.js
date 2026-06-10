/**
 * Central error handler. Known client errors (4xx, e.g. body-parser
 * SyntaxError) keep their status; everything else becomes a generic 500.
 * Internal details are logged server-side, never sent to the client.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = Number(err.status ?? err.statusCode);
  if (status >= 400 && status < 500) {
    res.status(status).json({ message: 'invalid request' });
    return;
  }
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: 'internal server error' });
}

module.exports = { errorHandler };
