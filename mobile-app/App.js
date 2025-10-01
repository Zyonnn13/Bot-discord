import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import LoginScreen from './components/LoginScreen';
import StatCard from './components/StatCard';
import ChartCard from './components/ChartCard';
import ActivityList from './components/ActivityList';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://ynov-discord-bot.onrender.com';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('session_token');
      if (token) {
        setIsLoggedIn(true);
        await fetchStats();
      }
    } catch (error) {
      console.log('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('session_token');
      const response = await fetch(`${API_URL}/api/modern-stats`, {
        headers: {
          'Cookie': `connect.sid=${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else if (response.status === 401) {
        await handleLogout();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les statistiques');
      console.error('Stats error:', error);
    }
  };

  const handleLogin = async (sessionToken) => {
    await SecureStore.setItemAsync('session_token', sessionToken);
    setIsLoggedIn(true);
    await fetchStats();
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('session_token');
    setIsLoggedIn(false);
    setStats(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.centered}>
          <MaterialIcons name="router" size={64} color="white" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} apiUrl={API_URL} />;
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialIcons name="dashboard" size={32} color="white" />
            <Text style={styles.headerTitle}>Dashboard Ynov</Text>
            <Text style={styles.headerSubtitle}>Statistiques Discord en temps réel</Text>
          </View>
          <MaterialIcons
            name="logout"
            size={28}
            color="white"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </View>

        {/* Stats Cards */}
        {stats && (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                title="Membres serveur"
                value={stats.serverMembers || 0}
                icon="people"
                color="#667eea"
              />
              <StatCard
                title="En ligne"
                value={stats.onlineMembers || 0}
                icon="online-prediction"
                color="#48bb78"
              />
              <StatCard
                title="Vérifiés"
                value={stats.verifiedUsers || 0}
                icon="verified-user"
                color="#ed8936"
              />
              <StatCard
                title="Aujourd'hui"
                value={stats.dailyVerifications || 0}
                icon="today"
                color="#9f7aea"
              />
            </View>

            {/* Charts */}
            <View style={styles.chartsSection}>
              <ChartCard
                title="Appareils"
                data={stats.devices || []}
                type="bar"
              />
              <ChartCard
                title="Localisations"
                data={stats.locations || []}
                type="pie"
              />
            </View>

            {/* Activities */}
            <ActivityList activities={stats.activities || []} />
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  chartsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
});