import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  isNativeAudioAvailable,
  startNativeRecording,
  stopNativeRecording,
  cancelNativeRecording,
} from '../../lib/nativeAudioService';
import { transcribeAudioUri } from '../../lib/voiceTranscriptionService';

import { useTheme, ColorTokens, typography, spacing, radius, getThemedShadows, components } from '../../theme';
import { MemorialCategory } from '../../lib/supabase';
import { MemorialEntry, BibleRef } from '../../lib/types';
import { CATEGORY_CONFIG } from '../../lib/utils';
import { ConfirmModal } from '../ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: Omit<MemorialEntry, 'id' | 'created_at'>) => void;
  initialCategory?: MemorialCategory;
  initialBibleRef?: BibleRef | null;
  initialVerseText?: string;
  initialTitle?: string;
  initialContent?: string;
}

const CATEGORIES: MemorialCategory[] = ['reflexao', 'oracao', 'testemunho', 'jejum'];

const PLACEHOLDERS: Record<MemorialCategory, string> = {
  reflexao:
    'Registre o que foi despertado durante a reflexão bíblica ou oração...',
  oracao:
    'Descreva o motivo de oração ou clamor apresentado a Deus...',
  testemunho:
    'Descreva o que o Senhor realizou e a evidência de Sua fidelidade...',
  jejum:
    'Defina o propósito deste jejum ou voto espiritual...',
};

const SUGGESTED_TAGS: Record<MemorialCategory, string[]> = {
  reflexao: ['revelação', 'sabedoria', 'graça', 'obediência'],
  oracao: ['família', 'saúde', 'direção', 'cura'],
  testemunho: ['providência', 'resposta', 'fidelidade', 'vitória'],
  jejum: ['consagração', 'direção', 'altar'],
};

import { BookPickerModal } from '../bible/BookPickerModal';
import { BibleBookInfo } from '../../lib/bibleData';

