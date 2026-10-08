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
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius, ColorTokens } from '../../theme';
import { supabase } from '../../lib/supabase';
import { initiateGoogleOAuth } from '../../lib/authOAuthService';
import { APP_VERSION_LABEL } from '../../version';

const { width: W } = Dimensions.get('window');

// ─── Campo de Input Reutilizável ──────────────────────────────────────────────
interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  leftIcon: React.ReactNode;
  rightAction?: React.ReactNode;
  error?: string;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  returnKeyType = 'next',
  onSubmitEditing,
  leftIcon,
  rightAction,
  error,
}: FieldProps) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={field.wrapper}>
      <Text style={[field.label, { color: colors.text.secondary }]}>{label}</Text>
      <View
        style={[
          field.box,
          {
            backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
            borderColor: colors.border.DEFAULT,
          },
          focused && { borderColor: colors.border.active },
          !!error && { borderColor: colors.error },
        ]}
      >
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
        {rightAction && <View style={field.iconRight}>{rightAction}</View>}
      </View>
      {error ? <Text style={[field.errorMsg, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const field = StyleSheet.create({
  wrapper: { gap: 6 },
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
  iconLeft:  { paddingLeft: 14, paddingRight: 10 },
  iconRight: { paddingRight: 14, paddingLeft: 8 },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    paddingVertical: 0,
  },
  errorMsg: {
    fontSize: typography.size.xs,
    marginTop: -2,
  },
});

// ─── RegisterScreen ───────────────────────────────────────────────────────────
interface Props {
  navigation?: any;
}

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]                   = useState(false);
  const [showConfirmPw, setShowConfirmPw]     = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [googleLoading, setGoogleLoading]     = useState(false);

  const [nameErr, setNameErr]                 = useState('');
  const [emailErr, setEmailErr]               = useState('');
  const [pwErr, setPwErr]                     = useState('');
  const [confirmPwErr, setConfirmPwErr]       = useState('');
  const [globalErr, setGlobalErr]             = useState('');

  const [feedbackDialog, setFeedbackDialog]   = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: 'mail' | 'info' | 'alert-circle';
    buttonText?: string;
    onDismiss?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    let ok = true;
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 2) {
      setNameErr('Informe seu nome completo');
      ok = false;
    } else {
      setNameErr('');
    }

    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setEmailErr('Informe um e-mail válido');
      ok = false;
    } else {
      setEmailErr('');
    }

    if (!password || password.length < 6) {
      setPwErr('A senha deve ter ao menos 6 caracteres');
      ok = false;
    } else {
      setPwErr('');
    }

    if (password !== confirmPassword) {
      setConfirmPwErr('As senhas não coincidem');
      ok = false;
    } else {
      setConfirmPwErr('');
    }

    return ok;
  };

  const handleRegister = async () => {
    setGlobalErr('');
    if (!validate()) return;

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: 'https://bibliavive.com.br/memorial/confirmado',
          data: {
            name: cleanName,
            full_name: cleanName,
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        let userMessage = 'Não foi possível concluir o cadastro no momento. Por favor, tente novamente em instantes.';
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          userMessage = 'Este e-mail já possui conta cadastrada. Faça login para entrar.';
        } else if (msg.includes('sending confirmation email') || msg.includes('sending signup email')) {
          userMessage = 'Não foi possível enviar o e-mail de confirmação no momento. Por favor, tente novamente em instantes.';
        } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
          userMessage = 'Muitas tentativas em pouco tempo. Aguarde alguns instantes.';
        } else if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) {
          userMessage = 'Falha de conexão com a internet. Verifique seu sinal.';
        }
        setGlobalErr('');
        setFeedbackDialog({
          visible: true,
          title: 'Aviso de Cadastro',
          message: userMessage,
          icon: 'alert-circle',
          buttonText: 'Entendido',
        });
        return;
      }

      // Caso 1: Usuário já cadastrado previamente no Bíblia Vive / Memorial
      // (Supabase com Email Enumeration Protection retorna identities vazio sem erro e sem re-enviar e-mail)
      const isAlreadyRegistered =
        data?.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0;

      if (isAlreadyRegistered) {
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFeedbackDialog({
          visible: true,
          title: 'Conta Já Cadastrada',
          message: `O e-mail ${cleanEmail} já possui cadastro unificado no Bíblia Vive e Memorial.\n\nVocê será direcionado para entrar com sua senha.`,
          icon: 'info',
          buttonText: 'Ir para o Login',
          onDismiss: () => {
            navigation?.navigate?.('Login', {
              alreadyRegistered: true,
              registeredEmail: cleanEmail,
            });
          },
        });
        return;
      }

      // Caso 2: Conta nova criada com sucesso requerendo confirmação de e-mail
      // Exibe diálogo nobre de confirmação e ao clicar direciona para a tela inicial de Login
      if (data?.user && !data?.session) {
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFeedbackDialog({
          visible: true,
          title: 'Confirmação Enviada',
          message: `Enviamos o link de confirmação para ${cleanEmail}.\n\nAcesse sua caixa de entrada, confirme seu e-mail e faça login para entrar no Memorial.`,
          icon: 'mail',
          buttonText: 'Ir para o Login',
          onDismiss: () => {
            navigation?.navigate?.('Login', {
              justRegistered: true,
              registeredEmail: cleanEmail,
            });
          },
        });
        return;
      }
      // Se retornou sessão direta (confirmação automática desativada), onAuthStateChange assumirá o redirecionamento
    } catch {
      setGlobalErr('');
      setFeedbackDialog({
        visible: true,
        title: 'Aviso de Conexão',
        message: 'Falha de conexão com a internet. Verifique seu sinal e tente novamente.',
        icon: 'alert-circle',
        buttonText: 'Entendido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGlobalErr('');
    setGoogleLoading(true);
    try {
      const res = await initiateGoogleOAuth();
      if (!res.success && res.error) {
        setFeedbackDialog({
          visible: true,
          title: 'Aviso',
          message: 'Não foi possível concluir o cadastro com o Google no momento.',
          icon: 'alert-circle',
          buttonText: 'Entendido',
        });
      }
    } catch {
      setFeedbackDialog({
        visible: true,
        title: 'Aviso',
        message: 'Não foi possível iniciar o cadastro com o Google.',
        icon: 'alert-circle',
        buttonText: 'Entendido',
      });
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
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 },
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
            <Text style={s.title}>Criar Conta</Text>
            <Text style={s.subtitle}>Inicie seus registros memoriais</Text>

            {/* ── Cartão Informativo de Conta Unificada Bíblia Vive ── */}
            <View style={s.unifiedCard}>
              <View style={s.unifiedHeader}>
                <Feather name="shield" size={15} color={colors.amber.DEFAULT} />
                <Text style={s.unifiedTitle}>CONTA UNIFICADA BÍBLIA VIVE</Text>
              </View>
              <Text style={s.unifiedBody}>
                Seu cadastro é único: com este mesmo e-mail e senha você acessa tanto o{' '}
                <Text style={s.unifiedHighlight}>Bíblia Vive</Text> (leitura bíblica e planos) quanto o{' '}
                <Text style={s.unifiedHighlight}>Memorial</Text> (seus marcos e orações).
              </Text>
            </View>

            {/* ── Mensagem de Erro Global ── */}
            {!!globalErr && (
              <View style={s.errorBanner}>
                <Feather name="alert-circle" size={15} color={colors.error} />
                <Text style={s.errorBannerText}>{globalErr}</Text>
              </View>
            )}

            {/* ── Formulário ── */}
            <View style={s.form}>
              <Field
                label="Nome Completo"
                placeholder="Como deseja ser chamado"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (nameErr) setNameErr('');
                }}
                autoCapitalize="words"
                returnKeyType="next"
                leftIcon={<Feather name="user" size={16} color={colors.text.muted} />}
                error={nameErr}
              />

              <Field
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailErr) setEmailErr('');
                }}
                keyboardType="email-address"
                returnKeyType="next"
                leftIcon={<Feather name="mail" size={16} color={colors.text.muted} />}
                error={emailErr}
              />

              <Field
                label="Senha"
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (pwErr) setPwErr('');
                }}
                secureTextEntry={!showPw}
                returnKeyType="next"
                leftIcon={<Feather name="lock" size={16} color={colors.text.muted} />}
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

              <Field
                label="Confirmar Senha"
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (confirmPwErr) setConfirmPwErr('');
                }}
                secureTextEntry={!showConfirmPw}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                leftIcon={<Feather name="lock" size={16} color={colors.text.muted} />}
                rightAction={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPw((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel={showConfirmPw ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  >
                    <Feather
                      name={showConfirmPw ? 'eye-off' : 'eye'}
                      size={16}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                }
                error={confirmPwErr}
              />

              {/* Botão Criar Conta */}
              <TouchableOpacity
                style={[s.registerBtn, loading && s.registerBtnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.82}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Criando conta' : 'Criar conta'}
                accessibilityState={{ busy: loading }}
              >
                <Text style={s.registerBtnText}>
                  {loading ? 'Criando conta...' : 'Criar Minha Conta'}
                </Text>
                {!loading && (
                  <Feather name="arrow-right" size={18} color={colors.text.onAmber} />
                )}
              </TouchableOpacity>

              {/* Divisor */}
              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>ou cadastre-se com</Text>
                <View style={s.dividerLine} />
              </View>

              {/* Cadastrar com o Google */}
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

              {/* Já tem conta? */}
              <View style={s.loginRow}>
                <Text style={s.loginText}>Já tem uma conta? </Text>
                <TouchableOpacity
                  onPress={() => navigation?.navigate?.('Login')}
                  hitSlop={{ top: 8, bottom: 8 }}
                  accessibilityRole="link"
                >
                  <Text style={s.loginLink}>Entrar</Text>
                </TouchableOpacity>
              </View>

              {/* Versionamento Mobile */}
              <View style={s.versionWrap}>
                <Text style={s.versionText}>{APP_VERSION_LABEL}</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Diálogo Editorial de Feedback (Tema Memorial) */}
      {feedbackDialog.visible && (
        <View style={s.modalOverlay}>
          <Pressable
            style={s.overlayBackdrop}
            onPress={() => {
              const dismiss = feedbackDialog.onDismiss;
              setFeedbackDialog((prev) => ({ ...prev, visible: false }));
              dismiss?.();
            }}
          />
          <View style={s.feedbackDialogBox}>
            <View
              style={[
                s.feedbackIconBox,
                feedbackDialog.icon === 'alert-circle'
                  ? { backgroundColor: isDark ? '#3D1C1F' : '#FDE8E8' }
                  : { backgroundColor: isDark ? '#2B261D' : '#F7EBDC' },
              ]}
            >
              <Feather
                name={
                  feedbackDialog.icon === 'alert-circle'
                    ? 'alert-circle'
                    : feedbackDialog.icon === 'mail'
                    ? 'mail'
                    : 'info'
                }
                size={24}
                color={
                  feedbackDialog.icon === 'alert-circle'
                    ? colors.error
                    : colors.amber.DEFAULT
                }
              />
            </View>
            <Text style={s.feedbackTitle}>{feedbackDialog.title}</Text>
            <Text style={s.feedbackMessage}>{feedbackDialog.message}</Text>
            <TouchableOpacity
              onPress={() => {
                const dismiss = feedbackDialog.onDismiss;
                setFeedbackDialog((prev) => ({ ...prev, visible: false }));
                dismiss?.();
              }}
              style={s.feedbackPrimaryBtn}
              activeOpacity={0.8}
            >
              <Text style={s.feedbackPrimaryBtnText}>
                {feedbackDialog.buttonText || 'Entendido'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
      borderWidth: 1,
      borderColor: isDark ? colors.border.subtle : colors.border.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['4'],
      shadowColor: colors.amber.DEFAULT,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isDark ? 0.18 : 0.1,
      shadowRadius: 14,
      elevation: 4,
    },

    logoImage: {
      width: 30,
      height: 30,
    },

    title: {
      color: colors.text.primary,
      fontSize: typography.size['2xl'],
      fontWeight: typography.weight.bold,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      letterSpacing: typography.tracking.tight,
      marginBottom: spacing['1'],
    },

    subtitle: {
      color: colors.text.secondary,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.regular,
      marginBottom: spacing['4'],
    },

    unifiedCard: {
      width: '100%',
      backgroundColor: isDark ? '#1F1A12' : '#FDF8ED',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: isDark ? '#3D321F' : '#F2E4C2',
      paddingHorizontal: spacing['4'],
      paddingVertical: spacing['3'],
      marginBottom: spacing['4'],
      gap: 6,
    },

    unifiedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    unifiedTitle: {
      color: colors.amber.DEFAULT,
      fontSize: 11,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.8,
    },

    unifiedBody: {
      color: colors.text.secondary,
      fontSize: typography.size.xs,
      lineHeight: 18,
    },

    unifiedHighlight: {
      color: colors.amber.DEFAULT,
      fontWeight: typography.weight.semibold,
    },

    errorBanner: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? '#2D1517' : '#FDE8E8',
      borderWidth: 1,
      borderColor: isDark ? '#5A2024' : '#F8B4B4',
      borderRadius: radius.md,
      paddingHorizontal: spacing['4'],
      paddingVertical: spacing['3'],
      marginBottom: spacing['3'],
    },

    errorBannerText: {
      flex: 1,
      color: colors.error,
      fontSize: typography.size.xs,
      lineHeight: 17,
    },

    form: {
      width: '100%',
      gap: spacing['3'],
    },

    registerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      height: 48,
      gap: 8,
      marginTop: spacing['2'],
    },

    registerBtnDisabled: {
      opacity: 0.6,
    },

    registerBtnText: {
      color: colors.text.onAmber,
      fontSize: typography.size.base,
      fontWeight: typography.weight.semibold,
      letterSpacing: typography.tracking.wide,
    },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: spacing['2'],
    },

    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.DEFAULT,
    },

    dividerText: {
      color: colors.text.muted,
      fontSize: typography.size.xs,
    },

    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.bg.surface : colors.bg.raised,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      height: 48,
      gap: 10,
    },

    googleIcon: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text.primary,
    },

    googleBtnText: {
      color: colors.text.primary,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
    },

    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing['3'],
    },

    loginText: {
      color: colors.text.secondary,
      fontSize: typography.size.sm,
    },

    loginLink: {
      color: colors.amber.DEFAULT,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.semibold,
    },

    versionWrap: {
      alignItems:     'center',
      justifyContent: 'center',
      marginTop:      spacing['5'],
      paddingBottom:  spacing['2'],
    },

    versionText: {
      color:         colors.text.muted,
      fontSize:      typography.size.xs,
      letterSpacing: typography.tracking.wide,
      fontFamily:    Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },

    modalOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing['4'],
      zIndex: 9999,
      elevation: 25,
    },
    overlayBackdrop: {
      ...StyleSheet.absoluteFill,
    },
    feedbackDialogBox: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.bg.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      padding: spacing['6'],
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    feedbackIconBox: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['3'],
    },
    feedbackTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      textAlign: 'center',
      marginBottom: spacing['2'],
    },
    feedbackMessage: {
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing['5'],
    },
    feedbackPrimaryBtn: {
      width: '100%',
      backgroundColor: colors.amber.DEFAULT,
      borderRadius: radius.md,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedbackPrimaryBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onAmber,
    },
  });
}
