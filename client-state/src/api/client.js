import axios from 'axios';

const apiClient = axios.create({
  // Use the VITE_API_URL from your .env file for flexibility,
  // with a fallback to localhost for local development.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// This is an "interceptor". It's a special function that runs
// before any request is sent from the app.
apiClient.interceptors.request.use(
  (config) => {
    // 1. Get the admin's token from local storage.
    const token = localStorage.getItem('adminToken');

    // 2. If a token exists, add it to the 'Authorization' header.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. Return the modified request configuration.
    return config;
  },
  (error) => {
    // Handle any errors that occur during the request setup.
    return Promise.reject(error);
  }
);

export default apiClient;

