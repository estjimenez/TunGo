import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthShell, authStyles } from '../components/AuthShell';
import { ProfileEditor } from '../components/ProfileEditor';
import { useAuth } from '../lib/auth';

export default function AccountScreen() {
  const { user, ready, sessionError, retrySession, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const changeAccount = async () => {
    setSigningOut(true);
    setError(null);

    try {
      await signOut();
      router.replace('/login');
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? `Se cerró la sesión en este dispositivo, pero el servidor no confirmó el cierre: ${logoutError.message}`
          : 'Se cerró la sesión en este dispositivo, pero el servidor no confirmó el cierre.',
      );
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AuthShell
      description="Administra la cuenta activa en este dispositivo."
      eyebrow="PERFIL TUNGO"
      title="Mi cuenta"
    >
      {!ready && <Text style={authStyles.notice}>Comprobando tu sesión…</Text>}
      {sessionError && (
        <>
          <Text accessibilityRole="alert" style={authStyles.error}>
            {sessionError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void retrySession()}
            style={authStyles.textButton}
          >
            <Text style={authStyles.textButtonText}>Volver a intentar</Text>
          </Pressable>
        </>
      )}
      {error && <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text>}
      {user ? (
        <>
          <View style={styles.profileCard}>
            <Text style={styles.profileEyebrow}>SESIÓN ACTIVA</Text>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user.role_label}</Text>
            </View>
            {user.establecimiento && (
              <Text style={styles.businessName}>
                {user.establecimiento.nombre}
              </Text>
            )}
            <Text style={styles.profileEmail}>{user.telefono ?? 'Agrega un teléfono de contacto'}</Text>
            {!user.verified && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/verificar')}
                style={authStyles.textButton}
              >
                <Text style={authStyles.textButtonText}>
                  Verificar correo electrónico
                </Text>
              </Pressable>
            )}
          </View>
          <ProfileEditor />
          <Text style={authStyles.notice}>
            Tu correo y tipo de cuenta están protegidos. Para cambiar de cuenta,
            cierra esta sesión e ingresa con otro usuario.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={() => void changeAccount()}
            style={({ pressed }) => [
              authStyles.primaryButton,
              signingOut && authStyles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={authStyles.primaryButtonText}>
              {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={authStyles.notice}>
            Ingresa con una cuenta existente o crea una nueva y selecciona el
            perfil que corresponda: cliente, establecimiento o domiciliario.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={authStyles.primaryButton}
          >
            <Text style={authStyles.primaryButtonText}>Ingresar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/registro')}
            style={authStyles.textButton}
          >
            <Text style={authStyles.textButtonText}>Crear cuenta</Text>
          </Pressable>
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  profileEyebrow: {
    color: '#FF7A16',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1,
  },
  profileName: {
    color: '#F7F3EB',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 10,
  },
  profileEmail: {
    color: '#A7AAA3',
    fontSize: 14,
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    marginTop: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: '#090A09',
    fontSize: 11,
    fontWeight: '900',
  },
  businessName: {
    color: '#F7F3EB',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
