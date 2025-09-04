import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PhotoAPI, Photo } from '@/services/api';
import { Image } from 'expo-image';
import { API_BASE_URL, API_URL } from '@/services/api';
import { useThemeColor } from '@/hooks/useThemeColor';

// Interface pour représenter un jour dans le calendrier
interface CalendarDay {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents?: boolean;
}

export default function CalendarScreen() {
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  
  // État pour suivre la date actuelle et la date sélectionnée
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);
  const [photosByDate, setPhotosByDate] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Fonction pour générer les jours du mois actuel
  const generateCalendarDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Premier jour du mois
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    // Dernier jour du mois
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Jours du mois précédent pour compléter la première semaine
    const daysFromPrevMonth = startingDayOfWeek;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
    
    const days: CalendarDay[] = [];
    
    // Ajouter les jours du mois précédent
    for (let i = daysInPrevMonth - daysFromPrevMonth + 1; i <= daysInPrevMonth; i++) {
      days.push({
        date: i,
        month: prevMonth,
        year: prevMonthYear,
        isCurrentMonth: false,
        isToday: false,
      });
    }
    
    // Ajouter les jours du mois actuel
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month,
        year,
        isCurrentMonth: true,
        isToday: i === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
        // Vérifier s'il y a des photos pour ce jour
        hasEvents: !!photosByDate[`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`],
      });
    }
    
    // Ajouter les jours du mois suivant pour compléter la dernière semaine
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const daysNeeded = 42 - days.length; // 6 semaines complètes (6*7=42)
    
    for (let i = 1; i <= daysNeeded; i++) {
      days.push({
        date: i,
        month: nextMonth,
        year: nextMonthYear,
        isCurrentMonth: false,
        isToday: false,
      });
    }
    
    return days;
  }, [currentDate, photosByDate]);

  // Charger les photos du mois au montage et changement de mois
  useEffect(() => {
    loadPhotosForMonth();
  }, [currentDate]);

  const loadPhotosForMonth = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const calendarData = await PhotoAPI.getPhotosForCalendar(year, month);
      
      // Transformer les données en objet indexé par date
      const photosByDateMap: {[key: string]: any} = {};
      calendarData.forEach((dayData: any) => {
        photosByDateMap[dayData.date] = dayData;
      });
      
      setPhotosByDate(photosByDateMap);
    } catch (error) {
      console.error('Erreur chargement photos calendrier:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Naviguer au mois précédent
  const goToPrevMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };
  
  // Naviguer au mois suivant
  const goToNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };
  
  // Fonction pour gérer la sélection d'un jour
  const selectDay = (day: CalendarDay) => {
    setSelectedDate(day);
  };
  
  // Fonction pour ouvrir une photo en plein écran
  const openPhoto = (photo: any) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  // Obtenir les photos pour le jour sélectionné
  const getPhotosForSelectedDay = () => {
    if (!selectedDate) return [];
    
    const dateKey = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.date).padStart(2, '0')}`;
    const dayData = photosByDate[dateKey];
    
    return dayData ? dayData.photos : [];
  };
  
  // Formater le nom du mois et l'année
  const formatMonthYear = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return currentDate.toLocaleDateString('fr-FR', options);
  };
  
  // Rendu d'un jour du calendrier
  const renderDay = ({ item }: { item: CalendarDay }) => {
    const isSelected = selectedDate && 
                      selectedDate.date === item.date && 
                      selectedDate.month === item.month && 
                      selectedDate.year === item.year;
    
    const dayTextColor = item.isCurrentMonth 
      ? item.isToday 
        ? accentColor 
        : textColor 
      : textColor + '50'; // 50% opacity for days not in current month
    
    return (
      <TouchableOpacity 
        style={[
          styles.dayCell, 
          isSelected && { backgroundColor: accentColor + '30' },
        ]}
        onPress={() => selectDay(item)}
      >
        <Text style={[styles.dayText, { color: dayTextColor }]}>{item.date}</Text>
        {item.hasEvents && <View style={[styles.eventDot, { backgroundColor: accentColor }]} />}
      </TouchableOpacity>
    );
  };
  
  const days = generateCalendarDays();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Calendrier</Text>
      </View>
      
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        
        <Text style={[styles.monthYearText, { color: textColor }]}>
          {formatMonthYear()}
        </Text>
        
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={textColor} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: textColor }]}>Chargement...</Text>
        </View>
      ) : (
        <>
          {/* Grille du calendrier */}
          <View style={styles.calendar}>
            {/* En-têtes des jours de la semaine */}
            <View style={styles.weekHeader}>
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, index) => (
                <Text key={index} style={[styles.weekDayText, { color: textColor }]}>
                  {day}
                </Text>
              ))}
            </View>
            
            {/* Grille des jours */}
            <FlatList
              data={days}
              renderItem={renderDay}
              numColumns={7}
              keyExtractor={(item, index) => `${item.year}-${item.month}-${item.date}-${index}`}
              style={styles.daysGrid}
            />
          </View>
          
          {/* Section des photos pour le jour sélectionné */}
          {selectedDate && (
            <View style={styles.photosSection}>
              <Text style={[styles.photosSectionTitle, { color: textColor }]}>
                Photos du {selectedDate.date} {new Date(selectedDate.year, selectedDate.month).toLocaleDateString('fr-FR', { month: 'long' })} {selectedDate.year}
              </Text>
              
              {(() => {
                const dayPhotos = getPhotosForSelectedDay();
                return dayPhotos.length > 0 ? (
                  <FlatList
                    data={dayPhotos}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.photoItem}
                        onPress={() => openPhoto(item)}
                      >
                        <Image
                          source={{ uri: `${API_URL}${item.thumbnailUrl}` }}
                          style={styles.photoThumbnail}
                          contentFit="cover"
                          transition={200}
                        />
                        <Text style={[styles.photoTime, { color: textColor }]}>
                          {new Date(item.timestamp).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.photosList}
                  />
                ) : (
                  <View style={styles.photosPlaceholder}>
                    <Ionicons name="images" size={48} color={textColor + '50'} />
                    <Text style={[styles.photosPlaceholderText, { color: textColor + '70' }]}>
                      Aucune photo pour ce jour
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}
        </>
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
          
          {selectedPhoto && (
            <Image
              source={{ uri: `${API_URL}${selectedPhoto.downloadUrl}` }}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontWeight: '500',
  },
  calendar: {
    flex: 1,
  },
  dayCell: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 4,
  },
  dayText: {
    fontSize: 16,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  selectedDateInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventText: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  daysGrid: {
    flex: 1,
  },
  photosSection: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    maxHeight: 200,
  },
  photosSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  photosList: {
    marginTop: 10,
  },
  photoItem: {
    marginRight: 15,
    padding: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 4,
    marginBottom: 5,
  },
  photoTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  photosPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  photosPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
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
});
