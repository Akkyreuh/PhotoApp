import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSubmit = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      if (isLogin) {
        // Connexion
        if (!formData.identifier || !formData.password) {
          Alert.alert('Erreur', 'Veuillez remplir tous les champs');
          return;
        }

        await login({
          identifier: formData.identifier,
          password: formData.password,
        });
      } else {
        // Inscription
        if (!formData.username || !formData.email || !formData.password || 
            !formData.firstName || !formData.lastName) {
          Alert.alert('Erreur', 'Veuillez remplir tous les champs');
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
          return;
        }

        if (formData.password.length < 6) {
          Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
          return;
        }

        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Une erreur est survenue'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      identifier: '',
      password: '',
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      confirmPassword: '',
    });
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons 
              name="camera" 
              size={64} 
              color={colors.tint} 
              style={styles.logo}
            />
            <Text style={[styles.title, { color: colors.text }]}>
              PhotoApp
            </Text>
            <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
              {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
            </Text>
          </View>

          <View style={styles.form}>
            {isLogin ? (
              // Formulaire de connexion
              <>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={colors.tabIconDefault} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                    placeholder="Email ou nom d'utilisateur"
                    placeholderTextColor={colors.tabIconDefault}
                    value={formData.identifier}
                    onChangeText={(value) => updateFormData('identifier', value)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={colors.tabIconDefault} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                    placeholder="Mot de passe"
                    placeholderTextColor={colors.tabIconDefault}
                    value={formData.password}
                    onChangeText={(value) => updateFormData('password', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={colors.tabIconDefault}
                    />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Formulaire d'inscription
              <>
                <View style={styles.row}>
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                      placeholder="Prénom"
                      placeholderTextColor={colors.tabIconDefault}
                      value={formData.firstName}
                      onChangeText={(value) => updateFormData('firstName', value)}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                      placeholder="Nom"
                      placeholderTextColor={colors.tabIconDefault}
                      value={formData.lastName}
                      onChangeText={(value) => updateFormData('lastName', value)}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={colors.tabIconDefault} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                    placeholder="Nom d'utilisateur"
                    placeholderTextColor={colors.tabIconDefault}
                    value={formData.username}
                    onChangeText={(value) => updateFormData('username', value)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={colors.tabIconDefault} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                    placeholder="Email"
                    placeholderTextColor={colors.tabIconDefault}
                    value={formData.email}
                    onChangeText={(value) => updateFormData('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={colors.tabIconDefault} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                    placeholder="Mot de passe"
                    placeholderTextColor={colors.tabIconDefault}
                    value={formData.password}
                    onChangeText={(value) => updateFormData('password', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={colors.tabIconDefault}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={colors.tabIconDefault} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
                    placeholder="Confirmer le mot de passe"
                    placeholderTextColor={colors.tabIconDefault}
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateFormData('confirmPassword', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.tint }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Se connecter' : 'S\'inscrire'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
              disabled={isLoading}
            >
              <Text style={[styles.toggleButtonText, { color: colors.tint }]}>
                {isLogin 
                  ? 'Pas de compte ? S\'inscrire' 
                  : 'Déjà un compte ? Se connecter'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  halfWidth: {
    width: '48%',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    padding: 12,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
