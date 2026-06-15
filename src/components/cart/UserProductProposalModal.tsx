import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { uploadPendingProductImage } from '@/services/pendingProductImageUpload';
import { reportUserProductProposal } from '@/services/pendingProductReport';
import { radii, touchTargets } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { normalizePriceInput, parsePriceInput } from '@/utils/priceInput';
import { withClickSound } from '@/utils/withClickSound';
import { withTaskHaptic } from '@/utils/withTaskFeedback';

import type { Product } from '@/types';

interface UserProductProposalModalProps {
  visible: boolean;
  barcode: string;
  supermarketId: string;
  supermarketName?: string;
  nameHint?: string;
  onClose: () => void;
  onSubmitted: (product: Product) => void;
}

export function UserProductProposalModal({
  visible,
  barcode,
  supermarketId,
  supermarketName,
  nameHint,
  onClose,
  onSubmitted,
}: UserProductProposalModalProps) {
  const { theme } = useSupermarketTheme();
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setProductName(nameHint?.trim() ?? '');
    setBrand('');
    setPriceInput('');
    setPhotoUri(null);
    setError(null);
    setSubmitting(false);
    const timer = setTimeout(() => nameRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, [visible, nameHint]);

  const unitPrice = parsePriceInput(priceInput);
  const canSubmit = productName.trim().length >= 2 && unitPrice > 0 && Boolean(photoUri);

  const pickPhoto = async (useCamera: boolean) => {
    setError(null);

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Necesitamos acceso a la cámara para sacar la foto del producto.');
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Necesitamos acceso a tus fotos para elegir una imagen.');
        return;
      }
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: true,
          aspect: [1, 1],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: true,
          aspect: [1, 1],
        });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting || !photoUri) return;

    setSubmitting(true);
    setError(null);

    const imageUrl = await uploadPendingProductImage(photoUri, barcode);
    if (!imageUrl) {
      setSubmitting(false);
      setError('No se pudo subir la foto. Revisá tu conexión e intentá de nuevo.');
      return;
    }

    const ok = await reportUserProductProposal({
      barcode,
      supermarketId,
      supermarketName,
      nameHint,
      productName: productName.trim(),
      brand: brand.trim() || undefined,
      price: unitPrice,
      imageUrl,
    });

    setSubmitting(false);

    if (!ok) {
      setError('No se pudo enviar la propuesta. Revisá tu conexión.');
      return;
    }

    onSubmitted({
      id: barcode,
      barcode,
      name: productName.trim(),
      brand: brand.trim() || undefined,
      imageUrl,
      price: unitPrice,
      supermarketId,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdropTap}
          onPress={withClickSound(onClose)}
          accessibilityLabel="Cerrar"
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar ventana"
              onPress={withClickSound(onClose)}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color={theme.textMuted} />
            </Pressable>

            <View style={styles.titleRow}>
              <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>Cargar producto</Text>
            </View>

            <View style={[styles.eanBadge, { borderColor: theme.primary, backgroundColor: theme.surfaceElevated }]}>
              <Text style={[styles.eanLabel, { color: theme.primary }]}>Código EAN (no se modifica)</Text>
              <Text style={[styles.eanValue, { color: theme.text }]} selectable>
                {barcode}
              </Text>
            </View>

            <Text style={[styles.help, { color: theme.textMuted }]}>
              Completá los datos del producto que escaneaste. Un admin revisará tu propuesta antes de
              publicarla en el catálogo para todos.
            </Text>

            <View style={styles.photoSection}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <View style={[styles.photoPlaceholder, { borderColor: theme.border }]}>
                  <Ionicons name="image-outline" size={32} color={theme.textMuted} />
                  <Text style={[styles.photoHint, { color: theme.textMuted }]}>Foto del producto</Text>
                </View>
              )}

              <View style={styles.photoActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sacar foto con cámara"
                  onPress={withClickSound(() => void pickPhoto(true))}
                  style={({ pressed }) => [
                    styles.photoBtn,
                    { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Ionicons name="camera-outline" size={18} color={theme.primary} />
                  <Text style={[styles.photoBtnText, { color: theme.text }]}>Cámara</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Elegir foto de galería"
                  onPress={withClickSound(() => void pickPhoto(false))}
                  style={({ pressed }) => [
                    styles.photoBtn,
                    { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Ionicons name="images-outline" size={18} color={theme.primary} />
                  <Text style={[styles.photoBtnText, { color: theme.text }]}>Galería</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Producto</Text>
              <TextInput
                ref={nameRef}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceElevated,
                  },
                ]}
                value={productName}
                onChangeText={setProductName}
                placeholder="Ej: Yerba mate 500g"
                placeholderTextColor={theme.textMuted}
                maxLength={120}
                accessibilityLabel="Nombre del producto"
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Marca (opcional)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceElevated,
                  },
                ]}
                value={brand}
                onChangeText={setBrand}
                placeholder="Ej: La Serenísima — dejalo vacío si no lo sabés"
                placeholderTextColor={theme.textMuted}
                maxLength={80}
                autoCapitalize="words"
                accessibilityLabel="Marca del producto"
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                Precio en góndola (obligatorio)
              </Text>
              <Text style={[styles.fieldHint, { color: theme.textMuted }]}>
                El valor que figura en la etiqueta del super, no el total de tu compra.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.primary,
                    backgroundColor: theme.surfaceElevated,
                  },
                ]}
                value={priceInput}
                onChangeText={(text) => setPriceInput(normalizePriceInput(text))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                selectTextOnFocus
                accessibilityLabel="Precio en góndola"
              />
              {unitPrice > 0 ? (
                <Text style={[styles.pricePreview, { color: theme.primary }]}>
                  {formatCurrency(unitPrice)}
                </Text>
              ) : null}
            </View>

            {error ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar producto para revisión"
              onPress={withTaskHaptic(() => void handleSubmit(), 'medium')}
              disabled={!canSubmit || submitting}
              style={({ pressed }) => [
                styles.okBtn,
                { backgroundColor: theme.primary },
                (!canSubmit || submitting) && styles.okDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.textOnPrimary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={22} color={theme.textOnPrimary} />
              )}
              <Text style={[styles.okText, { color: theme.textOnPrimary }]}>
                {submitting ? 'Enviando…' : 'Enviar y agregar a la lista'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sheet: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
    paddingTop: 44,
    gap: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  help: {
    fontSize: 12,
    lineHeight: 16,
  },
  fieldHint: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 2,
  },
  eanBadge: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  eanLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  eanValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  photoSection: {
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: touchTargets.min,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    minHeight: touchTargets.min,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  pricePreview: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    lineHeight: 16,
  },
  okBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: touchTargets.min,
    borderRadius: radii.md,
    marginTop: 4,
  },
  okDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  okText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
