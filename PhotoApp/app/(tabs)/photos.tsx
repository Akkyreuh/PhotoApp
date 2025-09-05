import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PhotoAPI, Photo, API_URL, API_BASE_URL } from '@/services/api';
import AuthenticatedImage from '@/components/AuthenticatedImage';

import { useThemeColor } from '@/hooks/useThemeColor';

// Obtenir la largeur de l'écran pour calculer la taille des images
const { width } = Dimensions.get('window');
const numColumns = 3;
const tileSize = width / numColumns - 4;

export default function PhotosScreen() {
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  
  // État pour les photos et la modal
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les photos au montage du composant
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début chargement photos...');
      console.log('🌐 API_URL utilisée:', API_URL);
      
      const result = await PhotoAPI.getPhotos({ limit: 50 });
      
      console.log('📊 Réponse API reçue:', result);
      console.log('📸 Nombre de photos:', result.data?.length || 0);
      
      if (result.data && result.data.length > 0) {
        console.log('🖼️ Première photo:', result.data[0]);
        console.log('🔗 URL miniature générée:', `${API_URL}${result.data[0].thumbnailUrl}`);
      }
      
      setPhotos(result.data);
    } catch (error) {
      console.error('Erreur chargement photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  };

  // Fonction pour ouvrir une image en plein écran
  const openImage = (item: Photo) => {
    setSelectedImage(item);
    setModalVisible(true);
  };

  // Rendu d'une vignette d'image
  const renderPhotoItem = ({ item }: { item: Photo }) => {
    return (
      <TouchableOpacity onPress={() => openImage(item)} style={styles.photoItem}>
        <AuthenticatedImage
          path={item.thumbnailUrl}
          style={styles.thumbnail}
          contentFit="cover"
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Album Photo</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle" size={24} color={textColor} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={textColor} />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Chargement des photos...
          </Text>
        </View>
      ) : photos.length > 0 ? (
        <FlatList
          data={photos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.photoGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={80} color={textColor + '50'} />
          <Text style={[styles.emptyText, { color: textColor }]}>
            Aucune photo disponible
          </Text>
          <Text style={[styles.emptySubText, { color: textColor + '80' }]}>
            Utilisez l'onglet Caméra pour prendre des photos
          </Text>
          <TouchableOpacity 
            style={[styles.refreshButton, { borderColor: textColor }]}
            onPress={onRefresh}
          >
            <Text style={[styles.refreshButtonText, { color: textColor }]}>
              Actualiser
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Modal pour afficher l'image en plein écran */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
          
          {selectedImage && (
            <AuthenticatedImage
              path={selectedImage.downloadUrl}
              style={styles.fullImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  photoGrid: {
    padding: 2,
  },
  photoItem: {
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: tileSize,
    height: tileSize,
    backgroundColor: '#e1e4e8',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
  refreshButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
