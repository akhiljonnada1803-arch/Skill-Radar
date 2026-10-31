import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.canvas,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.outlineVariant,
        },
        headerTitleStyle: {
          fontWeight: '900',
          color: Colors.ink,
          fontSize: 18,
          letterSpacing: -0.3,
          textTransform: 'uppercase',
        },
        tabBarStyle: {
          backgroundColor: Colors.canvas,
          borderTopColor: Colors.outlineVariant,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: -0.2,
          marginTop: 2,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.secondaryText,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeTopIndicator} />}
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          headerShown: false,
          title: 'Roadmap',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeTopIndicator} />}
              <Ionicons name={focused ? 'git-network' : 'git-network-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeTopIndicator} />}
              <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          href: null, // Aux curriculum view accessible via skill links
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    position: 'relative',
  },
  activeTopIndicator: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
