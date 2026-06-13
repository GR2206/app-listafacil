import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useMerchantAuthStore } from '@/store/merchantAuthStore';
import { homeColors } from '@/theme/home';
import { typography, spacing, radii } from '@/theme';

interface MerchantLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MerchantLoginModal({ visible, onClose, onSuccess }: MerchantLoginModalProps) {
  const login = useMerchantAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const ok = login(username, password);
    if (!ok) {
      setError('Credenciales inválidas');
      return;
    }

    setError(null);
    setUsername('');
    setPassword('');
    onSuccess?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Acceso comerciante</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={homeColors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.hint}>Ingresá con credenciales de administrador.</Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Usuario"
            placeholderTextColor={homeColors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={homeColors.textMuted}
            secureTextEntry
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [styles.submitBtn, pressed && styles.submitPressed]}
          >
            <Text style={styles.submitText}>Ingresar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: homeColors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.bodyLarge,
    fontWeight: '800',
    color: homeColors.text,
  },
  hint: {
    fontSize: typography.caption,
    color: homeColors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: homeColors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.body,
    color: homeColors.text,
    backgroundColor: homeColors.surfaceElevated,
  },
  error: {
    fontSize: typography.caption,
    color: '#E30613',
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.sm,
    backgroundColor: homeColors.logoRing,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitPressed: {
    opacity: 0.88,
  },
  submitText: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
