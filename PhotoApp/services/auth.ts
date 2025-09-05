import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_URL } from './api';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  lastLogin?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const TOKEN_KEY = '@photoapp_token';
const USER_KEY = '@photoapp_user';

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  async initialize(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const userStr = await AsyncStorage.getItem(USER_KEY);
      
      if (token && userStr) {
        this.token = token;
        this.user = JSON.parse(userStr);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur initialisation auth:', error);
      return false;
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('=== DEBUG INSCRIPTION ===');
      console.log('Inscription avec:', data);
      console.log('URL complète:', `${API_URL}/auth/register`);
      console.log('API_BASE_URL:', API_BASE_URL);
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Status réponse:', response.status);
      console.log('URL finale utilisée:', response.url);
      
      const result = await response.json();
      console.log('Réponse serveur:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'inscription');
      }

      await AsyncStorage.setItem(TOKEN_KEY, result.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.data.user));
      
      this.user = result.data.user;
      this.token = result.data.token;

      return result.data;
    } catch (error) {
      console.error('Erreur inscription:', error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('=== DEBUG CONNEXION ===');
      console.log('Connexion avec:', { identifier: credentials.identifier });
      console.log('URL complète:', `${API_URL}/auth/login`);
      console.log('API_BASE_URL:', API_BASE_URL);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('Status réponse:', response.status);
      console.log('URL finale utilisée:', response.url);
      
      const result = await response.json();
      console.log('Réponse serveur login:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la connexion');
      }

      await AsyncStorage.setItem(TOKEN_KEY, result.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.data.user));
      
      this.user = result.data.user;
      this.token = result.data.token;

      return result.data;
    } catch (error) {
      console.error('Erreur connexion:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    } finally {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      this.user = null;
      this.token = null;
    }
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  async updateProfile(data: Partial<Pick<User, 'firstName' | 'lastName' | 'username'>>): Promise<User> {
    try {
      if (!this.token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la mise à jour du profil');
      }

      this.user = result.data;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.data));

      return result.data;
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      if (!this.token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      throw error;
    }
  }

  async getProfile(): Promise<User> {
    try {
      if (!this.token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la récupération du profil');
      }

      this.user = result.data;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.data));

      return result.data;
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
