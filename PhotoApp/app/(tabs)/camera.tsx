import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { PhotoAPI, PhotoUploadData } from '@/services/api';
import { Image } from 'expo-image';

import { useThemeColor } from '@/hooks/useThemeColor';

export default function CameraScreen() {
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isUploading, setIsUploading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{
    uri: string;
    location?: { latitude: number; longitude: number };
    timestamp?: Date;
  } | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Demander les permissions au chargement
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    // Permission caméra
    if (!permission?.granted) {
      await requestPermission();
    }
    
    // Permission média
    if (!mediaPermission?.granted) {
      await requestMediaPermission();
    }
    
    // Permission localisation
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'L\'accès à la localisation est nécessaire pour enregistrer la position des photos.'
      );
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      // Prendre la photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo) {
        throw new Error('Impossible de prendre la photo');
      }

      // Obtenir la localisation
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Sauvegarder dans la galerie
      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }

      // Stocker la photo capturée pour prévisualisation
      setCapturedPhoto({
        uri: photo.uri,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la prise de photo.',
        [{ text: 'OK' }]
      );
    }
  };

  const uploadPhoto = async () => {
    if (!capturedPhoto) return;
    
    try {
      setIsUploading(true);

      // Préparer les données pour l'upload
      const uploadData: PhotoUploadData = {
        uri: capturedPhoto.uri,
        latitude: capturedPhoto.location!.latitude,
        longitude: capturedPhoto.location!.longitude,
        timestamp: capturedPhoto.timestamp!,
      };

      // Upload vers le backend
      await PhotoAPI.uploadPhoto(uploadData);

      Alert.alert(
        'Photo sauvegardée !',
        'Votre photo a été uploadée avec succès.',
        [{ text: 'OK' }]
      );

      // Réinitialiser l'état
      setCapturedPhoto(null);

    } catch (error) {
      console.error('Erreur upload photo:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de l\'upload de la photo. Vérifiez que le backend est démarré.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  const cancelPhoto = () => {
    setCapturedPhoto(null);
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Chargement de la caméra...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color={textColor + '50'} />
          <Text style={[styles.permissionTitle, { color: textColor }]}>
            Permission caméra requise
          </Text>
          <Text style={[styles.permissionText, { color: textColor }]}>
            Cette application a besoin d'accéder à votre caméra pour prendre des photos.
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: accentColor }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Rendu conditionnel en fonction de l'état
  if (capturedPhoto) {
    // Affichage de la prévisualisation de la photo
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedPhoto.uri }}
            style={styles.previewImage}
            contentFit="contain"
          />
          
          <View style={styles.previewActions}>
            <TouchableOpacity 
              style={[styles.previewButton, styles.cancelButton]}
              onPress={cancelPhoto}
              disabled={isUploading}
            >
              <Ionicons name="close-circle" size={28} color="white" />
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.previewButton, styles.saveButton, isUploading && styles.disabledButton]}
              onPress={uploadPhoto}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={28} color="white" />
                  <Text style={styles.buttonText}>Sauvegarder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Indicateur d'upload */}
          {isUploading && (
            <View style={styles.uploadIndicator}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.uploadText}>Upload en cours...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }
  
  // Affichage de la caméra
  return (
    <SafeAreaView style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
      >
        {/* Header avec bouton retourner caméra */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <Ionicons name="camera-reverse" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Footer avec bouton de prise de photo */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={takePicture}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  uploadIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
  },
  // Styles pour la prévisualisation
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: width,
    height: height - 200,
  },
  previewActions: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    minWidth: 150,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
