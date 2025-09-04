// Configuration de l'API backend
// ⚠️ IMPORTANT: Configurez votre IP dans un fichier .env.local ou modifiez directement ci-dessous
// Pour émulateur Android: 10.0.2.2
// Pour appareil physique: votre IP locale (ex: 192.168.1.xxx)
// Vous pouvez trouver votre IP avec: ipconfig (Windows) ou ifconfig (Mac/Linux)

// TODO: Remplacez par votre IP locale ou utilisez des variables d'environnement
const API_HOST = process.env.EXPO_PUBLIC_API_HOST || '10.0.2.2'; // Par défaut émulateur Android
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3000';

export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;
export const API_URL = `${API_BASE_URL}/api`; // URL complète de l'API

// Interface pour les photos
export interface Photo {
  id: string;
  filename: string;
  originalName: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: string;
  downloadUrl: string;
  thumbnailUrl: string;
  tags?: string[];
}

// Interface pour l'upload
export interface PhotoUploadData {
  uri: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  address?: string;
  tags?: string[];
}

// Service API pour les photos
export class PhotoAPI {
  
  /**
   * Upload une photo vers le backend
   */
  static async uploadPhoto(photoData: PhotoUploadData): Promise<Photo> {
    try {
      console.log('Début upload photo vers:', `${API_URL}/photos/upload`);
      console.log('Données photo:', { 
        uri: photoData.uri, 
        latitude: photoData.latitude, 
        longitude: photoData.longitude 
      });

      const formData = new FormData();
      
      // Ajouter le fichier photo
      const photoFile = {
        uri: photoData.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      };
      
      formData.append('photo', photoFile as any);
      
      // Ajouter les métadonnées
      formData.append('latitude', photoData.latitude.toString());
      formData.append('longitude', photoData.longitude.toString());
      formData.append('timestamp', photoData.timestamp.toISOString());
      
      if (photoData.address) {
        formData.append('address', photoData.address);
      }
      
      if (photoData.tags && photoData.tags.length > 0) {
        formData.append('tags', photoData.tags.join(','));
      }

      console.log('Envoi de la requête...');
      const response = await fetch(`${API_URL}/photos/upload`, {
        method: 'POST',
        body: formData,
        // Ne pas définir Content-Type manuellement pour FormData
      });

      console.log('Réponse reçue:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur serveur:', errorData);
        throw new Error(errorData.error?.message || 'Erreur lors de l\'upload');
      }

      const result = await response.json();
      console.log('Upload réussi:', result);
      return result.data;
      
    } catch (error) {
      console.error('Erreur upload photo:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les photos
   */
  static async getPhotos(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    tags?: string[];
  }): Promise<{ data: Photo[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.tags) queryParams.append('tags', params.tags.join(','));

      const response = await fetch(`${API_URL}/photos?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des photos');
      }

      const result = await response.json();
      return {
        data: result.data,
        pagination: result.pagination
      };
      
    } catch (error) {
      console.error('Erreur récupération photos:', error);
      throw error;
    }
  }

  /**
   * Récupérer les photos pour la carte
   */
  static async getPhotosForMap(bounds?: {
    northEast: string;
    southWest: string;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (bounds) {
        queryParams.append('northEast', bounds.northEast);
        queryParams.append('southWest', bounds.southWest);
      }

      const response = await fetch(`${API_URL}/photos/map?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données carte');
      }

      const result = await response.json();
      return result.data;
      
    } catch (error) {
      console.error('Erreur récupération données carte:', error);
      throw error;
    }
  }

  /**
   * Récupérer les photos pour le calendrier
   */
  static async getPhotosForCalendar(year?: number, month?: number): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (year) queryParams.append('year', year.toString());
      if (month !== undefined) queryParams.append('month', month.toString());

      const response = await fetch(`${API_URL}/photos/calendar?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données calendrier');
      }

      const result = await response.json();
      return result.data;
      
    } catch (error) {
      console.error('Erreur récupération données calendrier:', error);
      throw error;
    }
  }

  /**
   * Supprimer une photo
   */
  static async deletePhoto(photoId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la suppression');
      }
      
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      throw error;
    }
  }
}
