import { API_BASE_URL } from '../config';

// httpClient act as a "smart" API client that handles data traffic
// When a request fails because token expired, it stops traffic, gets a new pass and then lets the traffic through

type RequestConfig = RequestInit & {
    _retry?: boolean; // Custom flag to prevent infinite refresh loops
};

// Mutex (double click protection) to prevent multiple concurrent refresh requests
let isRefreshing = false;

// Queue to hold requests that failed while a refresh is in progress
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
}> = [];

// Helper function to resolve or reject all queued requests after refresh finishes
const processQueue = (error: any, token: any = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error); // Reject queued requests if refresh failed
        } else {
            prom.resolve(token); // Retry queued requests if refresh succeeded
        }
    });

    failedQueue = []; // Clear the queue after processing
};

// Main centralized HTTP client function
// Handles automatic token refresh, retries, request queueing
export const httpClient = async (endpoint: string, { ...customConfig }: RequestConfig = {}): Promise<Response> => {

    // Default JSON headers
    const headers: Record<string, string> = {};

    if (!(customConfig.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // Merge default headers with any custom headers + include credentials
    const config: RequestConfig = {
        method: customConfig.method || 'GET',
        headers: {
            ...headers,
            ...customConfig.headers,
        },
        credentials: 'include', // Always send cookies (HttpOnly access & refresh tokens)
        ...customConfig,
    };

    try {
        // Make the API request
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // If unauthorized (401), attempt to refresh token
        if (response.status === 401 && !config._retry) {

            // If refresh already in progress, queue this request
            if (isRefreshing) {

                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        // Retry original request after refresh completes
                        return httpClient(endpoint, { ...customConfig, _retry: true });
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            // Start refresh flow
            config._retry = true; // Mark request as retried
            isRefreshing = true;

            const refreshController = new AbortController();
            const refreshTimeout = setTimeout(() => refreshController.abort(), 8000);

            try {
                // Call backend refresh endpoint
                const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                    signal: refreshController.signal,
                });
                clearTimeout(refreshTimeout);

                if (!refreshResponse.ok) {
                    throw new Error('Refresh failed'); // Fail all queued requests
                }

                // Notify queued requests that refresh succeeded
                processQueue(null, 'refreshed');
                isRefreshing = false;

                // Retry original request after token is refreshed
                return httpClient(endpoint, config);

            } catch (err) {
                // If refresh fails, reject all queued requests
                processQueue(err, null);
                isRefreshing = false;
                throw err;
            }
        }

        return response; // Return normal response if not 401

    } catch (error) { // Network or other fetch error handling
        throw error;
    }
};
