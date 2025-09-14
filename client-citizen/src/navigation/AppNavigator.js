import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context/AuthContext';

// Import all the screens for the navigator
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import SubmitReportScreen from '../screens/SubmitReportScreen';
import MyReportsScreen from '../screens/MyReportsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { userToken, isLoading } = useContext(AuthContext);

  // While the app is checking for a saved token, show a loading spinner.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {userToken == null ? (
        // No token found, user isn't signed in. Show auth screens.
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ title: 'Create Account', headerBackTitleVisible: false }}
          />
        </>
      ) : (
        // User is signed in. Show the main app screens.
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'NagarSeva Dashboard' }} />
          <Stack.Screen name="SubmitReport" component={SubmitReportScreen} options={{ title: 'Submit New Report' }} />
          <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'My Submitted Reports' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;

