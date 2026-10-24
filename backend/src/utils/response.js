/**
 * utils/response.js
 * ─────────────────────────────────────────────────────────────
 * Standardised JSON response helpers.
 *
 * Every API response has the same envelope shape:
 *
 *   {
 *     "success" : true | false,
 *     "message" : "Human-readable description",
 *     "data"    : { ... } | null,       ← present on success
 *     "error"   : { ... } | null,       ← present on failure
 *     "meta"    : { "timestamp": "..." } ← always present
 *   }
 *
 * Using a consistent envelope makes the frontend and any future
 * consumers trivial to integrate — they only need to check
 * `success` and either read `data` or `error`.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Send a successful JSON response.
 *
 * @param {import('express').Response} res
 * @param {object}  payload
 * @param {string}  payload.message  - Human-readable success message
 * @param {*}       [payload.data]   - Response body data
 * @param {number}  [payload.status] - HTTP status code (default 200)
 */
function sendSuccess(res, { message = 'OK', data = null, status = 200 } = {}) {
  return res.status(status).json({
    success : true,
    message,
    data,
    error   : null,
    meta    : { timestamp: new Date().toISOString() },
  });
}

/**
 * Send an error JSON response.
 *
 * @param {import('express').Response} res
 * @param {object}  payload
 * @param {string}  payload.message   - Human-readable error description
 * @param {number}  [payload.status]  - HTTP status code (default 500)
 * @param {string}  [payload.code]    - Machine-readable error code
 * @param {*}       [payload.details] - Optional debug details (dev only)
 */
function sendError(
  res,
  { message = 'Internal Server Error', status = 500, code = 'INTERNAL_ERROR', details = null } = {}
) {
  const body = {
    success : false,
    message,
    data    : null,
    error   : {
      code,
      ...(details !== null ? { details } : {}),
    },
    meta: { timestamp: new Date().toISOString() },
  };
  return res.status(status).json(body);
}

module.exports = { sendSuccess, sendError };
