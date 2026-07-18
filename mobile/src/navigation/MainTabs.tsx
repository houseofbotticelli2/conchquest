import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { MainTabParamList } from './types';
import { ForecastStack } from './ForecastStack';
import { MapStack } from './MapStack';
import { LibraryStack } from './LibraryStack';
import { ProfileStack } from './ProfileStack';

// LogTab never actually renders — its tabPress is always intercepted to open
// the LogModal instead — but a tab screen still needs a component to satisfy
// the navigator.
function EmptyScreen() {
  return <View />;
}

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  ForecastTab: 'FORECAST',
  MapTab: 'MAP',
  LogTab: 'LOG',
  LibraryTab: 'SHELLS',
  ProfileTab: 'PROFILE',
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: t.navBg }]}>
      {state.routes.map((route, index) => {
        const isActive = state.index === index;
        const label = TAB_LABELS[route.name as keyof MainTabParamList];

        const onPress = () => {
          if (route.name === 'LogTab') {
            navigation.getParent()?.dispatch(CommonActions.navigate({ name: 'LogModal' }));
            return;
          }
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.item, isActive && { backgroundColor: t.accent }]}
          >
            <Text style={[styles.label, { color: isActive ? '#fff' : t.muted }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="ForecastTab" component={ForecastStack} />
      <Tab.Screen name="MapTab" component={MapStack} />
      <Tab.Screen name="LogTab" component={EmptyScreen} />
      <Tab.Screen name="LibraryTab" component={LibraryStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 26,
    paddingHorizontal: 10,
  },
  item: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  label: {
    fontFamily: fonts.data,
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
