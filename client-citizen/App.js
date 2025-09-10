import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';

// This is a self-contained placeholder for our main App.js file.
// It doesn't import any custom components, so it will run immediately
// after creating the project.

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* StatusBar sets the color of the text/icons in the phone's top status bar */}
      <StatusBar barStyle="light-content" />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>NagarSeva</Text>
          <Text style={styles.tagline}>Your Bridge to a Better City</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            The official platform to report civic issues like potholes, broken streetlights, and overflowing bins directly to your local authorities.
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => alert('App navigation will be set up here!')}>
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// All the styling is done using StyleSheet for better performance and organization.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1B2A', // A dark, professional blue
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // Pushes content to top and button to bottom
    alignItems: 'center',
    padding: 30,
    paddingTop: 80, // More space at the top
    paddingBottom: 50, // More space for the button
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#E0E1DD', // An off-white color
    fontWeight: '300',
  },
  content: {
    // This view helps keep the description from stretching too wide
  },
  description: {
    fontSize: 16,
    color: '#A9B4C2', // A lighter, secondary text color
    textAlign: 'center',
    lineHeight: 24, // Improves readability
    marginTop: -100, // Pulls the description up into the middle space
  },
  button: {
    backgroundColor: '#3A86FF', // A bright, vibrant blue for the call to action
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 50, // A fully rounded "pill" shape
    shadowColor: "#000", // Adding a subtle shadow for depth
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});