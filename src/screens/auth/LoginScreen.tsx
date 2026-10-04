import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius, ColorTokens } from '../../theme';
import { supabase } from '../../lib/supabase';

const { width: W } = Dimensions.get('window');

// ─── Campo de Input ───────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  leftIcon: React.ReactNode;
  rightAction?: React.ReactNode;
  error?: string;
}

function Field({
  label, placeholder, value, onChangeText,
  secureTextEntry, keyboardType = 'default',
  autoCapitalize = 'none', returnKeyType = 'next',
  onSubmitEditing, leftIcon, rightAction, error,
}: FieldProps) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={field.wrapper}>
      <Text style={[field.label, { color: colors.text.secondary }]}>{label}</Text>
      <View style={[
        field.box,
        {
          backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
          borderColor: colors.border.DEFAULT,
        },
        focused && { borderColor: colors.border.active },
        !!error && { borderColor: colors.error },
      ]}>
        <View style={field.iconLeft}>{leftIcon}</View>
        <TextInput
          style={[field.input, { color: colors.text.primary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          selectionColor={colors.amber.DEFAULT}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightAction && (
          <View style={field.iconRight}>{rightAction}</View>
        )}
      </View>
      {error ? <Text style={[field.errorMsg, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const field = StyleSheet.create({
  wrapper: { gap: 7 },
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
  iconLeft:   { paddingLeft: 15, paddingRight: 10 },
  iconRight:  { paddingRight: 14, paddingLeft: 8 },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    paddingVertical: 0,
  },
  errorMsg: {
    fontSize: typography.size.xs,
    marginTop: -3,
  },
});

// ─── Botão Social Circular ────────────────────────────────────────────────────
function SocialBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.90, useNativeDriver: true, tension: 400, friction: 10 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 400, friction: 10 }).start()
        }
        style={[
          social.btn,
          {
            backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
            borderColor: colors.border.DEFAULT,
          },
        ]}
        accessibilityLabel={`Entrar com ${label}`}
        accessibilityRole="button"
      >
        <Text style={[social.icon, { color: colors.text.secondary }]}>{icon}</Text>
      </Pressable>
    </Animated.View>
  );
}

const social = StyleSheet.create({
  btn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    borderWidth:     1,
    alignItems:      'center',
    justifyContent:  'center',
  },
  icon: {
    fontSize:   18,
    fontWeight: typography.weight.semibold,
  },
});

