import React, { useState, useEffect, memo } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { PhotoAPI } from '@/services/api';

interface AuthenticatedImageProps {
  path: string;
  style: any;
  contentFit?: any;
}

// Utilisation de memo pour éviter les re-rendus inutiles
const AuthenticatedImage = memo(({ path, style, contentFit = "cover" }: AuthenticatedImageProps) => {
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [imageUri, setImageUri] = useState<string>('');
  
  // Charger les headers une seule fois au montage
  useEffect(() => {
    let isMounted = true;
    
    const loadHeaders = async () => {
      try {
        const authHeaders = await PhotoAPI.getAuthHeaders();
        if (isMounted) {
          setHeaders(authHeaders);
        }
      } catch (error) {
        console.error('Erreur chargement headers:', error);
      }
    };
    
    // Générer l'URI de l'image
    const uri = PhotoAPI.getAuthenticatedImageUrl(path);
    setImageUri(uri);
    
    loadHeaders();
    
    // Nettoyage pour éviter les mises à jour sur un composant démonté
    return () => {
      isMounted = false;
    };
  }, [path]);
  
  // Éviter de rendre l'image si l'URI n'est pas défini ou si path est invalide
  if (!imageUri || !path) {
    return null;
  }
  
  return (
    <ExpoImage 
      source={{ uri: imageUri, headers }} 
      style={style} 
      contentFit={contentFit}
      cachePolicy="memory-disk"
    />
  );
});

export default AuthenticatedImage;
