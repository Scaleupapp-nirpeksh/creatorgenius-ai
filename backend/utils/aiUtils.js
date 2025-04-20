// backend/utils/aiUtils.js

/**
 * Execute an OpenAI API call with retries
 * @param {Function} apiCallFn - Function that makes the actual API call
 * @param {Number} maxRetries - Maximum number of retry attempts
 * @returns {Promise} - Result of the API call
 */
async function withRetry(apiCallFn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Attempt the API call
        return await apiCallFn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!isRetryableError(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff (100ms, 200ms, 400ms, etc.)
        const delay = exponentialDelay(attempt);
        console.warn(`OpenAI API call failed, retrying in ${delay}ms (Attempt ${attempt + 1}/${maxRetries})`, 
          { error: error.message, status: error.status });
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we've exhausted all retries
    throw lastError;
  }
  
  // Helper to determine if an error is retryable
  function isRetryableError(error) {
    // Retry on rate limits, server errors, or network issues
    return (
      error.status === 429 || // Too Many Requests
      error.status === 500 || // Internal Server Error
      error.status === 503 || // Service Unavailable
      error.message.includes('timeout') ||
      error.message.includes('network')
    );
  }
  
  // Helper for exponential backoff (Local Implementation)
  function exponentialDelay(attempt) {
    return Math.min(100 * Math.pow(2, attempt), 3000); // Cap at 3 seconds
  }
  
  module.exports = { withRetry };
  