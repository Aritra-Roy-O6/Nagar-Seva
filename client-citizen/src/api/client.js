import axios from 'axios';

// Replace 'YOUR_COMPUTER_IP_ADDRESS' with the actual IP address you found.
// The port must match the port your backend server is running on (e.g., 3001).
const apiClient = axios.create({
  baseURL: 'http://192.168.43.242:3001/api',
});

export default apiClient;
