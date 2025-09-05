import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { PhotoAPI } from '../../services/api';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import AuthenticatedImage from '../../components/AuthenticatedImage';

interface PhotoStats {
  totalPhotos: number;
  firstPhoto?: {
    timestamp: string;
    thumbnailUrl: string;
  };
  lastPhoto?: {
    timestamp: string;
    thumbnailUrl: string;
  };
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<PhotoStats>({ totalPhotos: 0 });

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Charger les statistiques des photos
  useEffect(() => {
    loadPhotoStats();
  }, []);

  const loadPhotoStats = async () => {
    try {
      setIsLoading(true);
      const response = await PhotoAPI.getPhotos();
      const photos = response.data || response;
      
      if (photos.length === 0) {
        setStats({ totalPhotos: 0 });
        return;
      }

      // Trier les photos par date
      const sortedPhotos = photos.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setStats({
        totalPhotos: photos.length,
        firstPhoto: {
          timestamp: sortedPhotos[0].timestamp,
          thumbnailUrl: sortedPhotos[0].thumbnailUrl
        },
        lastPhoto: {
          timestamp: sortedPhotos[sortedPhotos.length - 1].timestamp,
          thumbnailUrl: sortedPhotos[sortedPhotos.length - 1].thumbnailUrl
        }
      });
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
      setStats({ totalPhotos: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: logout 
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Erreur de chargement du profil
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <Text style={styles.avatarText}>
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </Text>
          </View>
          <Text style={[styles.fullName, { color: colors.text }]}>
            {user.fullName}
          </Text>
          <Text style={[styles.username, { color: colors.tabIconDefault }]}>
            @{user.username}
          </Text>
        </View>

        {/* Statistiques des photos */}
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Chargement des statistiques...</Text>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Statistiques des photos
            </Text>
            
            <View style={[styles.infoItem, { borderBottomColor: colors.tabIconDefault }]}>
              <Ionicons name="images-outline" size={20} color={colors.tint} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>
                  Nombre total de photos
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {stats.totalPhotos} photo{stats.totalPhotos > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {stats.firstPhoto && (
              <View style={[styles.infoItem, { borderBottomColor: colors.tabIconDefault }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.tint} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>
                    Première photo
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(stats.firstPhoto.timestamp).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
                {stats.firstPhoto.thumbnailUrl && (
                  <AuthenticatedImage
                    path={stats.firstPhoto.thumbnailUrl}
                    style={styles.photoPreview}
                    contentFit="cover"
                  />
                )}
              </View>
            )}

            {stats.lastPhoto && (
              <View style={[styles.infoItem, { borderBottomColor: colors.tabIconDefault }]}>
                <Ionicons name="time-outline" size={20} color={colors.tint} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>
                    Dernière photo
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(stats.lastPhoto.timestamp).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
                {stats.lastPhoto.thumbnailUrl && (
                  <AuthenticatedImage
                    path={stats.lastPhoto.thumbnailUrl}
                    style={styles.photoPreview}
                    contentFit="cover"
                  />
                )}
              </View>
            )}

            {stats.totalPhotos === 0 && (
              <View style={styles.noPhotosContainer}>
                <Ionicons name="camera-outline" size={48} color={colors.tabIconDefault} />
                <Text style={[styles.noPhotosText, { color: colors.tabIconDefault }]}>
                  Aucune photo enregistrée
                </Text>
                <Text style={[styles.noPhotosSubtext, { color: colors.tabIconDefault }]}>
                  Commencez à prendre des photos pour voir vos statistiques !
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  photoPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 10,
  },
  noPhotosContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noPhotosText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  noPhotosSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
});
