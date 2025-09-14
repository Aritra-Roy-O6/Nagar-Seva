import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Image
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Exif from 'react-native-exif';
import { AuthContext } from '../context/AuthContext';

// --- Helper for Gemini API ---
// IMPORTANT: You must have a valid API key for the Gemini API.
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // Replace with your actual key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

const departments = [
  "Public Health / Sanitation Department",
  "Engineering / Roads Department",
  "Street Lighting / Electrical Department",
  "Water Supply Department",
  "Building & Town Planning",
  "Parks & Horticulture Department",
  "Licensing / Trade & Markets Department",
  "Education & Community Services",
  "Fire & Emergency Services",
  "Health Department"
];

const ComplaintScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext); // Assuming you store the auth token in context

  // State Management
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gemini API Results
  const [problemKeyword, setProblemKeyword] = useState('');
  const [assignedDepartment, setAssignedDepartment] = useState('');

  /**
   * Processes the selected image to extract geolocation data.
   */
  const processImage = async (uri) => {
    try {
      const exifData = await Exif.getExif(uri);
      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        const lat = exifData.GPSLatitude;
        const lon = exifData.GPSLongitude;
        setLocation({ latitude: lat, longitude: lon });
        setImage({ uri });
        Alert.alert("Success", "Geotagged image loaded successfully.");
      } else {
        Alert.alert(
          "Geolocation Not Found",
          "The selected image does not contain location data. Please upload a geotagged image or enable location services in your camera settings."
        );
        // Clear the failed image and location
        setImage(null);
        setLocation(null);
      }
    } catch (error) {
      console.error("EXIF Error:", error);
      Alert.alert("Error", "Could not read image metadata. Please try a different image.");
    }
  };

  const handleChoosePhoto = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets[0].uri) {
        processImage(response.assets[0].uri);
      }
    });
  };

  const handleTakePhoto = () => {
    launchCamera({ mediaType: 'photo', saveToPhotos: true }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
      } else if (response.assets && response.assets[0].uri) {
        processImage(response.assets[0].uri);
      }
    });
  };
  
  /**
   * Calls the Gemini API to analyze the complaint description.
   */
  const analyzeDescription = async () => {
    if (!description || description.length < 15) {
        Alert.alert("Please provide a more detailed description (at least 15 characters).");
        return;
    }

    setIsAnalyzing(true);
    setProblemKeyword('');
    setAssignedDepartment('');

    const prompt = `Analyze the following complaint description: "${description}". From this list of departments: [${departments.map(d => `"${d}"`).join(', ')}]. Respond in a valid JSON format only, like this: {"keyword": "A single, unique keyword summarizing the issue (e.g., 'Pothole', 'GarbageOverflow')", "department": "The single most relevant department from the list"}`;

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const result = await response.json();
      const text = result.candidates[0].content.parts[0].text;
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      if (parsed.keyword && parsed.department && departments.includes(parsed.department)) {
        setProblemKeyword(parsed.keyword);
        setAssignedDepartment(parsed.department);
      } else {
        throw new Error("Invalid response structure from API.");
      }

    } catch (error) {
      console.error("Gemini API Error:", error);
      Alert.alert("Analysis Failed", "Could not analyze the description. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Submits the complete complaint to the backend.
   */
  const handleSubmit = async () => {
      // Validation check
      if (!description || !image || !location || !problemKeyword || !assignedDepartment) {
          Alert.alert("Incomplete Complaint", "Please ensure description is analyzed, an image is uploaded, and all fields are filled.");
          return;
      }
      setIsSubmitting(true);
      try {
          // In a real app, you would first upload the image to a service like Cloudinary
          // and get a URL. For this example, we'll use a placeholder.
          const imageUrl = 'https://placeholder.co/600x400.png'; // Replace with actual uploaded image URL

          const payload = {
              problem: problemKeyword,
              description,
              image_url: imageUrl,
              latitude: location.latitude,
              longitude: location.longitude,
          };

          // This endpoint is from your index.js file
          const response = await fetch('YOUR_BACKEND_URL/api/reports', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userToken}`,
              },
              body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (response.ok) {
              Alert.alert(
                  "Complaint Submitted",
                  `Your report for '${problemKeyword}' has been successfully submitted. District: ${result.location.district}, Ward: ${result.location.ward}`,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f7" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Register a Complaint</Text>
            <Text style={styles.subtitle}>Describe your issue and provide a photo</Text>
        </View>

        {/* Description Input */}
        <Text style={styles.label}>1. Describe the Issue</Text>
        <TextInput
          style={styles.inputLarge}
          placeholder="e.g., 'There is a large pothole on the main road near the bus stop causing traffic problems.'"
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Gemini Analysis Section */}
        <TouchableOpacity style={styles.analyzeButton} onPress={analyzeDescription} disabled={isAnalyzing}>
            {isAnalyzing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Analyze Description</Text>}
        </TouchableOpacity>

        {problemKeyword ? (
            <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Issue Keyword:</Text>
                <Text style={styles.resultText}>{problemKeyword}</Text>
                <Text style={styles.resultLabel}>Assigned Department:</Text>
                <Text style={styles.resultText}>{assignedDepartment}</Text>
            </View>
        ) : null}
        
        {/* Image Upload Section */}
        <Text style={styles.label}>2. Add a Geotagged Photo</Text>
        <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={handleChoosePhoto}>
                <Text style={styles.buttonText}>Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={handleTakePhoto}>
                <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
        </View>

        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            <Text style={styles.locationText}>
                Location Captured: Lat: {location?.latitude.toFixed(4)}, Lon: {location?.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Submission Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
             {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Submit Complaint</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 25 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0D47A1' },
  subtitle: { fontSize: 16, color: '#555', marginTop: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10, marginTop: 15 },
  inputLarge: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  analyzeButton: {
    backgroundColor: '#FF9800', // An attention-grabbing color for the action
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#1E88E5',
  },
  resultLabel: { fontSize: 14, color: '#555', fontWeight: 'bold' },
  resultText: { fontSize: 16, color: '#0D47A1', marginBottom: 8 },
  imagePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageButton: {
    backgroundColor: '#26A69A',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  locationText: {
    fontStyle: 'italic',
    color: '#388E3C',
  },
  submitButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

export default ComplaintScreen;
