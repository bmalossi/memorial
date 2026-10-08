import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, spacing, radius } from '../../theme';
import {
  isNativeAudioAvailable,
  startNativeRecording,
  stopNativeRecording,
  cancelNativeRecording,
} from '../../lib/nativeAudioService';
import { transcribeAudioUri } from '../../lib/voiceTranscriptionService';

interface BottomQuickCaptureBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onOpenFullSheet: () => void;
  onError?: (title: string, message: string) => void;
  isSubmitting?: boolean;
}

export function BottomQuickCaptureBar({
  value,
  onChangeText,
  onSubmit,
  onOpenFullSheet,
  onError,
  isSubmitting = false,
}: BottomQuickCaptureBarProps) {
  const { colors, isDark } = useTheme();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  // Animação de pulso sutil durante gravação de áudio
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleToggleVoice = async () => {
    if (isTranscribing) return;

    if (isRecording) {
      // Parar e transcrever
      try {
        setIsRecording(false);
        setIsTranscribing(true);

        const uri = await stopNativeRecording();
        const transcript = await transcribeAudioUri(uri);

        if (transcript && transcript.trim()) {
          const updated = value.trim()
            ? `${value.trim()}\n\n${transcript.trim()}`
            : transcript.trim();
          onChangeText(updated);
        }
      } catch (err: any) {
        console.warn('[QuickCapture] Erro ao transcrever:', err);
        onError?.(
          'Transcrição de Áudio',
          err.message || 'Não foi possível transcrever o áudio gravado.'
        );
      } finally {
        setIsTranscribing(false);
        setRecordingSeconds(0);
      }
    } else {
      // Iniciar gravação
      if (!isNativeAudioAvailable()) {
        onError?.(
          'Gravação de Voz Nativa',
          'A gravação de voz com transcrição em tempo real requer a Development Build do Memorial no aparelho.'
        );
        return;
      }

      try {
        setRecordingSeconds(0);
        setIsRecording(true);
        await startNativeRecording((secs) => {
          setRecordingSeconds(secs);
        });
      } catch (err: any) {
        setIsRecording(false);
        console.warn('[QuickCapture] Erro ao gravar voz:', err);
        if (err.message === 'PERMISSION_DENIED') {
          onError?.(
            'Permissão de Microfone',
            'O Memorial precisa de autorização de microfone para registrar memórias por voz.'
          );
        } else {
          onError?.(
            'Gravação de Áudio',
            err.message || 'Não foi possível iniciar o microfone neste momento.'
          );
        }
      }
    }
  };

  const handleCancelVoice = async () => {
    try {
      await cancelNativeRecording();
    } catch {}
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const hasContent = value.trim().length > 0;
  const canSubmit = hasContent && !isSubmitting && !isRecording && !isTranscribing;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View
      style={[
        styles.capsule,
        {
          backgroundColor: isDark ? '#1C1916' : '#FFFFFF',
          borderColor: isDark ? 'rgba(231, 176, 117, 0.22)' : 'rgba(196, 139, 71, 0.22)',
          shadowColor: isDark ? '#000000' : '#3A3228',
        },
      ]}
    >
      {/* Botão '+' da esquerda: abre o modal completo de novo registro */}
      <TouchableOpacity
        onPress={onOpenFullSheet}
        style={[
          styles.iconBtn,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Abrir formulário completo de registro com versículos e categorias"
      >
        <Feather name="plus" size={19} color={colors.amber.DEFAULT} />
      </TouchableOpacity>

      {/* Área Central: Campo de Texto expansível OU Indicador de Gravação/Transcrição */}
      {isRecording ? (
        <View style={styles.recordingRow}>
          <Animated.View
            style={[
              styles.recordingDot,
              {
                backgroundColor: colors.error,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Text style={[styles.recordingTimerText, { color: colors.text.primary }]}>
            Gravando ({formatTimer(recordingSeconds)})
          </Text>
          <TouchableOpacity
            onPress={handleCancelVoice}
            style={styles.cancelVoiceBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Cancelar gravação de voz"
          >
            <Feather name="x" size={15} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      ) : isTranscribing ? (
        <View style={styles.transcribingRow}>
          <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
          <Text style={[styles.transcribingText, { color: colors.amber.DEFAULT }]}>
            Transcrevendo memória…
          </Text>
        </View>
      ) : (
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="O que Deus ministrou ao seu coração hoje? Registre uma memória..."
          placeholderTextColor={colors.text.muted}
          multiline
          scrollEnabled={true}
          style={[
            styles.input,
            {
              color: colors.text.primary,
            },
          ]}
          maxLength={4000}
        />
      )}

      {/* Ações da Direita: Ícone de Voz + Botão Registrar */}
      <View style={styles.rightActionsRow}>
        {/* Ícone de microfone */}
        <TouchableOpacity
          onPress={handleToggleVoice}
          style={[
            styles.micBtn,
            isRecording && {
              backgroundColor: isDark ? '#3D1C1F' : '#FDE8E8',
            },
          ]}
          disabled={isTranscribing}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Parar e transcrever voz' : 'Gravar memória por voz'}
        >
          {isRecording ? (
            <Feather name="square" size={16} color={colors.error} />
          ) : (
            <Feather
              name="mic"
              size={18}
              color={isTranscribing ? colors.text.muted : colors.text.secondary}
            />
          )}
        </TouchableOpacity>

        {/* Botão Registrar */}
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[
            styles.submitBtn,
            {
              backgroundColor: canSubmit
                ? colors.amber.DEFAULT
                : isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Registrar memória na Linha Sagrada"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.text.onAmber} />
          ) : (
            <Text
              style={[
                styles.submitBtnText,
                {
                  color: canSubmit ? colors.text.onAmber : colors.text.muted,
                },
              ]}
            >
              Registrar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing['4'],
    marginBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    minHeight: 36,
    maxHeight: 110,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 7 : 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  recordingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cancelVoiceBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  transcribingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  transcribingText: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
