import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar, FlatList,
  ActivityIndicator, Image, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/client'; // Your axios instance

/**
 * A helper component to render the status with a specific style.
 */
const StatusBadge = ({ status }) => {
  const statusStyles = {
    submitted: {
      backgroundColor: '#E3F2FD',
      borderColor: '#1E88E5',
      color: '#0D47A1',
    },
    in_progress: {
      backgroundColor: '#FFF3E0',
      borderColor: '#FB8C00',
      color: '#E65100',
    },
    resolved: {
      backgroundColor: '#E8F5E9',
      borderColor: '#43A047',
      color: '#1B5E20',
    },
  };

  const style = statusStyles[status] || statusStyles['submitted'];
  const formattedStatus = status.replace('_', ' ').toUpperCase();

  return (
    <View style={[styles.statusBadge, { backgroundColor: style.backgroundColor, borderColor: style.borderColor }]}>
      <Text style={[styles.statusText, { color: style.color }]}>{formattedStatus}</Text>
    </View>
  );
};

/**
 * A component to render a single report card in the list.
 */
const ReportCard = ({ item }) => {
  return (
    <View style={styles.card}>
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardProblem}>{item.problem}</Text>
            <StatusBadge status={item.status} />
        </View>
        <Text style={styles.cardDescription}>{item.description}</Text>
        <View style={styles.cardFooter}>
            <Text style={styles.cardDate}>
                Reported on: {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.cardLocation}>
                {item.district}, Ward {item.ward}
            </Text>
        </View>
      </View>
    </View>
  );
};

const MyReportsScreen = () => {
  const { userToken } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch reports from the backend
  const fetchReports = async () => {
    try {
      setError(null); // Reset error on new fetch
      const response = await apiClient.get('/citizen/my-reports', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      setReports(response.data);
    } catch (e) {
      console.error("Failed to fetch reports:", e);
      setError("Could not load your reports. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // useFocusEffect runs when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true); // Show loader when screen is focused
      fetchReports();
    }, [userToken]) // Re-run if the token changes
  );

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#0D47A1" style={styles.centered} />;
    }
    if (error) {
      return <Text style={[styles.centered, styles.errorText]}>{error}</Text>;
    }
    if (reports.length === 0) {
      return <Text style={[styles.centered, styles.infoText]}>You have not submitted any reports yet.</Text>;
    }
    return (
      <FlatList
        data={reports}
        renderItem={({ item }) => <ReportCard item={item} />}
        keyExtractor={(item, index) => `${item.problem}-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchReports} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f7" />
      <View style={styles.header}>
        <Text style={styles.title}>My Submitted Reports</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4f7' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0D47A1', textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  infoText: { fontSize: 16, color: '#555' },
  errorText: { fontSize: 16, color: '#D32F2F' },
  listContainer: { padding: 15 },
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 180, backgroundColor: '#eee' },
  cardContent: { padding: 15 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardProblem: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1, // Allow text to wrap
    marginRight: 10,
  },
  cardDescription: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 15 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  cardDate: { fontSize: 12, color: '#888' },
  cardLocation: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  // Status Badge Styles
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
});

export default MyReportsScreen;
