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
import {
  getSavedCredentials,
  saveCredentials,
  clearSavedCredentials,
} from '../../lib/authCredentialsStore';
import { initiateGoogleOAuth } from '../../lib/authOAuthService';

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



// ─── LoginScreen ──────────────────────────────────────────────────────────────
interface Props {
  navigation?: any;
  route?: any;
}

export function LoginScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [email, setEmail]                         = useState('');
  const [password, setPassword]                   = useState('');
  const [rememberMe, setRememberMe]               = useState(false);
  const [showPw, setShowPw]                       = useState(false);
  const [loading, setLoading]                     = useState(false);
  const [googleLoading, setGoogleLoading]         = useState(false);
  const [emailErr, setEmailErr]                   = useState('');
  const [pwErr, setPwErr]                         = useState('');
  const [noticeInfo, setNoticeInfo]               = useState<{
    title: string;
    message: string;
    icon?: 'mail' | 'info';
  } | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();

    // Carrega credenciais salvas previamente no dispositivo
    getSavedCredentials().then(({ remember, email: savedEmail, password: savedPassword }) => {
      if (remember) {
        setRememberMe(true);
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
      }
    });
  }, []);

  // Detecta redirecionamento vindo da criação de conta
  useEffect(() => {
    if (route?.params?.registeredEmail) {
      setEmail(route.params.registeredEmail);

      if (route.params.alreadyRegistered) {
        setNoticeInfo({
          icon: 'info',
          title: 'CONTA JÁ CADASTRADA',
          message: `O e-mail ${route.params.registeredEmail} já possui cadastro unificado no Bíblia Vive / Memorial. Digite sua senha para entrar ou recupere o acesso.`,
        });
      } else if (route.params.justRegistered) {
        setNoticeInfo({
          icon: 'mail',
          title: 'CONFIRMAÇÃO ENVIADA',
          message: `Enviamos um link de confirmação para ${route.params.registeredEmail}. Acesse sua caixa de entrada, confirme seu e-mail e faça login para entrar.`,
        });
      }
    }
  }, [route?.params]);

  const handleToggleRemember = () => {
    setRememberMe((prev) => {
      const next = !prev;
      if (!next) {
        clearSavedCredentials();
      }
      return next;
    });
  };

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
      const cleanEmail = email.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
          setPwErr('E-mail ou senha incorretos.');
        } else if (msg.includes('email not confirmed')) {
          setEmailErr('E-mail ainda não confirmado no Bíblia Vive.');
        } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
          setPwErr('Muitas tentativas. Aguarde alguns instantes.');
        } else if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) {
          setPwErr('Falha de conexão com a internet. Verifique seu sinal.');
        } else {
          setPwErr('Não foi possível entrar. Verifique seus dados ou tente novamente.');
        }
        return;
      }

      // Persiste ou limpa credenciais com base na escolha do usuário
      if (rememberMe) {
        await saveCredentials(cleanEmail, password);
      } else {
        await clearSavedCredentials();
      }
    } catch (err: any) {
      setPwErr('Falha de conexão com a internet. Verifique seu sinal.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setPwErr('');
    setEmailErr('');
    setGoogleLoading(true);
    try {
      const res = await initiateGoogleOAuth();
      if (!res.success && res.error) {
        setPwErr(res.error);
      }
    } catch {
      setPwErr('Não foi possível iniciar o login com o Google.');
    } finally {
      setGoogleLoading(false);
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

            {/* ── Notificação de Conta (Confirmação ou Conta Existente) ── */}
            {!!noticeInfo && (
              <View style={s.registeredNoticeBox}>
                <View style={s.registeredNoticeIconWrap}>
                  <Feather
                    name={noticeInfo.icon === 'info' ? 'info' : 'mail'}
                    size={15}
                    color={colors.amber.DEFAULT}
                  />
                </View>
                <View style={s.registeredNoticeTextWrap}>
                  <Text style={s.registeredNoticeTitle}>{noticeInfo.title}</Text>
                  <Text style={s.registeredNoticeBody}>{noticeInfo.message}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setNoticeInfo(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={s.registeredNoticeClose}
                  accessibilityLabel="Fechar aviso"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={14} color={colors.text.muted} />
                </TouchableOpacity>
              </View>
            )}

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

              {/* Opções: Salvar Credenciais & Esqueci a Senha */}
              <View style={s.optionsRow}>
                <TouchableOpacity
                  style={s.rememberWrap}
                  onPress={handleToggleRemember}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel="Salvar credenciais de acesso"
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <View style={[
                    s.checkbox,
                    rememberMe && s.checkboxChecked,
                  ]}>
                    {rememberMe && (
                      <Feather name="check" size={12} color={colors.text.onAmber} />
                    )}
                  </View>
                  <Text style={s.rememberText}>Salvar credenciais</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.forgotWrap}
                  onPress={() => navigation?.navigate?.('ForgotPassword')}
                  hitSlop={{ top: 8, bottom: 8 }}
                  accessibilityRole="link"
                >
                  <Text style={s.forgot}>Esqueci a senha?</Text>
                </TouchableOpacity>
              </View>

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

              {/* Entrar com o Google */}
              <TouchableOpacity
                style={s.googleBtn}
                onPress={handleGoogleLogin}
                activeOpacity={0.8}
                disabled={googleLoading}
                accessibilityLabel="Continuar com o Google"
                accessibilityRole="button"
              >
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleBtnText}>
                  {googleLoading ? 'Conectando ao Google...' : 'Continuar com o Google'}
                </Text>
              </TouchableOpacity>

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

    registeredNoticeBox: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDark ? '#1C1914' : '#FDFBF5',
      borderWidth: 1,
      borderColor: isDark ? '#3D3422' : '#E8DDBF',
      borderRadius: radius.md,
      paddingHorizontal: spacing['4'],
      paddingVertical: spacing['3'],
      marginBottom: spacing['6'],
      gap: 10,
    },

    registeredNoticeIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isDark ? '#2B2416' : '#F5EACF',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },

    registeredNoticeTextWrap: {
      flex: 1,
      gap: 3,
    },

    registeredNoticeTitle: {
      color: colors.amber.DEFAULT,
      fontSize: 10.5,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.8,
    },

    registeredNoticeBody: {
      color: colors.text.secondary,
      fontSize: typography.size.xs,
      lineHeight: 18,
    },

    registeredNoticeClose: {
      padding: 2,
    },

    form: {
      width: '100%',
      gap: spacing['5'],
    },

    optionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: -spacing['2'],
    },

    rememberWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['2'],
    },

    checkbox: {
      width: 18,
      height: 18,
      borderRadius: radius.xs,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border.subtle : colors.border.DEFAULT,
      backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
      alignItems: 'center',
      justifyContent: 'center',
    },

    checkboxChecked: {
      backgroundColor: colors.amber.DEFAULT,
      borderColor: colors.amber.DEFAULT,
    },

    rememberText: {
      color: colors.text.secondary,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
    },

    forgotWrap: {
      alignSelf: 'center',
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

    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing['3'],
      height: 48,
      borderRadius: radius.md,
      backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    googleIcon: {
      fontSize: 16,
      fontWeight: typography.weight.bold,
      color: colors.amber.DEFAULT,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    googleBtnText: {
      color: colors.text.primary,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
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
