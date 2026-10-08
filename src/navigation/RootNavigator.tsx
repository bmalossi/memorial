import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, Image, StyleSheet, Linking } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { LoginScreen }           from '../screens/auth/LoginScreen';
import { RegisterScreen }        from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen }  from '../screens/auth/ForgotPasswordScreen';
import { MarcoDetalheScreen }    from '../screens/main/MarcoDetalheScreen';
import { MainNavigator }         from './MainNavigator';
import { useTheme } from '../theme';
import { MemorialEntry } from '../lib/types';
import { supabase } from '../lib/supabase';
import { handleAuthRedirectUrl } from '../lib/authOAuthService';
import {
  initNotificationHandler,
  setupNotificationChannel,
  setNotificationNavigationHandler,
  subscribeToNotificationResponse,
} from '../lib/notificationService';
import { fetchUserMemorials } from '../lib/memorialStore';

export type AuthStackParamList = {
  Login:          { justRegistered?: boolean; alreadyRegistered?: boolean; registeredEmail?: string } | undefined;
  Register:       undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  Auth:         undefined;
  Main:         { visitor?: boolean } | undefined;
  MarcoDetalhe: { entry: MemorialEntry };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: colors.bg.base },
        animation:    'fade',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = useNavigationContainerRef<any>();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary:      colors.amber.DEFAULT,
        background:   colors.bg.base,
        card:         colors.bg.surface,
        text:         colors.text.primary,
        border:       colors.border.DEFAULT,
        notification: colors.amber.DEFAULT,
      },
    };
  }, [isDark, colors]);

  useEffect(() => {
    // 1. Inicializa o canal e handlers de notificações nativas de forma segura
    try {
      initNotificationHandler();
      setupNotificationChannel().catch(() => {});
    } catch (e) {
      console.log('[RootNavigator] Aviso ao inicializar notificações:', e);
    }

    setNotificationNavigationHandler(async (entryId) => {
      try {
        const entries = await fetchUserMemorials();
        const found = entries.find((e) => e.id === entryId);
        if (found && navigationRef.isReady()) {
          navigationRef.navigate('MarcoDetalhe', { entry: found });
        }
      } catch (err) {
        console.log('[RootNavigator] Erro ao navegar para marco via notificação:', err);
      }
    });

    const unsubscribeNotifications = subscribeToNotificationResponse();

    // 2. Checa a sessão persistida no AsyncStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 3. Escuta mudanças no estado de autenticação (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    // 4. Escuta deep links de retorno OAuth (Google / Magic Link)
    const handleDeepLink = async (event: { url: string }) => {
      const url = event?.url;
      if (url && (url.includes('auth/callback') || url.includes('access_token=') || url.includes('code='))) {
        await handleAuthRedirectUrl(url);
      }
    };

    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && (initialUrl.includes('auth/callback') || initialUrl.includes('access_token=') || initialUrl.includes('code='))) {
        handleAuthRedirectUrl(initialUrl);
      }
    });

    return () => {
      unsubscribeNotifications();
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={[s.splashRoot, { backgroundColor: colors.bg.base }]}>
        <StatusBar hidden={true} />
        <Image
          source={require('../../assets/images/logo.png')}
          style={s.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator color={colors.amber.DEFAULT} size="small" style={{ marginTop: 24 }} />
      </View>
    );
  }

  const isAuthenticated = !!session;

  return (
    <>
      <StatusBar hidden={true} />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <RootStack.Navigator
          screenOptions={{ headerShown: false }}
        >
          {isAuthenticated ? (
            <>
              <RootStack.Screen name="Main" component={MainNavigator} />
              <RootStack.Screen
                name="MarcoDetalhe"
                component={MarcoDetalheScreen}
                options={{
                  animation:      'slide_from_right',
                  gestureEnabled: true,
                }}
              />
            </>
          ) : (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </>
  );
}

const s = StyleSheet.create({
  splashRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 80,
    height: 80,
  },
});
