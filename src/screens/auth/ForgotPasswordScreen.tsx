import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius, ColorTokens } from '../../theme';
import { supabase } from '../../lib/supabase';

interface Props {
  navigation?: any;
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [emailErr, setEmailErr]   = useState('');
  const [globalErr, setGlobalErr] = useState('');
  const [sent, setSent]           = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleReset = async () => {
    setGlobalErr('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setEmailErr('Informe um e-mail válido');
      return;
    }
    setEmailErr('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('too many requests')) {
          setGlobalErr('Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes.');
        } else if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) {
          setGlobalErr('Falha de conexão com a internet. Verifique seu sinal.');
        } else {
          setGlobalErr('Não foi possível enviar o link de redefinição no momento. Tente novamente em instantes.');
        }
        return;
      }
      setSent(true);
    } catch {
      setGlobalErr('Falha de conexão com a internet. Verifique seu sinal e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar hidden={true} />
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* ── Círculo do Logo ── */}
            <View style={s.logoCircle}>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={s.logoImage}
                resizeMode="contain"
                accessibilityLabel="Logotipo Memorial"
              />
            </View>

            {/* ── Título ── */}
            <Text style={s.title}>Recuperar Senha</Text>
            <Text style={s.subtitle}>
              Enviaremos um link de redefinição para sua conta unificada do Bíblia Vive
            </Text>

            {sent ? (
              <View style={s.successBox}>
                <Feather name="check-circle" size={32} color={colors.success} />
                <Text style={s.successTitle}>E-mail enviado!</Text>
                <Text style={s.successText}>
                  Verifique a caixa de entrada de <Text style={{ color: colors.amber.DEFAULT, fontWeight: 'bold' }}>{email}</Text> e siga as instruções para redefinir sua senha.
                </Text>
                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => navigation?.navigate?.('Login')}
                >
                  <Text style={s.backBtnText}>Voltar ao Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.form}>
                {!!globalErr && (
                  <View style={s.errorBanner}>
                    <Feather name="alert-circle" size={15} color={colors.error} />
                    <Text style={s.errorBannerText}>{globalErr}</Text>
                  </View>
                )}

                <View style={s.inputWrap}>
                  <Text style={[s.label, { color: colors.text.secondary }]}>E-mail</Text>
                  <View style={[s.box, { backgroundColor: isDark ? colors.bg.surface : colors.bg.raised, borderColor: emailErr ? colors.error : colors.border.DEFAULT }]}>
                    <Feather name="mail" size={16} color={colors.text.muted} style={{ marginLeft: 14, marginRight: 10 }} />
                    <TextInput
                      style={[s.input, { color: colors.text.primary }]}
                      placeholder="voce@exemplo.com"
                      placeholderTextColor={colors.text.muted}
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (emailErr) setEmailErr(''); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleReset}
                      selectionColor={colors.amber.DEFAULT}
                    />
                  </View>
                  {!!emailErr && <Text style={{ color: colors.error, fontSize: typography.size.xs }}>{emailErr}</Text>}
                </View>

                <TouchableOpacity
                  style={[s.resetBtn, loading && { opacity: 0.6 }]}
                  onPress={handleReset}
                  disabled={loading}
                >
                  <Text style={s.resetBtnText}>
                    {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.backLink}
                  onPress={() => navigation?.navigate?.('Login')}
                >
                  <Feather name="arrow-left" size={14} color={colors.text.secondary} />
                  <Text style={[s.backLinkText, { color: colors.text.secondary }]}>Voltar ao Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function getStyles(colors: ColorTokens, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    scroll: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: spacing['7'],
    },
    logoCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
      borderWidth: 1,
      borderColor: isDark ? colors.border.subtle : colors.border.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['4'],
    },
    logoImage: { width: 30, height: 30 },
    title: {
      color: colors.text.primary,
      fontSize: typography.size['2xl'],
      fontWeight: typography.weight.bold,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      marginBottom: spacing['1'],
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: typography.size.sm,
      textAlign: 'center',
      marginBottom: spacing['6'],
      lineHeight: 20,
    },
    form: {
      width: '100%',
      gap: spacing['4'],
    },
    inputWrap: {
      gap: 6,
    },
    label: {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
    },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      height: 48,
    },
    input: {
      flex: 1,
      fontSize: typography.size.base,
      paddingVertical: 0,
    },
    resetBtn: {
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing['2'],
    },
    resetBtnText: {
      color: colors.text.onAmber,
      fontSize: typography.size.base,
      fontWeight: typography.weight.semibold,
    },
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing['3'],
    },
    backLinkText: {
      fontSize: typography.size.sm,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? '#2D1517' : '#FDE8E8',
      borderWidth: 1,
      borderColor: isDark ? '#5A2024' : '#F8B4B4',
      borderRadius: radius.md,
      padding: spacing['3'],
    },
    errorBannerText: {
      flex: 1,
      color: colors.error,
      fontSize: typography.size.xs,
    },
    successBox: {
      width: '100%',
      backgroundColor: isDark ? '#14261C' : '#E8F5E9',
      borderWidth: 1,
      borderColor: isDark ? '#234F35' : '#C8E6C9',
      borderRadius: radius.lg,
      padding: spacing['6'],
      alignItems: 'center',
      gap: 12,
    },
    successTitle: {
      color: colors.success,
      fontSize: typography.size.lg,
      fontWeight: typography.weight.bold,
    },
    successText: {
      color: colors.text.secondary,
      fontSize: typography.size.sm,
      textAlign: 'center',
      lineHeight: 21,
    },
    backBtn: {
      backgroundColor: colors.amber.DEFAULT,
      paddingHorizontal: spacing['6'],
      paddingVertical: spacing['3'],
      borderRadius: radius.md,
      marginTop: spacing['3'],
    },
    backBtnText: {
      color: colors.text.onAmber,
      fontWeight: typography.weight.semibold,
      fontSize: typography.size.sm,
    },
  });
}