// ─── LoginScreen ──────────────────────────────────────────────────────────────
interface Props { navigation?: any }

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [pwErr, setPwErr]       = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    let ok = true;
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setEmailErr('Informe um e-mail válido'); ok = false;
    } else setEmailErr('');
    if (!password || password.length < 6) {
      setPwErr('Senha deve ter ao menos 6 caracteres'); ok = false;
    } else setPwErr('');
    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setPwErr('');
    setEmailErr('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
          setPwErr('E-mail ou senha incorretos.');
        } else if (msg.includes('email not confirmed')) {
          setEmailErr('E-mail ainda não confirmado no Bíblia Vive.');
        } else {
          setPwErr(error.message);
        }
        return;
      }
    } catch (err: any) {
      setPwErr('Falha de conexão com o servidor. Verifique sua internet.');
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
          bounces={false}
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
            <Text style={s.title}>Entrar</Text>
            <Text style={s.subtitle}>Entre na sua conta para continuar</Text>

            {/* ── Formulário ── */}
            <View style={s.form}>

              <Field
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailErr) setEmailErr(''); }}
                keyboardType="email-address"
                returnKeyType="next"
                leftIcon={
                  <Feather name="mail" size={16} color={colors.text.muted} />
                }
                error={emailErr}
              />

              <Field
                label="Senha"
                placeholder="••••••••"
                value={password}
                onChangeText={(t) => { setPassword(t); if (pwErr) setPwErr(''); }}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                leftIcon={
                  <Feather name="lock" size={16} color={colors.text.muted} />
                }
                rightAction={
                  <TouchableOpacity
                    onPress={() => setShowPw((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <Feather
                      name={showPw ? 'eye-off' : 'eye'}
                      size={16}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                }
                error={pwErr}
              />

              {/* Esqueci a senha */}
              <TouchableOpacity
                style={s.forgotWrap}
                onPress={() => navigation?.navigate?.('ForgotPassword')}
                hitSlop={{ top: 8, bottom: 8 }}
                accessibilityRole="link"
              >
                <Text style={s.forgot}>Esqueci a senha?</Text>
              </TouchableOpacity>

              {/* Botão Entrar */}
              <TouchableOpacity
                style={[s.loginBtn, loading && s.loginBtnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.80}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Entrando' : 'Entrar'}
                accessibilityState={{ busy: loading }}
              >
                <Text style={s.loginBtnText}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Text>
                {!loading && (
                  <Feather name="arrow-right" size={18} color={colors.text.onAmber} />
                )}
              </TouchableOpacity>

              {/* Divisor */}
              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>ou continue com</Text>
                <View style={s.dividerLine} />
              </View>

              {/* Social */}
              <View style={s.socialRow}>
                <SocialBtn icon="G"  label="Google" onPress={() => {}} />
                <SocialBtn icon=""  label="Apple"  onPress={() => {}} />
                <SocialBtn icon="⌥"  label="GitHub" onPress={() => {}} />
              </View>

              {/* Criar conta */}
              <View style={s.registerRow}>
                <Text style={s.registerText}>Não tem uma conta? </Text>
                <TouchableOpacity
                  onPress={() => navigation?.navigate?.('Register')}
                  hitSlop={{ top: 8, bottom: 8 }}
                  accessibilityRole="link"
                >
                  <Text style={s.registerLink}>Criar conta</Text>
                </TouchableOpacity>
              </View>

            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Estilos Dinâmicos ────────────────────────────────────────────────────────
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
      width:           58,
      height:          58,
      borderRadius:    29,
      backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
      borderWidth:     1,
      borderColor:     isDark ? colors.border.subtle : colors.border.DEFAULT,
      alignItems:      'center',
      justifyContent:  'center',
      marginBottom:    spacing['5'],
      shadowColor:   colors.amber.DEFAULT,
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: isDark ? 0.18 : 0.10,
      shadowRadius:  16,
      elevation:     4,
    },

    logoImage: {
      width:  32,
      height: 32,
    },

    title: {
      color:        colors.text.primary,
      fontSize:     typography.size['2xl'],
      fontWeight:   typography.weight.bold,
      fontFamily:   Platform.OS === 'ios' ? 'Georgia' : 'serif',
      letterSpacing: typography.tracking.tight,
      marginBottom: spacing['1'],
    },

    subtitle: {
      color:        colors.text.secondary,
      fontSize:     typography.size.sm,
      fontWeight:   typography.weight.regular,
      marginBottom: spacing['8'],
      letterSpacing: 0.1,
    },

    form: {
      width: '100%',
      gap: spacing['5'],
    },

    forgotWrap: {
      alignSelf: 'flex-end',
      marginTop: -spacing['3'],
    },

    forgot: {
      color:      colors.text.link,
      fontSize:   typography.size.sm,
      fontWeight: typography.weight.medium,
    },

    loginBtn: {
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      backgroundColor: colors.amber.DEFAULT,
      height:          50,
      borderRadius:    radius.md,
      gap:             spacing['3'],
      marginTop:       spacing['1'],
      shadowColor:     colors.amber.DEFAULT,
      shadowOffset:    { width: 0, height: 4 },
      shadowOpacity:   isDark ? 0.35 : 0.22,
      shadowRadius:    12,
      elevation:       5,
    },

    loginBtnDisabled: {
      opacity: 0.58,
    },

    loginBtnText: {
      color:        colors.text.onAmber,
      fontSize:     typography.size.md,
      fontWeight:   typography.weight.bold,
      letterSpacing: 0.2,
    },

    divider: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           spacing['3'],
      marginTop:     spacing['1'],
    },

    dividerLine: {
      flex:            1,
      height:          StyleSheet.hairlineWidth,
      backgroundColor: colors.border.DEFAULT,
    },

    dividerText: {
      color:         colors.text.muted,
      fontSize:      typography.size.xs,
      letterSpacing: 0.4,
    },

    socialRow: {
      flexDirection:  'row',
      justifyContent: 'center',
      gap:            spacing['5'],
    },

    registerRow: {
      flexDirection:  'row',
      justifyContent: 'center',
      alignItems:     'center',
      paddingBottom:  spacing['2'],
    },

    registerText: {
      color:    colors.text.secondary,
      fontSize: typography.size.sm,
    },

    registerLink: {
      color:      colors.text.link,
      fontSize:   typography.size.sm,
      fontWeight: typography.weight.bold,
    },
  });
}
