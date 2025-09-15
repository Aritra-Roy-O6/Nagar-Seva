import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Pressable,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
// For a better experience, consider adding an icon library like 'react-native-vector-icons'
// import Icon from 'react-native-vector-icons/MaterialIcons';

const HomeScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const [isMenuVisible, setMenuVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* This Pressable acts as an overlay to close the menu when tapped outside */}
      {isMenuVisible && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setMenuVisible(false)}
        />
      )}

      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>NagarSeva</Text>
            <Text style={styles.governmentName}>Government of Jharkhand</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setMenuVisible(!isMenuVisible)}>
            {/* Replace 'U' with user's initial. An icon would be better here. */}
            <Text style={styles.profileInitial}>U</Text>
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu - Conditionally Rendered */}
        {isMenuVisible && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                signOut();
              }}>
              <Text style={styles.dropdownText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.welcomeMessage}>Welcome, Citizen</Text>
          <Text style={styles.subtitle}>
            How can we assist you today?
          </Text>

          {/* Menu Cards */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SubmitReport')}>
            {/* <Icon name="add-circle-outline" size={30} color={colors.primary} /> */}
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>+ Submit a New Report</Text>
                <Text style={styles.cardSubtitle}>Register a civic issue or complaint.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('MyReports')}>
            {/* <Icon name="history" size={30} color={colors.primary} /> */}
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>+ View My Reports</Text>
                <Text style={styles.cardSubtitle}>Check the status of your submitted reports.</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Digital Jharkhand Initiative</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Define a color palette for easy theme management
const colors = {
  primary: '#1f6d3dff', // Deep Navy Blue
  accent: '#ff8c00ff', // Saffron/Orange Accent
  background: '#f0f4f7',
  textPrimary: '#212121',
  textSecondary: '#757575',
  white: '#FFFFFF',
  border: '#E0E0E0',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  governmentName: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 90, // Adjust this value to position the dropdown correctly
    right: 20,
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    width: 150,
    zIndex: 1000, // Ensure dropdown is on top
  },
  dropdownItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  body: {
    flex: 1,
    padding: 20,
    marginTop: 0, // Pulls the body content slightly up over the header's curve
  },
  welcomeMessage: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 25,
  },
  card: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardContent: {
      marginLeft: 15, // Add margin if using icons
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  footer: {
      padding: 20,
      alignItems: 'center',
  },
  footerText: {
      fontSize: 12,
      color: colors.textSecondary,
  },
});

export default HomeScreen;