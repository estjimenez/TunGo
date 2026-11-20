import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { AuthShell, authStyles } from '../components/AuthShell';
import { useAuth } from '../lib/auth';

export default function VerifyScreen() {
  const { user, ready, verify, resendCode } = useAuth();
  const { emailSent } = useLocalSearchParams<{ emailSent?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    emailSent === '0'
      ? 'La cuenta se creó, pero no pudimos enviar el correo. Usa “Reenviar código” para intentarlo otra vez.'
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (user?.verified) {
      router.replace('/app' as Href);
    } else if (!user) {
      router.replace('/login');
    }
  }, [ready, user]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await verify(code);
      router.replace('/app' as Href);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : 'No pudimos verificar el correo. Revisa el código e intenta de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);

    try {
      await resendCode();
      setNotice('Te enviamos un nuevo código. Revisa tu correo.');
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : 'No pudimos enviar el código. Intenta de nuevo.',
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      description={`Enviamos un código de 6 dígitos a ${user?.email ?? 'tu correo'}.`}
      eyebrow="VERIFICACIÓN DE CUENTA"
      title="Confirma tu correo"
    >
      {notice && <Text style={authStyles.notice}>{notice}</Text>}
      {error && <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text>}
      <Text style={authStyles.fieldLabel}>Código de verificación</Text>
      <TextInput
        autoComplete="one-time-code"
        autoFocus
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
        onSubmitEditing={() => void submit()}
        placeholder="000000"
        placeholderTextColor="#777C75"
        returnKeyType="go"
        style={styles.codeField}
        value={code}
      />
      <Pressable
        accessibilityRole="button"
        disabled={submitting || code.length !== 6}
        onPress={() => void submit()}
        style={({ pressed }) => [
          authStyles.primaryButton,
          (submitting || code.length !== 6) &&
            authStyles.primaryButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={authStyles.primaryButtonText}>
          {submitting ? 'Verificando…' : 'Verificar cuenta'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={resending}
        onPress={() => void resend()}
        style={authStyles.textButton}
      >
        <Text style={authStyles.textButtonText}>
          {resending ? 'Enviando…' : 'Reenviar código'}
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  codeField: {
    ...authStyles.field,
    fontFamily: 'monospace',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
