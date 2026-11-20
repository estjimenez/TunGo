import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { Href, router } from 'expo-router';
import { AuthShell, authStyles } from '../components/AuthShell';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const { signIn, sessionError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const account = await signIn(email, password);
      router.replace(
        account.verified ? '/app' as Href : '/verificar',
      );
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'No pudimos iniciar sesión. Intenta de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      description="Ingresa con la cuenta que ya usas en TunGo."
      eyebrow="TUNGO / ACCESO SEGURO"
      title="Ingresa a tu operación"
    >
      {sessionError && (
        <Text accessibilityRole="alert" style={authStyles.notice}>
          {sessionError}
        </Text>
      )}
      {error && <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text>}
      <Text style={authStyles.fieldLabel}>Correo electrónico</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        placeholderTextColor="#777C75"
        returnKeyType="next"
        style={authStyles.field}
        textContentType="emailAddress"
        value={email}
      />
      <Text style={authStyles.fieldLabel}>Contraseña</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="current-password"
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        placeholder="Tu contraseña"
        placeholderTextColor="#777C75"
        returnKeyType="go"
        secureTextEntry
        style={authStyles.field}
        textContentType="password"
        value={password}
      />
      <Pressable
        accessibilityRole="button"
        disabled={submitting || !email.trim() || !password}
        onPress={() => void submit()}
        style={({ pressed }) => [
          authStyles.primaryButton,
          (submitting || !email.trim() || !password) &&
            authStyles.primaryButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={authStyles.primaryButtonText}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/registro')}
        style={authStyles.textButton}
      >
        <Text style={authStyles.textButtonText}>
          ¿Primera vez en TunGo? Crear cuenta
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.78,
  },
});
