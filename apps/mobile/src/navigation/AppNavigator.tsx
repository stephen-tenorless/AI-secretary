import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors } from '../utils/theme';
import { useStore } from '../store/useStore';

// Screens
import { HomeScreen } from '../screens/Home/HomeScreen';
import { TaskListScreen } from '../screens/Tasks/TaskListScreen';
import { TaskDetailScreen } from '../screens/Tasks/TaskDetailScreen';
import { CreateTaskScreen } from '../screens/Tasks/CreateTaskScreen';
import { ScheduleScreen } from '../screens/Schedule/ScheduleScreen';
import { AIChatScreen } from '../screens/AIChat/AIChatScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { SignInScreen } from '../screens/Auth/SignInScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TaskDetail: { taskId: string };
  CreateTask: { category?: string };
};

export type TabParamList = {
  Home: undefined;
  Tasks: undefined;
  Schedule: undefined;
  Assistant: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Feather name="sun" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-square" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={AIChatScreen}
        options={{
          title: 'AI Secretary',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={SignInScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                title: 'Task Details',
              }}
            />
            <Stack.Screen
              name="CreateTask"
              component={CreateTaskScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                title: 'New Task',
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
