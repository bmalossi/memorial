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
import { transcribeAudioUri, LocalSpeechRecognizer, decideTranscriptionEngine } from '../../lib/voiceTranscriptionService';
import { defaultOnDeviceSpeechRecognizer } from '../../lib/onDeviceSpeechService';

interface BottomQuickCaptureBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onOpenFullSheet: () => void;
  onError?: (title: string, message: string) => void;
  isSubmitting?: boolean;
  speechRecognizer?: LocalSpeechRecognizer;
}

export function BottomQuickCaptureBar({
  value,
  onChangeText,
  onSubmit,
  onOpenFullSheet,
  onError,
  isSubmitting = false,
  speechRecognizer,
}: BottomQuickCaptureBarProps) {
  const { colors, isDark } = useTheme();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeMessage, setTranscribeMessage] = useState('');
  const [isLocalModeNotice, setIsLocalModeNotice] = useState(false);
  const [isLocalLiveDictation, setIsLocalLiveDictation] = useState(false);

  const baseContentBeforeLiveRef = useRef<string>('');
  const recordingTimer = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const isLocalLiveDictationRef = useRef(false);
  isRecordingRef.current = isRecording;
  isLocalLiveDictationRef.current = isLocalLiveDictation;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const recognizer = speechRecognizer || defaultOnDeviceSpeechRecognizer;

  // Pulso discreto no ponto indicador de gravação
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 600,
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

  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (isRecordingRef.current) {
        if (isLocalLiveDictationRef.current) {
          recognizer.cancel().catch(() => {});
        } else {
          cancelNativeRecording().catch(() => {});
        }
      }
    };
  }, [recognizer]);

  const handleToggleVoice = async () => {
    if (isTranscribing) return;

    if (isRecording) {
      if (isLocalLiveDictation) {
        try {
          if (recordingTimer.current) clearInterval(recordingTimer.current);
          setIsRecording(false);
          setIsLocalLiveDictation(false);
          setIsTranscribing(true);
          setTranscribeMessage('Finalizando reconhecimento no aparelho...');

          const finalText = await recognizer.stop();
          const base = baseContentBeforeLiveRef.current.trim();
          if (finalText && finalText.trim()) {
            onChangeText(base ? `${base}\n\n${finalText.trim()}` : finalText.trim());
          }
          setIsLocalModeNotice(true);
        } catch (err: any) {
          console.warn('[QuickCapture] Erro ao finalizar ditado local:', err);
        } finally {
          setIsTranscribing(false);
          setTranscribeMessage('');
          setRecordingSeconds(0);
        }
        return;
      }

      try {
        setIsRecording(false);
        setIsTranscribing(true);
        setTranscribeMessage('Finalizando áudio...');

        const uri = await stopNativeRecording();
        setTranscribeMessage('Transcrevendo relato...');

        const transcript = await transcribeAudioUri(uri, (p) => {
          setTranscribeMessage(p.message);
          if (p.status === 'local') {
            setIsLocalModeNotice(true);
          }
        });

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
        setTranscribeMessage('');
        setRecordingSeconds(0);
      }
      return;
    }

    const decision = await decideTranscriptionEngine();

    // Se a cota foi renovada e temos conexão, volta sozinho ao modo premium
    if (decision.engine === 'premium' && isLocalModeNotice) {
      setIsLocalModeNotice(false);
    }

    const shouldRunLocal =
      decision.engine === 'local' ||
      (isLocalModeNotice && decision.engine !== 'premium');

    // Se o modo local estiver indicado (cota esgotada, offline, ou ativo previamente)
    if (shouldRunLocal) {
      const isAvail = await recognizer.isAvailable();
      if (isAvail) {
        if (decision.reason === 'quota_exceeded' || decision.reason === 'offline') {
          setIsLocalModeNotice(true);
        }
        try {
          setIsLocalLiveDictation(true);
          setIsRecording(true);
          setRecordingSeconds(0);
          baseContentBeforeLiveRef.current = value;

          if (recordingTimer.current) clearInterval(recordingTimer.current);
          recordingTimer.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);

          await recognizer.start({
            onPartialResult: (partialText) => {
              const base = baseContentBeforeLiveRef.current.trim();
              if (partialText) {
                onChangeText(base ? `${base}\n\n${partialText}` : partialText);
              }
            },
          });
          return;
        } catch (liveErr: any) {
          if (recordingTimer.current) clearInterval(recordingTimer.current);
          setIsLocalLiveDictation(false);
          setIsRecording(false);
          onError?.(
            'Reconhecimento de Voz Local',
            liveErr.message || 'Não foi possível iniciar o reconhecimento de voz no aparelho.'
          );
          return;
        }
      }
    }

    if (!isNativeAudioAvailable()) {
      onError?.(
        'Gravação de Voz Nativa',
        'A gravação de voz com transcrição em tempo real requer a Dev Build do Memorial.'
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
  };

  const handleCancelVoice = async () => {
    if (isLocalLiveDictation) {
      try {
        if (recordingTimer.current) clearInterval(recordingTimer.current);
        await recognizer.cancel();
      } catch {}
      onChangeText(baseContentBeforeLiveRef.current);
      setIsRecording(false);
      setIsLocalLiveDictation(false);
      setRecordingSeconds(0);
      return;
    }

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
    <View style={styles.wrapper}>
      {/* ── Aviso Sereno de Modo Local (On-Device) ── */}
      {isLocalModeNotice && (
        <View
          style={[
            styles.localNoticeBanner,
            {
              backgroundColor: colors.bg.subtle,
              borderColor: colors.border.active,
            },
          ]}
        >
          <View style={styles.localNoticeContent}>
            <Feather name="shield" size={13} color={colors.amber.DEFAULT} />
            <Text style={[styles.localNoticeText, { color: colors.text.secondary }]}>
              Modo local ativo: transcrito no aparelho em pt-BR. Vale revisar o texto.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsLocalModeNotice(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fechar aviso de modo local"
          >
            <Feather name="x" size={13} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          styles.capsule,
          {
            backgroundColor: colors.bg.surface,
            borderColor: colors.border.DEFAULT,
            shadowColor: isDark ? '#000000' : '#3A3228',
          },
        ]}
      >
        {/* Ícone '+' à esquerda: discreto, limpo, sem moldura artificial */}
        <TouchableOpacity
          onPress={onOpenFullSheet}
          style={styles.iconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Abrir formulário completo de registro"
        >
          <Feather name="plus" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Área Central: Entrada de texto OU Estado de gravação/transcrição */}
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
            {isLocalLiveDictation ? (
              <TextInput
                ref={inputRef}
                value={value}
                onChangeText={onChangeText}
                placeholder="Ouvindo no aparelho..."
                placeholderTextColor={colors.text.muted}
                multiline
                scrollEnabled={true}
                style={[
                  styles.input,
                  {
                    color: colors.text.primary,
                    paddingHorizontal: 0,
                  },
                ]}
                maxLength={4000}
              />
            ) : (
              <Text style={[styles.recordingTimerText, { color: colors.text.primary }]}>
                Gravando {formatTimer(recordingSeconds)}
              </Text>
            )}
            <TouchableOpacity
              onPress={handleCancelVoice}
              style={styles.cancelVoiceBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar gravação"
            >
              <Feather name="x" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        ) : isTranscribing ? (
          <View style={styles.transcribingRow}>
            <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
            <Text style={[styles.transcribingText, { color: colors.amber.DEFAULT }]}>
              {transcribeMessage || 'Transcrevendo memória…'}
            </Text>
          </View>
        ) : (
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder="Registre uma memória..."
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

        {/* Ações da Direita: Ícone de Voz + Botão Circular de Ação */}
        <View style={styles.rightGroup}>
          {/* Ícone de microfone limpo */}
          <TouchableOpacity
            onPress={handleToggleVoice}
            style={styles.iconBtn}
            disabled={isTranscribing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Parar e transcrever' : 'Gravar por voz'}
          >
            {isRecording ? (
              <Feather name="square" size={18} color={colors.error} />
            ) : (
              <Feather
                name="mic"
                size={19}
                color={isTranscribing ? colors.text.muted : colors.text.secondary}
              />
            )}
          </TouchableOpacity>

          {/* Botão de Envio Circular — Fiel à imagem de referência */}
          <TouchableOpacity
            onPress={onSubmit}
            disabled={!canSubmit}
            style={[
              styles.circleBtn,
              {
                backgroundColor: canSubmit
                  ? colors.amber.DEFAULT
                  : colors.bg.raised,
                opacity: canSubmit ? 1 : 0.45,
              },
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Registrar memória"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.text.onAmber} />
            ) : (
              <Feather
                name="arrow-up"
                size={19}
                color={canSubmit ? colors.text.onAmber : colors.text.muted}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing['4'],
    marginBottom: Platform.OS === 'ios' ? 8 : 6,
    gap: 6,
  },
  localNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    gap: 8,
  },
  localNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  localNoticeText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 7 : 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  recordingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '500',
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
    paddingHorizontal: 8,
    gap: 8,
  },
  transcribingText: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

