import axios from 'axios';
import { env } from '../config/env';

/**
 * Centralized Axios client for internal communication between backend and ai-service
 */
export const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 120000, // 120s maximum timeout for deep architecture analysis
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Secret': env.AI_SERVICE_SECRET,
  },
});

// Add a retry interceptor for handling transient errors (502, 503, 504, or network/timeout)
aiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // If config doesn't exist, reject
    if (!config) {
      return Promise.reject(error);
    }

    // Keep track of retry count
    config.__retryCount = config.__retryCount || 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1s base delay

    const status = error.response ? error.response.status : 0;
    const isTransientError = 
      !error.response || 
      [502, 503, 504].includes(status) ||
      error.code === 'ECONNABORTED' || // timeout
      error.code === 'ERR_NETWORK';

    if (isTransientError && config.__retryCount < maxRetries) {
      config.__retryCount += 1;
      console.warn(`[AI Client] Transient error encountered (${status || error.code}). Retrying request ${config.url} (${config.__retryCount}/${maxRetries}) after ${retryDelay * config.__retryCount}ms...`);
      
      // Delay before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, retryDelay * config.__retryCount));
      
      return aiClient(config);
    }

    return Promise.reject(error);
  }
);
