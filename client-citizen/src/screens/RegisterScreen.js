import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';

// This is the updated registration screen component.
const RegisterScreen = ({ navigation }) => {
  // State variables for user input and loading status.
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useContext(AuthContext);

  // --- Backend Alignment Note ---
  // The 'register' function in your AuthContext should be updated
  // to make a POST request to the `/api/auth/citizen/register` endpoint,
  // sending { name: fullName, phone_no: phone, password: password }.

  /**
   * Handles the registration process when the user presses the register button.
   */
  const handleRegister = async () => {
    // Basic validation to ensure all fields are filled.
    if (!fullName || !phone || !password) {
      Alert.alert('Incomplete Information', 'Please fill in all fields.');
      return;
    }
    // Validates the 10-digit phone number format.
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    setIsLoading(true);
    try {
      // Calls the register function from AuthContext.
      await register(fullName, phone, password);
      // On a successful registration, you might want to show a success message
      // or rely on the AuthContext to navigate the user away.
      Alert.alert(
        'Registration Successful',
        'You can now log in with your phone number and password.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      // Displays an error message from the server or a generic one.
      const errorMessage = error.response?.data?.message || 'An unexpected error occurred. Please try again.';
      Alert.alert('Registration Failed', errorMessage);
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
            <Text style={styles.title}>Citizen Registration</Text>
            <Text style={styles.subtitle}>Create a new account to report issues</Text>
        </View>
        
        {/* Input Fields */}
        <TextInput
          style={styles.input}
          placeholder="Full Name (as per Aadhaar)"
          placeholderTextColor="#888"
          value={fullName}
          onChangeText={setFullName}
        />

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
        
        {/* Registration Button */}
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
          {isLoading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.buttonText}>Register</Text>
          }
        </TouchableOpacity>

        {/* Link to Login Screen */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
          <Text style={styles.linkText}>Already have an account? Login Here</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- Styles for the Component ---
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

export default RegisterScreen;