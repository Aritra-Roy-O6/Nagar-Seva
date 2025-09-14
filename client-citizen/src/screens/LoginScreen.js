import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';

// This is the updated login screen component.
const LoginScreen = ({ navigation }) => {
  // State variables for user input and loading status.
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useContext(AuthContext);

  // --- Backend Alignment Note ---
  // The 'signIn' function in your AuthContext should be updated
  // to make a POST request to the `/api/auth/login` endpoint,
  // sending { identifier: phone, password: password, userType: 'citizen' }.

  /**
   * Handles the login process when the user presses the login button.
   */
  const handleLogin = async () => {
    // Basic validation to ensure all fields are filled.
    if (!phone || !password) {
      Alert.alert('Login Error', 'Please enter your phone number and password.');
      return;
    }
    setIsLoading(true);
    try {
      // Calls the signIn function from AuthContext with 'citizen' user type.
      await signIn(phone, password, 'citizen');
      // On success, the AppNavigator will automatically switch screens.
    } catch (error) {
      // Displays an error message from the server or a generic one.
      const errorMessage = error.response?.data?.message || 'Invalid credentials or server error. Please try again.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f7" />
      <View style={styles.container}>
        {/* App Header */}
        <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your citizen account</Text>
        </View>
        
        {/* Phone Number Input with Country Code */}
        <View style={styles.phoneInputContainer}>
          <Text style={styles.countryCode}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="10-Digit Mobile Number"
            placeholderTextColor="#888"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry // Hides the password input.
        />
        
        {/* Login Button */}
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
          {isLoading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.buttonText}>Login</Text>
          }
        </TouchableOpacity>

        {/* Link to Register Screen */}
        <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={isLoading}>
          <Text style={styles.linkText}>Don't have an account? Register Here</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- Styles (Identical to RegisterScreen for consistency) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f7',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0D47A1', // A deep, official blue
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 55,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 15,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingRight: 15,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#1E88E5', // A strong, trustworthy blue
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 10,
    elevation: 2, // Simple shadow for Android
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkText: {
    marginTop: 25,
    color: '#0D47A1',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default LoginScreen;
