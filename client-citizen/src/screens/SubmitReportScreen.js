import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Image
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../context/AuthContext';

// --- API Configuration ---
const GEMINI_API_KEY = "AIzaSyBv93gC2KbtyHh_LOV_3ly8g0bU142sOmo";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const BACKEND_URL = "https://nagar-seva-1.onrender.com";

const departments = [
  "Public Health / Sanitation Department", "Engineering / Roads Department",
  "Street Lighting / Electrical Department", "Water Supply Department",
  "Building & Town Planning", "Parks & Horticulture Department",
  "Licensing / Trade & Markets Department", "Education & Community Services",
  "Fire & Emergency Services", "Health Department"
];

const ComplaintScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);

  // State Management
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [problemKeyword, setProblemKeyword] = useState('');
  const [assignedDepartment, setAssignedDepartment] = useState('');
  const [departmentId, setDepartmentId] = useState(null);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  // --- Core Functions (Permissions, Location, Image Picking) ---
  
  const requestPermissions = async () => {
    // Consolidated permission requests for a smoother user experience
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to tag complaint locations.');
      return false;
    }
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return false;
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  };
  
  const processImage = async (pickerResult) => {
    if (pickerResult.canceled || !pickerResult.assets || !pickerResult.assets[0]) {
      return; // User cancelled the action
    }
    const asset = pickerResult.assets[0];
    setImage({ uri: asset.uri });
    
    // Prioritize EXIF data, fallback to current location
    let locationData = null;
    if (asset.exif && asset.exif.GPSLatitude && asset.exif.GPSLongitude) {
        locationData = { latitude: asset.exif.GPSLatitude, longitude: asset.exif.GPSLongitude };
        Alert.alert("Location Found", "Extracted location data from image.");
    } else {
        try {
            locationData = await getCurrentLocation();
            Alert.alert("Location Captured", "Using your current GPS location for the report.");
        } catch (e) {
            Alert.alert("Location Error", "Could not get location. Please ensure your GPS is enabled.");
            setImage(null); // Clear image if location fails
            return;
        }
    }
    setLocation(locationData);
    // Reset manual inputs when a new image is processed
    setManualLatitude('');
    setManualLongitude('');
  };

  const handleChoosePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8, exif: true,
    });
    await processImage(result);
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.8, exif: true,
    });
    await processImage(result);
  };

  // --- API Functions (Backend, Gemini, Cloudinary) ---

  const getDepartmentId = async (departmentName) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/departments`, {
            headers: { 'Authorization': `Bearer ${userToken}` },
        });
        if (response.ok) {
            const depts = await response.json();
            const dept = depts.find(d => d.name === departmentName);
            return dept ? dept.id : 1;
        }
        return 1;
    } catch (error) {
        console.error('Error fetching departments:', error);
        return 1;
    }
  };

  const analyzeDescription = async () => {
    if (!description || description.length < 15) {
      Alert.alert("Invalid Input", "Please provide a more detailed description (at least 15 characters).");
      return;
    }
    setIsAnalyzing(true);
    // Reset previous results
    setProblemKeyword('');
    setAssignedDepartment('');
    setDepartmentId(null);
    const prompt = `Analyze the following complaint description: "${description}". From this list of departments: [${departments.map(d => `"${d}"`).join(', ')}]. Respond in a valid JSON format only, like this: {"keyword": "A single, unique keyword summarizing the issue (e.g., 'Pothole', 'GarbageOverflow')", "department": "The single most relevant department from the list"}`;
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (!result.candidates?.[0]?.content) throw new Error("Invalid response structure from Gemini API");
        
        const text = result.candidates[0].content.parts[0].text;
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        if (parsed.keyword && parsed.department && departments.includes(parsed.department)) {
            setProblemKeyword(parsed.keyword);
            setAssignedDepartment(parsed.department);
            const deptId = await getDepartmentId(parsed.department);
            setDepartmentId(deptId);
            Alert.alert("Analysis Complete", "Issue has been categorized successfully!");
        } else {
            throw new Error("API response missing keyword or department");
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        Alert.alert("Analysis Failed", `Could not analyze the description: ${error.message}`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const uploadImageToCloudinary = async (imageUri) => {
    const formData = new FormData();
    formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'complaint.jpg' });
    formData.append('upload_preset', 'hexsane'); 
    try {
        const response = await fetch('https://api.cloudinary.com/v1_1/de7v2t5uf/image/upload', {
            method: 'POST', body: formData,
        });
        const data = await response.json();
        if (data.secure_url) return data.secure_url;
        throw new Error('Cloudinary upload failed');
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        Alert.alert('Upload Failed', 'Could not upload image. A placeholder will be used.');
        return 'https://placeholder.co/600x400.png'; // Fallback
    }
  };

  const handleSubmit = async () => {
    // Check for all required fields
    if (!problemKeyword || !image) {
        Alert.alert("Incomplete Complaint", "Please analyze the description and add a photo before submitting.");
        return;
    }

    // Determine the latitude and longitude to use
    let submitLatitude, submitLongitude;
    if (manualLatitude && manualLongitude) {
      // If manual inputs are provided, use them
      submitLatitude = parseFloat(manualLatitude);
      submitLongitude = parseFloat(manualLongitude);
      console.log("Using manual location inputs.");
    } else if (location) {
      // Otherwise, use the location from the image/GPS
      submitLatitude = location.latitude;
      submitLongitude = location.longitude;
      console.log("Using location from image/GPS.");
    } else {
      // If no location data is available, stop submission
      Alert.alert("Location Missing", "Please provide location data either by taking a photo with GPS enabled, or by entering it manually.");
      return;
    }

    setIsSubmitting(true);
    try {
        const imageUrl = await uploadImageToCloudinary(image.uri);
        const payload = {
            problem: problemKeyword, description, image: imageUrl,
            latitude: submitLatitude,
            longitude: submitLongitude,
            dept: departmentId,
        };
        const response = await fetch(`${BACKEND_URL}/api/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`,
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok) {
            Alert.alert("Submission Successful!", `Your report for '${problemKeyword}' has been submitted.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } else {
            throw new Error(result.message || 'Failed to submit report');
        }
    } catch (error) {
        console.error("Submission Error:", error);
        Alert.alert("Submission Failed", error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Render Method ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity>
            <Text style={styles.backButtonText}></Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Complaint</Text>
        <View style={{width: 40}} />{/* Spacer to center title */}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Step 1: Description */}
        <View style={styles.card}>
            <Text style={styles.label}>1. Describe the Issue</Text>
            <TextInput
                style={styles.inputLarge}
                placeholder="e.g., 'Large pothole near the main bus stop is causing traffic problems...'"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
            />
            <TouchableOpacity
                style={[styles.button, styles.analyzeButton, (isAnalyzing || description.length < 15) && styles.buttonDisabled]}
                onPress={analyzeDescription}
                disabled={isAnalyzing || description.length < 15}>
                {isAnalyzing ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Analyze with AI</Text>}
            </TouchableOpacity>
            {problemKeyword ? (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>Keyword: <Text style={{fontWeight: 'normal'}}>{problemKeyword}</Text></Text>
                    <Text style={styles.resultText}>Department: <Text style={{fontWeight: 'normal'}}>{assignedDepartment}</Text></Text>
                </View>
            ) : null}
        </View>

        {/* Step 2: Photo & Location */}
        <View style={styles.card}>
            <Text style={styles.label}>2. Add Photo & Location</Text>
            <View style={styles.imagePickerContainer}>
                <TouchableOpacity style={[styles.button, styles.imageButton]} onPress={handleChoosePhoto}>
                    <Text style={styles.buttonText}>Upload</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.imageButton]} onPress={handleTakePhoto}>
                    <Text style={styles.buttonText}>Take Photo</Text>
                </TouchableOpacity>
            </View>
            {image && (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    {location && (
                        <Text style={styles.locationText}>
                            📍 Geo-tag from Photo: Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
                        </Text>
                    )}
                </View>
            )}

            {/* Manual Location Input */}
            <Text style={[styles.label, { marginTop: 15 }]}>Or, Enter Manually</Text>
            <View style={styles.manualLocationContainer}>
                <TextInput
                    style={styles.locationInput}
                    placeholder="Latitude"
                    placeholderTextColor={colors.textSecondary}
                    value={manualLatitude}
                    onChangeText={setManualLatitude}
                    keyboardType="numeric"
                />
                <TextInput
                    style={styles.locationInput}
                    placeholder="Longitude"
                    placeholderTextColor={colors.textSecondary}
                    value={manualLongitude}
                    onChangeText={setManualLongitude}
                    keyboardType="numeric"
                />
            </View>
        </View>
        
        {/* Step 3: Submission */}
        <TouchableOpacity
            style={[styles.button, styles.submitButton, (isSubmitting || !problemKeyword || !image) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !problemKeyword || !image}>
            {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Submit Complaint</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const colors = {
  primary: '#1f6d3dff',
  accent: '#FF9800',
  secondary: '#26A69A',
  background: '#f0f4f7',
  textPrimary: '#212121',
  textSecondary: '#757575',
  white: '#FFFFFF',
  border: '#E0E0E0',
  success: '#4CAF50',
  successBackground: '#E8F5E9',
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  container: { padding: 15, paddingBottom: 50 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  label: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.textPrimary, 
    marginBottom: 10 
  },
  inputLarge: {
    height: 120,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 15,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: { 
    color: colors.white, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  analyzeButton: {
    backgroundColor: colors.accent,
  },
  imageButton: {
    backgroundColor: colors.secondary,
    flex: 1,
  },
  submitButton: {
    backgroundColor: colors.primary,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
    elevation: 0,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  resultContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: colors.successBackground,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  resultText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: colors.border,
  },
  locationText: {
    fontStyle: 'italic',
    color: colors.textSecondary,
    fontSize: 12,
  },
  manualLocationContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  locationInput: {
    flex: 1,
    height: 50,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    borderColor: colors.border,
    borderWidth: 1,
  },
});

export default ComplaintScreen;