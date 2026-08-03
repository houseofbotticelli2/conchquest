import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { MainTabParamList } from './types';
import { ForecastStack } from './ForecastStack';
import { MapStack } from './MapStack';
import { CollectionStack } from './CollectionStack';
import { BeachesStack } from './BeachesStack';
import { ProfileStack } from './ProfileStack';
import { ShellIcon } from '../components/icons/ShellIcon';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  ForecastTab: 'Shellcast',
  MapTab: 'Map',
  CollectionTab: 'My Shells',
  BeachesTab: 'My Beaches',
  ProfileTab: 'Profile',
};

const TAB_ICONS: Record<keyof MainTabParamList, { family: 'ionicons' | 'mci' | 'shell'; active: string; inactive: string }> = {
  ForecastTab: { family: 'ionicons', active: 'sunny', inactive: 'sunny-outline' },
  MapTab: { family: 'ionicons', active: 'compass', inactive: 'compass-outline' },
  CollectionTab: { family: 'shell', active: 'shell', inactive: 'shell' },
  BeachesTab: { family: 'mci', active: 'umbrella-beach', inactive: 'umbrella-beach-outline' },
  ProfileTab: { family: 'ionicons', active: 'person', inactive: 'person-outline' },
};

function CustomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  // Lets a screen deep in a tab's stack (e.g. the Map screen going
  // fullscreen) hide this bar via navigation.getParent()?.setOptions({
  // tabBarStyle: { display: 'none' } }) -- this custom tabBar ignores
  // tabBarStyle for everything else, so it has to check it explicitly.
  const activeOptions = descriptors[state.routes[state.index].key]?.options;
  if ((activeOptions?.tabBarStyle as { display?: string } | undefined)?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 8) + 12 }]}>
      <View style={[styles.bar, { backgroundColor: t.navBg }]}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          const label = TAB_LABELS[route.name as keyof MainTabParamList];
          const icon = TAB_ICONS[route.name as keyof MainTabParamList];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconColor = isActive ? '#fff' : t.muted;
          const IconComponent = icon.family === 'mci' ? MaterialCommunityIcons : Ionicons;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.item, isActive && { backgroundColor: t.accent }]}
            >
              {icon.family === 'shell' ? (
                <ShellIcon size={20} color={iconColor} filled={isActive} />
              ) : (
                <IconComponent
                  name={(isActive ? icon.active : icon.inactive) as never}
                  size={20}
                  color={iconColor}
                  style={styles.icon}
                />
              )}
              <Text style={[styles.label, { color: iconColor }]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="ForecastTab" component={ForecastStack} />
      <Tab.Screen name="MapTab" component={MapStack} />
      <Tab.Screen name="CollectionTab" component={CollectionStack} />
      <Tab.Screen name="BeachesTab" component={BeachesStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  icon: {
    height: 20,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.data,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 3,
    letterSpacing: 0.3,
  },
});
