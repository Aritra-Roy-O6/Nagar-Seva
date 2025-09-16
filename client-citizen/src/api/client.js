import axios from 'axios';

// Replace 'YOUR_COMPUTER_IP_ADDRESS' with the actual IP address you found.
// The port must match the port your backend server is running on (e.g., 3001).
const apiClient = axios.create({
  baseURL: 'https://nagar-seva-1.onrender.com/api',
});

export default apiClient;
