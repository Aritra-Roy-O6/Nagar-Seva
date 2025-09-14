import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const HomeScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f7" />
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>NagarSeva</Text>
            <Text style={styles.subtitle}>Your direct line to civic action.</Text>
        </View>

        <View style={styles.menuContainer}>
            {/* Navigation button to submit a new complaint */}
            <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={() => navigation.navigate('Complaint')}
            >
                <Text style={styles.buttonText}>Submit a New Report</Text>
            </TouchableOpacity>

            {/* Navigation button to view existing reports */}
            <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={() => navigation.navigate('MyReports')}
            >
                <Text style={styles.secondaryButtonText}>View My Reports</Text>
            </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f7',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // Pushes header to top, signout to bottom
    alignItems: 'center',
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  menuContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center', // Center buttons vertically
  },
  button: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#1E88E5',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E88E5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#1E88E5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signOutButton: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E53935', // A clear, distinct red for sign out
    marginBottom: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