export function NovoRegistroSheet({
  visible,
  onClose,
  onSave,
  initialCategory,
  initialBibleRef,
  initialVerseText,
  initialTitle,
  initialContent,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [category, setCategory] = useState<MemorialCategory>(initialCategory || 'reflexao');
  const [title, setTitle] = useState(initialTitle || '');
  const [content, setContent] = useState(initialContent || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const s = useMemo(() => getSheetStyles(colors, isDark), [colors, isDark]);

  // Versículo e Livro Bíblico
  const [showBiblePicker, setShowBiblePicker] = useState(false);
  const [selectedBook, setSelectedBook] = useState(initialBibleRef?.book || 'Salmos');
  const [selectedBookSlug, setSelectedBookSlug] = useState(initialBibleRef?.slug || 'sl');
  const [chapter, setChapter] = useState(initialBibleRef?.chapter?.toString() || '1');
  const [verse, setVerse] = useState(initialBibleRef?.verse?.toString() || '1');
  const [bibleRef, setBibleRef] = useState<BibleRef | null>(initialBibleRef || null);
  const [verseQuoteText, setVerseQuoteText] = useState<string | null>(initialVerseText || null);

  // Gravação por voz — requer dev build (expo-av/expo-audio indisponível no Expo Go SDK 57)
  const recordingRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeMessage, setTranscribeMessage] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<any>(null);
  const recordingPulse = useRef(new Animated.Value(1)).current;

  // Modal Editorial de Alerta e Confirmação de Áudio
  const [audioDialog, setAudioDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: keyof typeof Feather.glyphMap;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, {
            toValue: 1.35,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(recordingPulse, {
            toValue: 0.9,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      recordingPulse.setValue(1);
    }
  }, [isRecording]);

  // Animação de subida do sheet
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCategory(initialCategory || 'reflexao');
      if (initialBibleRef) {
        setBibleRef(initialBibleRef);
        setSelectedBook(initialBibleRef.book);
        setSelectedBookSlug(initialBibleRef.slug);
        setChapter(initialBibleRef.chapter.toString());
        setVerse(initialBibleRef.verse ? initialBibleRef.verse.toString() : '1');
      } else {
        setBibleRef(null);
      }
      if (initialTitle !== undefined) {
        setTitle(initialTitle);
      }
      if (initialContent !== undefined) {
        setContent(initialContent);
      }
      if (initialVerseText) {
        setVerseQuoteText(initialVerseText);
      } else if (initialVerseText === undefined && !initialBibleRef) {
        setVerseQuoteText(null);
      }

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      cancelVoiceRecording();
    }
  }, [visible, initialCategory, initialBibleRef, initialVerseText, initialTitle, initialContent]);

  // Gravação de voz nativa com AssemblyAI
  const startVoiceRecording = async () => {
    if (isRecording) {
      await handleStopAndTranscribe();
      return;
    }

    if (!isNativeAudioAvailable()) {
      setAudioDialog({
        visible: true,
        title: 'Gravação de Voz Nativa',
        message: 'A gravação de áudio em tempo real com a AssemblyAI requer a Dev Build nativa compilada no aparelho.\n\nDeseja testar a conexão com a AssemblyAI através de um áudio demonstrativo agora?',
        icon: 'mic',
        confirmLabel: 'Testar Conexão',
        cancelLabel: 'Agora não',
        onConfirm: () => {
          setAudioDialog((prev) => ({ ...prev, visible: false }));
          handleTestAssemblyAi();
        },
      });
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
      if (err.message === 'PERMISSION_DENIED') {
        setAudioDialog({
          visible: true,
          title: 'Permissão de Microfone',
          message: 'O Memorial precisa de autorização de microfone para registrar seus testemunhos por voz.',
          icon: 'mic-off',
          confirmLabel: 'Entendido',
          cancelLabel: '',
        });
      } else {
        setAudioDialog({
          visible: true,
          title: 'Gravação de Áudio',
          message: err.message || 'Não foi possível iniciar o microfone neste momento.',
          icon: 'alert-circle',
          confirmLabel: 'Entendido',
          cancelLabel: '',
          destructive: true,
        });
      }
    }
  };

  const handleStopAndTranscribe = async () => {
    try {
      setIsRecording(false);
      setIsTranscribing(true);
      setTranscribeMessage('Finalizando áudio...');

      const audioUri = await stopNativeRecording();

      setTranscribeMessage('Enviando para AssemblyAI...');
      const transcript = await transcribeAudioUri(audioUri, (p) => {
        setTranscribeMessage(p.message);
      });

      if (transcript && transcript.trim()) {
        setContent((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${transcript.trim()}` : transcript.trim()
        );
      }
    } catch (err: any) {
      console.warn('Erro na transcrição:', err);
      setAudioDialog({
        visible: true,
        title: 'Transcrição de Áudio',
        message: err.message || 'Falha ao transcrever o áudio gravado.',
        icon: 'alert-circle',
        confirmLabel: 'Entendido',
        cancelLabel: '',
        destructive: true,
      });
    } finally {
      setIsTranscribing(false);
      setTranscribeMessage('');
      setRecordingSeconds(0);
    }
  };

  const cancelVoiceRecording = async () => {
    try {
      await cancelNativeRecording();
    } catch {}
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const stopVoiceRecording = async () => {
    await handleStopAndTranscribe();
  };

  const handleTestAssemblyAi = async () => {
    try {
      setIsTranscribing(true);
      setTranscribeMessage('Conectando à AssemblyAI com áudio de teste...');

      // URL de áudio padrão da AssemblyAI para validação da chave e do pipeline
      const testAudioUrl = 'https://assembly.ai/wildfires.mp3';
      const transcript = await transcribeAudioUri(testAudioUrl, (p) => {
        setTranscribeMessage(p.message);
      });

      if (transcript && transcript.trim()) {
        setContent((prev) =>
          prev.trim()
            ? `${prev.trim()}\n\n[Transcrição de Voz]:\n${transcript.trim()}`
            : `[Transcrição de Voz]:\n${transcript.trim()}`
        );
        setAudioDialog({
          visible: true,
          title: 'Transcrição Concluída',
          message: 'O áudio foi transcrito em texto com sucesso!',
          icon: 'check-circle',
          confirmLabel: 'Excelente',
          cancelLabel: '',
        });
      }
    } catch (err: any) {
      setAudioDialog({
        visible: true,
        title: 'Transcrição de Áudio',
        message: 'Não foi possível transcrever o áudio no momento. Verifique sua conexão.',
        icon: 'alert-circle',
        confirmLabel: 'Entendido',
        cancelLabel: '',
        destructive: true,
      });
    } finally {
      setIsTranscribing(false);
      setTranscribeMessage('');
    }
  };


  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().replace(/^#/, '');
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setCustomTagInput('');
      setShowTagInput(false);
    }
  };

  const handleSelectPassageFromModal = (book: BibleBookInfo, ch: number) => {
    setSelectedBook(book.name);
    setSelectedBookSlug(book.slug);
    setChapter(ch.toString());
    const vNum = parseInt(verse, 10);
    const display = vNum ? `${book.name} ${ch}:${vNum}` : `${book.name} ${ch}`;
    setBibleRef({
      book: book.name,
      slug: book.slug,
      chapter: ch,
      verse: vNum || undefined,
      display,
    });
    setShowBiblePicker(false);
  };

  const handleRemoveBibleRef = () => {
    setBibleRef(null);
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);

    try {
      await new Promise((r) => setTimeout(r, 450));

      onSave({
        category,
        title: title.trim() || undefined,
        content: content.trim(),
        bible_ref: bibleRef || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        ai_status: 'processing',
        is_answered: category === 'oracao' ? false : undefined,
      });

      setTitle('');
      setContent('');
      setSelectedTags([]);
      setBibleRef(null);
      setVerseQuoteText(null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={onClose}
      >
      <View style={s.modalOverlay}>
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.keyboardWrap}
        >
          <Animated.View
            style={[
              s.sheetContainer,
              {
                paddingBottom: Math.max(insets.bottom, 20),
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Handle de arrasto */}
            <View style={s.handleBar} />

            {/* Cabeçalho */}
            <View style={s.sheetHeader}>
              <View style={s.headerTitleWrap}>
                <Text style={s.headerTitle}>Novo Marco de Fé</Text>
                <Text style={s.headerSubtitle}>
                  Registre sua experiência para conexão bíblica
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={s.closeBtn}
                accessibilityLabel="Fechar"
                accessibilityRole="button"
              >
                <Feather name="x" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── 1. Seletor de Categoria (Monocromático, sem arco-íris) ── */}
              <View style={s.section}>
                <Text style={s.sectionLabel}>CATEGORIA</Text>
                <View style={s.categoryRow}>
                  {CATEGORIES.map((catKey) => {
                    const cfg = CATEGORY_CONFIG[catKey];
                    const isSelected = category === catKey;

                    return (
                      <TouchableOpacity
                        key={catKey}
                        onPress={() => setCategory(catKey)}
                        activeOpacity={0.8}
                        style={[
                          s.categoryChip,
                          isSelected && s.categoryChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            s.categoryChipText,
                            isSelected && s.categoryChipTextSelected,
                          ]}
                        >
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── 2. Título Opcional ── */}
              <View style={s.section}>
                <Text style={s.sectionLabel}>TÍTULO (OPCIONAL)</Text>
                <TextInput
                  style={s.titleInput}
                  placeholder="Ex: Provisão em oração"
                  placeholderTextColor={colors.text.muted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={80}
                  selectionColor={colors.amber.DEFAULT}
                />
              </View>

              {/* ── 3. Relato / Campo Principal ── */}
              <View style={s.section}>
                <View style={s.labelWithActionRow}>
                  <Text style={s.sectionLabel}>RELATO</Text>

                  <View style={s.voiceActionsGroup}>
                    {/* Gatilho de gravação de voz limpo */}
                    <TouchableOpacity
                      style={[
                        s.voiceBtn,
                        isRecording && s.voiceBtnActive,
                        isTranscribing && { borderColor: colors.amber.DEFAULT },
                      ]}
                      disabled={isTranscribing}
                      onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
                      activeOpacity={0.75}
                    >
                      {isTranscribing ? (
                        <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
                      ) : isRecording ? (
                        <Feather name="square" size={12} color={colors.error} />
                      ) : (
                        <Feather name="mic" size={13} color={colors.text.secondary} />
                      )}
                      <Text
                        style={[
                          s.voiceBtnText,
                          isRecording && { color: colors.error, fontWeight: '700' },
                          isTranscribing && { color: colors.amber.DEFAULT },
                        ]}
                      >
                        {isTranscribing
                          ? 'Transcrevendo...'
                          : isRecording
                          ? `Parar (${formatTimer(recordingSeconds)})`
                          : 'Gravar por voz'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isRecording && (
                  <View style={s.recordingStatus}>
                    <View style={s.recordingStatusLeft}>
                      <Animated.View
                        style={[
                          s.recordingDot,
                          {
                            transform: [{ scale: recordingPulse }],
                            opacity: recordingPulse.interpolate({
                              inputRange: [0.9, 1.35],
                              outputRange: [1, 0.4],
                            }),
                          },
                        ]}
                      />
                      <Text style={s.recordingStatusText}>
                        Gravando áudio ({formatTimer(recordingSeconds)})... Toque em Parar para transcrever.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={cancelVoiceRecording}
                      style={s.cancelVoiceBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar gravação"
                    >
                      <Text style={s.cancelVoiceBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isTranscribing && (
                  <View style={s.transcribingStatus}>
                    <ActivityIndicator size="small" color={colors.amber.DEFAULT} />
                    <Text style={s.transcribingStatusText}>
                      {transcribeMessage || 'Transcrevendo relato por voz...'}
                    </Text>
                  </View>
                )}

                {/* ── Citação Inspiradora do Versículo ── */}
                {verseQuoteText && (
                  <View style={s.verseQuoteCard}>
                    <View style={s.verseQuoteHeader}>
                      <View style={s.verseQuoteBadge}>
                        <Feather name="bookmark" size={11} color={colors.amber.DEFAULT} />
                        <Text style={s.verseQuoteRef}>{bibleRef?.display || 'Passagem'}</Text>
                      </View>
                      <Text style={s.verseQuoteLabel}>Escritura Ancorada</Text>
                    </View>
                    <Text style={s.verseQuoteText}>"{verseQuoteText}"</Text>
                  </View>
                )}

                <View style={s.textAreaContainer}>
                  <TextInput
                    style={s.contentInput}
                    placeholder={
                      verseQuoteText
                        ? 'O que Deus ministrou ao seu coração através desta palavra?'
                        : PLACEHOLDERS[category]
                    }
                    placeholderTextColor={colors.text.muted}
                    multiline
                    textAlignVertical="top"
                    value={content}
                    onChangeText={setContent}
                    selectionColor={colors.amber.DEFAULT}
                  />
                </View>
              </View>

              {/* ── 4. Passagem Bíblica (Todos os 66 livros) ── */}
              <View style={s.section}>
                <View style={s.labelWithActionRow}>
                  <Text style={s.sectionLabel}>PASSAGEM BÍBLICA</Text>
                  {bibleRef && (
                    <TouchableOpacity
                      onPress={() => setShowBiblePicker(true)}
                      style={s.actionLink}
                    >
                      <Text style={s.actionLinkText}>Mudar livro/capítulo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {bibleRef ? (
                  <View style={s.bibleSelectedCard}>
                    <View style={s.bibleRefBadge}>
                      <Feather name="book-open" size={15} color={colors.amber.DEFAULT} />
                      <Text style={s.bibleRefText}>{bibleRef.display}</Text>
                      <TouchableOpacity
                        onPress={handleRemoveBibleRef}
                        style={s.removeBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Remover passagem"
                      >
                        <Feather name="x" size={15} color={colors.text.muted} />
                      </TouchableOpacity>
                    </View>

                    {/* Ajuste fino opcional de versículo */}
                    <View style={s.verseAdjustRow}>
                      <Text style={s.verseAdjustLabel}>Versículo específico:</Text>
                      <TextInput
                        style={s.verseAdjustInput}
                        placeholder="Ex: 1"
                        placeholderTextColor={colors.text.muted}
                        value={verse}
                        onChangeText={(val) => {
                          setVerse(val);
                          const v = parseInt(val, 10);
                          setBibleRef((prev) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              verse: v || undefined,
                              display: v ? `${prev.book} ${prev.chapter}:${v}` : `${prev.book} ${prev.chapter}`,
                            };
                          });
                        }}
                        keyboardType="number-pad"
                        maxLength={3}
                        selectionColor={colors.amber.DEFAULT}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowBiblePicker(true)}
                    style={s.addBibleBtn}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel="Escolher passagem bíblica"
                  >
                    <View style={s.addBibleBtnLeft}>
                      <Feather name="book-open" size={16} color={colors.amber.DEFAULT} />
                      <Text style={s.addBibleBtnText}>
                        Selecionar na Bíblia (66 livros)
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.text.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* ── 5. Marcadores (Tags) ── */}
              <View style={s.section}>
                <View style={s.labelWithActionRow}>
                  <Text style={s.sectionLabel}>TAGS</Text>
                  {!showTagInput && (
                    <TouchableOpacity onPress={() => setShowTagInput(true)}>
                      <Text style={s.actionLinkText}>+ Nova tag</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {showTagInput && (
                  <View style={s.customTagRow}>
                    <TextInput
                      style={s.customTagInput}
                      placeholder="Ex: provisão"
                      placeholderTextColor={colors.text.muted}
                      value={customTagInput}
                      onChangeText={setCustomTagInput}
                      autoCapitalize="none"
                      onSubmitEditing={handleAddCustomTag}
                      selectionColor={colors.amber.DEFAULT}
                    />
                    <TouchableOpacity
                      onPress={handleAddCustomTag}
                      style={s.addTagBtn}
                    >
                      <Text style={s.addTagBtnText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={s.tagsRow}>
                  {SUGGESTED_TAGS[category].map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => handleToggleTag(tag)}
                        style={[s.tagChip, active && s.tagChipActive]}
                      >
                        <Text
                          style={[s.tagChipText, active && s.tagChipTextActive]}
                        >
                          #{tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {selectedTags
                    .filter((t) => !SUGGESTED_TAGS[category].includes(t))
                    .map((custom) => (
                      <TouchableOpacity
                        key={custom}
                        onPress={() => handleToggleTag(custom)}
                        style={[s.tagChip, s.tagChipActive]}
                      >
                        <Text style={[s.tagChipText, s.tagChipTextActive]}>
                          #{custom}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              {/* ── Nota Editorial Soberba (Sem AI Slop) ── */}
              <View style={s.noticeWrap}>
                <Text style={s.noticeText}>
                  A inteligência do Memorial analisará este registro para mapear conexões teológicas com as Escrituras.
                </Text>
              </View>

              {/* ── 6. Botão Primário ("Gordinho Suave" Canônico) ── */}
              <TouchableOpacity
                style={[
                  s.saveButton,
                  (!content.trim() || saving) && s.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!content.trim() || saving}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Preservar marco de fé"
              >
                {saving ? (
                  <ActivityIndicator color={colors.text.onAmber} size="small" />
                ) : (
                  <>
                    <Text style={s.saveButtonText}>Preservar marco de fé</Text>
                    <Feather name="arrow-right" size={18} color={colors.text.onAmber} />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {/* Modal seletor com todos os 66 livros da Bíblia */}
    <BookPickerModal
      visible={showBiblePicker}
      currentBookSlug={selectedBookSlug}
      currentChapter={parseInt(chapter, 10) || 1}
      onClose={() => setShowBiblePicker(false)}
      onSelect={handleSelectPassageFromModal}
    />

    {/* Modal Editorial de Diálogo / Confirmação de Áudio */}
    <ConfirmModal
      visible={audioDialog.visible}
      onClose={() => setAudioDialog((prev) => ({ ...prev, visible: false }))}
      title={audioDialog.title}
      message={audioDialog.message}
      icon={audioDialog.icon || 'mic'}
      confirmLabel={audioDialog.confirmLabel || 'Entendido'}
      cancelLabel={audioDialog.cancelLabel || ''}
      destructive={audioDialog.destructive}
      onConfirm={() => {
        const action = audioDialog.onConfirm;
        setAudioDialog((prev) => ({ ...prev, visible: false }));
        if (action) action();
      }}
    />
  </>
  );
}

function getSheetStyles(colors: ColorTokens, isDark: boolean) {
  const themedShadows = getThemedShadows(isDark);
  return StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg.overlay,
  },

  keyboardWrap: {
    width: '100%',
    maxHeight: '92%',
  },

  // Sheet Container — borda uniforme, fundo consistente
  sheetContainer: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border.DEFAULT,
    ...themedShadows.sheet,
  },

  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.DEFAULT,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },

  sheetHeader: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    justifyContent:    'space-between',
    paddingHorizontal: spacing['5'],
    paddingBottom:     spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },

  headerTitleWrap: {
    flex: 1,
    gap:  2,
  },

  headerTitle: {
    color:      colors.text.primary,
    fontSize:   18,
    fontWeight: typography.weight.bold,
  },

  headerSubtitle: {
    color:    colors.text.secondary,
    fontSize: 12,
  },

  closeBtn: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: colors.bg.raised,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.border.DEFAULT,
    marginLeft:      spacing['2'],
  },

  scroll: {
    maxHeight: SCREEN_HEIGHT * 0.74,
  },

  scrollContent: {
    paddingHorizontal: spacing['5'],
    paddingTop:        spacing['4'],
    paddingBottom:     spacing['6'],
    gap:               spacing['5'],
  },

  section: {
    gap: spacing['2'],
  },

  sectionLabel: {
    color:         colors.text.secondary,
    fontSize:      11,
    fontWeight:    typography.weight.semibold,
    letterSpacing: 1,
  },

  // Seletor Monocromático
  categoryRow: {
    flexDirection: 'row',
    gap:           spacing['2'],
    flexWrap:      'wrap',
  },

  categoryChip: {
    backgroundColor:   colors.bg.raised,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    borderRadius:      radius.full,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },

  categoryChipSelected: {
    borderColor:     colors.amber.DEFAULT,
    backgroundColor: colors.bg.raised,
  },

  categoryChipText: {
    color:    colors.text.secondary,
    fontSize: 13,
  },

  categoryChipTextSelected: {
    color:      colors.amber.DEFAULT,
    fontWeight: typography.weight.semibold,
  },

  titleInput: {
    backgroundColor:   colors.bg.raised,
    borderRadius:      radius.sm,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    color:             colors.text.primary,
    fontSize:          15,
    paddingHorizontal: spacing['4'],
    height:            components.input.height,
  },

  labelWithActionRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },

  voiceActionsGroup: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },

  testVoiceBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.amber.muted,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      radius.sm,
    borderWidth:       1,
    borderColor:       `${colors.amber.DEFAULT}35`,
    gap:               4,
  },

  testVoiceBtnText: {
    color:      colors.amber.DEFAULT,
    fontSize:   11,
    fontWeight: typography.weight.medium,
  },

  voiceBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.bg.raised,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      radius.sm,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    gap:               5,
  },

  voiceBtnActive: {
    borderColor:     colors.error,
    backgroundColor: 'rgba(209, 91, 91, 0.1)',
  },

  voiceBtnText: {
    color:      colors.text.secondary,
    fontSize:   12,
    fontWeight: typography.weight.medium,
  },

  recordingStatus: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   colors.bg.raised,
    borderRadius:      radius.sm,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
  },

  recordingStatusLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    flex:          1,
  },

  cancelVoiceBtn: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      radius.xs,
    backgroundColor:   'rgba(255, 255, 255, 0.08)',
    marginLeft:        8,
  },

  cancelVoiceBtnText: {
    color:      colors.text.secondary,
    fontSize:   11,
    fontWeight: typography.weight.medium,
  },

  recordingDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.error,
  },

  recordingStatusText: {
    color:    colors.text.secondary,
    fontSize: 12,
    flex:     1,
  },

  transcribingStatus: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.bg.raised,
    borderRadius:      radius.sm,
    paddingHorizontal: 12,
    paddingVertical:   8,
    gap:               8,
    borderWidth:       1,
    borderColor:       `${colors.amber.DEFAULT}40`,
  },

  transcribingStatusText: {
    color:      colors.amber.DEFAULT,
    fontSize:   12,
    fontWeight: typography.weight.medium,
  },

  textAreaContainer: {
    backgroundColor: colors.bg.raised,
    borderRadius:    radius.sm,
    borderWidth:     1,
    borderColor:     colors.border.DEFAULT,
    minHeight:       130,
    padding:         spacing['4'],
  },

  contentInput: {
    flex:       1,
    color:      colors.text.primary,
    fontSize:   15,
    lineHeight: 22,
  },

  actionLink: {
    paddingVertical: 2,
  },

  actionLinkText: {
    color:      colors.amber.DEFAULT,
    fontSize:   12,
    fontWeight: typography.weight.medium,
  },

  bibleRefBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.bg.raised,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    borderRadius:      radius.sm,
    paddingHorizontal: spacing['3'],
    paddingVertical:   10,
    gap:               8,
  },

  bibleRefText: {
    color:      colors.text.primary,
    fontSize:   14,
    fontWeight: typography.weight.medium,
    flex:       1,
  },

  removeBtn: {
    padding: 2,
  },

  bibleSelectedCard: {
    backgroundColor: colors.bg.raised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing['3'],
    gap: spacing['2'],
  },

  verseAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },

  verseAdjustLabel: {
    color: colors.text.muted,
    fontSize: 12,
  },

  verseAdjustInput: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    color: colors.text.primary,
    textAlign: 'center',
    width: 64,
    height: 32,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    paddingVertical: 0,
  },

  addBibleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.raised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacing['4'],
    paddingVertical: 12,
  },

  addBibleBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },

  addBibleBtnText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  customTagRow: {
    flexDirection: 'row',
    gap:           spacing['2'],
  },

  customTagInput: {
    flex:              1,
    backgroundColor:   colors.bg.raised,
    borderRadius:      radius.xs,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    color:             colors.text.primary,
    fontSize:          12,
    paddingHorizontal: 10,
    height:            36,
  },

  addTagBtn: {
    backgroundColor:   colors.bg.surface,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    borderRadius:      radius.xs,
    justifyContent:    'center',
    paddingHorizontal: 12,
  },

  addTagBtnText: {
    color:      colors.amber.DEFAULT,
    fontSize:   12,
    fontWeight: typography.weight.medium,
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing['2'],
  },

  tagChip: {
    backgroundColor:   colors.bg.raised,
    borderWidth:       1,
    borderColor:       colors.border.DEFAULT,
    borderRadius:      radius.xs,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },

  tagChipActive: {
    borderColor: colors.amber.DEFAULT,
  },

  tagChipText: {
    color:    colors.text.muted,
    fontSize: 12,
  },

  tagChipTextActive: {
    color:      colors.amber.DEFAULT,
    fontWeight: typography.weight.medium,
  },

  noticeWrap: {
    paddingVertical:   spacing['2'],
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor:       colors.border.DEFAULT,
  },

  noticeText: {
    color:      colors.text.muted,
    fontSize:   12,
    lineHeight: 18,
  },

  // Botão Primário Canônico ("Gordinho Suave")
  saveButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.amber.DEFAULT,
    height:          components.button.primary.height,       // 56
    borderRadius:    components.button.primary.borderRadius, // 14
    gap:             spacing['2'],
    marginTop:       spacing['2'],
    ...themedShadows.amber,
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveButtonText: {
    color:         colors.text.onAmber,
    fontSize:      16,
    fontWeight:    typography.weight.bold,
    letterSpacing: 0.2,
  },

  // ── Card de Citação da Escritura ──
  verseQuoteCard: {
    backgroundColor: colors.bg.subtle,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.border.active,
    padding:         spacing['4'],
    marginBottom:    spacing['3'],
    gap:             8,
  },
  verseQuoteHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  verseQuoteBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   colors.amber.muted,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.xs,
  },
  verseQuoteRef: {
    color:         colors.amber.DEFAULT,
    fontSize:      11,
    fontWeight:    typography.weight.bold,
    letterSpacing: 0.2,
  },
  verseQuoteLabel: {
    color:          colors.text.muted,
    fontSize:       10,
    textTransform:  'uppercase',
    letterSpacing:  0.8,
  },
  verseQuoteText: {
    color:       isDark ? '#E8E3EE' : colors.text.primary,
    fontSize:    13,
    lineHeight:  20,
    fontStyle:   'italic',
    fontFamily:  Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
});
}
