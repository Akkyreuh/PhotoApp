import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { PhotoAPI } from '@/services/api';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function MapScreen() {
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const accentColor = useThemeColor({ light: '#2f95dc', dark: '#2f95dc' }, 'tint');
  
  // Position initiale (Paris, France)
  const [region, setRegion] = useState({
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Marqueurs des photos
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fonction pour centrer la carte sur la position actuelle
  const centerOnUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Impossible d\'accéder à votre position');
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    }
  };

  // Charger les photos et la position au chargement
  useEffect(() => {
    const initializeMap = async () => {
      await loadPhotosForMap();
      await getInitialLocation();
    };

    initializeMap();
  }, []);

  const loadPhotosForMap = async () => {
    try {
      setLoading(true);
      const photosData = await PhotoAPI.getPhotosForMap();
      setMarkers(photosData);
    } catch (error) {
      console.error('Erreur chargement photos carte:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitialLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        Alert.alert(
          'Permission de localisation',
          'Pour une meilleure expérience, autorisez l\'accès à votre position pour centrer la carte sur votre localisation.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Autoriser', onPress: centerOnUserLocation }
          ]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la géolocalisation:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Carte</Text>
      </View>
      
      <View style={styles.mapContainer}>
        <MapView 
          style={styles.map}
          initialRegion={region}
          onRegionChange={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {markers.map((marker, index) => (
            <Marker
              key={marker.id || index}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              title={marker.title}
              description={`Photo du ${new Date(marker.timestamp).toLocaleDateString()}`}
            >
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{marker.title}</Text>
                  <Text style={styles.calloutDate}>
                    {new Date(marker.timestamp).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
        
        <TouchableOpacity 
          style={[styles.locationButton, { backgroundColor: accentColor }]}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  calloutContainer: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutDate: {
    fontSize: 14,
    color: '#666',
  },
});
