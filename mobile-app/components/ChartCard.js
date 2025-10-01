import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

export default function ChartCard({ title, data, type }) {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'rgba(255,255,255,0.1)',
    backgroundGradientTo: 'rgba(255,255,255,0.1)',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  const prepareBarData = () => {
    if (!data || data.length === 0) return null;

    return {
      labels: data.map(item => item.name),
      datasets: [{
        data: data.map(item => item.count || 0),
        colors: data.map(item => () => item.color || '#667eea'),
      }],
    };
  };

  const preparePieData = () => {
    if (!data || data.length === 0) return [];

    return data.map((item, index) => ({
      name: item.name,
      population: item.count || 0,
      color: item.color || `hsl(${index * 60}, 70%, 60%)`,
      legendFontColor: 'white',
      legendFontSize: 12,
    }));
  };

  if (!data || data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        {type === 'bar' ? (
          <BarChart
            data={prepareBarData()}
            width={chartWidth - 32}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        ) : (
          <PieChart
            data={preparePieData()}
            width={chartWidth - 32}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
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
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  noData: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});