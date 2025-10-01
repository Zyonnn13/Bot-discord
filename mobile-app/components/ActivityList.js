import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function ActivityList({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Activités récentes</Text>
        <View style={styles.noActivities}>
          <Text style={styles.noActivitiesText}>Aucune activité récente</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activités récentes</Text>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {activities.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.iconText}>{activity.icon || '📝'}</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: activity.status === 'success' ? '#48bb78' : '#f56565' 
            }]}>
              <Text style={styles.statusText}>{activity.statusText}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  list: {
    maxHeight: 300,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  noActivities: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noActivitiesText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});