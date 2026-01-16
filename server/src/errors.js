// Standardized error handling for API

export class ApiError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Standard error codes
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  COMMAND_BLOCKED: 'COMMAND_BLOCKED',
  
  // Not found errors (404)
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  BACKUP_NOT_FOUND: 'BACKUP_NOT_FOUND',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  
  // Validation errors (400)
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
  
  // Agent errors (503)
  AGENT_OFFLINE: 'AGENT_OFFLINE',
  AGENT_DISCONNECTED: 'AGENT_DISCONNECTED',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT'
};

// Error factory functions
export const Errors = {
  // Authentication
  unauthorized: (message = 'Authentication required') => 
    new ApiError(ErrorCodes.UNAUTHORIZED, message, 401),
  
  invalidToken: (message = 'Invalid or expired token') => 
    new ApiError(ErrorCodes.INVALID_TOKEN, message, 401),
  
  // Authorization
  forbidden: (message = 'Access forbidden') => 
    new ApiError(ErrorCodes.FORBIDDEN, message, 403),
  
  commandBlocked: (reason) => 
    new ApiError(ErrorCodes.COMMAND_BLOCKED, `Command blocked: ${reason}`, 403),
  
  // Not found
  agentNotFound: (agentId) => 
    new ApiError(ErrorCodes.AGENT_NOT_FOUND, `Agent not found: ${agentId}`, 404),
  
  groupNotFound: (groupName) => 
    new ApiError(ErrorCodes.GROUP_NOT_FOUND, `Group not found: ${groupName}`, 404),
  
  taskNotFound: (taskId) => 
    new ApiError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`, 404),
  
  userNotFound: (username) => 
    new ApiError(ErrorCodes.USER_NOT_FOUND, `User not found: ${username}`, 404),
  
  templateNotFound: (templateId) => 
    new ApiError(ErrorCodes.TEMPLATE_NOT_FOUND, `Template not found: ${templateId}`, 404),
  
  // Validation
  missingParameter: (param) => 
    new ApiError(ErrorCodes.MISSING_PARAMETER, `Missing required parameter: ${param}`, 400),
  
  invalidParameter: (param, reason) => 
    new ApiError(ErrorCodes.INVALID_PARAMETER, `Invalid parameter ${param}: ${reason}`, 400),
  
  duplicateEntry: (resource) => 
    new ApiError(ErrorCodes.DUPLICATE_ENTRY, `${resource} already exists`, 400),
  
  // Rate limiting
  rateLimitExceeded: (resetIn) => 
    new ApiError(ErrorCodes.RATE_LIMIT_EXCEEDED, `Rate limit exceeded. Try again in ${resetIn}ms`, 429),
  
  // Server errors
  internalError: (message = 'An unexpected error occurred') => 
    new ApiError(ErrorCodes.INTERNAL_ERROR, message, 500),
  
  databaseError: (message) => 
    new ApiError(ErrorCodes.DATABASE_ERROR, `Database error: ${message}`, 500),
  
  aiServiceError: (message) => 
    new ApiError(ErrorCodes.AI_SERVICE_ERROR, `AI service error: ${message}`, 500),
  
  // Agent errors
  agentOffline: (agentId) => 
    new ApiError(ErrorCodes.AGENT_OFFLINE, `Agent is offline: ${agentId}`, 503),
  
  agentDisconnected: (agentId) => 
    new ApiError(ErrorCodes.AGENT_DISCONNECTED, `Agent disconnected: ${agentId}`, 503)
};

// Express error handler middleware
export function errorHandler(err, req, res, next) {
  // Handle ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: err.message
      }
    });
  }
  
  // Handle unknown errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred'
    }
  });
}

// Async handler wrapper to catch errors
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
