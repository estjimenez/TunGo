import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AuthShell, authStyles } from '../components/AuthShell';
import { AccountRole, RegisterData } from '../lib/api';
import { useAuth } from '../lib/auth';

const roles: { value: AccountRole; title: string; description: string }[] = [
  {
    value: 'cliente',
    title: 'Cliente',
    description: 'Explora establecimientos y solicita productos.',
  },
  {
    value: 'establecimiento',
    title: 'Establecimiento',
    description: 'Vincula tu negocio para ofrecer productos en TunGo.',
  },
  {
    value: 'domiciliario',
    title: 'Domiciliario',
    description: 'Participa en la operación de entregas de TunGo.',
  },
];

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AccountRole>('cliente');
  const [establishmentName, setEstablishmentName] = useState('');
  const [establishmentAddress, setEstablishmentAddress] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    const data: RegisterData = {
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: passwordConfirmation,
      rol: role,
      ...(role !== 'cliente' ? { telefono: phone.trim() } : {}),
      ...(role === 'establecimiento'
        ? {
            nombre_establecimiento: establishmentName.trim(),
            direccion_establecimiento: establishmentAddress.trim(),
          }
        : {}),
    };

    try {
      const emailSent = await signUp(data);
      router.replace({
        pathname: '/verificar',
        params: { emailSent: emailSent ? '1' : '0' },
      });
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : 'No pudimos crear la cuenta. Revisa los datos e intenta de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      description="Elige el perfil que corresponde a tu actividad en el servicio."
      eyebrow="CREA TU CUENTA"
      title="Define tu participación"
    >
      {error && <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text>}
      <Text style={authStyles.fieldLabel}>Tipo de cuenta</Text>
      <View style={styles.roleList}>
        {roles.map((option) => {
          const selected = role === option.value;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => setRole(option.value)}
              style={[styles.roleOption, selected && styles.roleOptionSelected]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <View style={styles.roleText}>
                <Text style={styles.roleTitle}>{option.title}</Text>
                <Text style={styles.roleDescription}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={authStyles.fieldLabel}>Nombre completo</Text>
      <TextInput
        autoCapitalize="words"
        autoComplete="name"
        onChangeText={setName}
        placeholder="Tu nombre"
        placeholderTextColor="#777C75"
        style={authStyles.field}
        value={name}
      />
      <Text style={authStyles.fieldLabel}>Correo electrónico</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        placeholderTextColor="#777C75"
        style={authStyles.field}
        value={email}
      />
      {role !== 'cliente' && (
        <>
          <Text style={authStyles.fieldLabel}>Teléfono de contacto</Text>
          <TextInput
            autoComplete="tel"
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="Tu teléfono"
            placeholderTextColor="#777C75"
            style={authStyles.field}
            value={phone}
          />
        </>
      )}
      {role === 'establecimiento' && (
        <>
          <Text style={authStyles.fieldLabel}>Nombre comercial</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={setEstablishmentName}
            placeholder="Nombre de tu negocio"
            placeholderTextColor="#777C75"
            style={authStyles.field}
            value={establishmentName}
          />
          <Text style={authStyles.fieldLabel}>Dirección del establecimiento</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={setEstablishmentAddress}
            placeholder="Dirección"
            placeholderTextColor="#777C75"
            style={authStyles.field}
            value={establishmentAddress}
          />
        </>
      )}
      <Text style={authStyles.fieldLabel}>Contraseña (mínimo 8 caracteres)</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="new-password"
        onChangeText={setPassword}
        placeholder="Crea una contraseña"
        placeholderTextColor="#777C75"
        secureTextEntry
        style={authStyles.field}
        value={password}
      />
      <Text style={authStyles.fieldLabel}>Confirmar contraseña</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="new-password"
        onChangeText={setPasswordConfirmation}
        onSubmitEditing={() => void submit()}
        placeholder="Repite la contraseña"
        placeholderTextColor="#777C75"
        returnKeyType="go"
        secureTextEntry
        style={authStyles.field}
        value={passwordConfirmation}
      />
      <Pressable
        accessibilityRole="button"
        disabled={
          submitting ||
          !name.trim() ||
          !email.trim() ||
          !password ||
          !passwordConfirmation ||
          (role !== 'cliente' && !phone.trim()) ||
          (role === 'establecimiento' &&
            (!establishmentName.trim() || !establishmentAddress.trim()))
        }
        onPress={() => void submit()}
        style={({ pressed }) => [
          authStyles.primaryButton,
          submitting && authStyles.primaryButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={authStyles.primaryButtonText}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/login')}
        style={authStyles.textButton}
      >
        <Text style={authStyles.textButtonText}>
          ¿Ya tienes cuenta? Ingresar
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  roleList: {
    gap: 8,
    marginBottom: 18,
  },
  roleOption: {
    alignItems: 'center',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  roleOptionSelected: {
    borderColor: '#FF7A16',
  },
  radio: {
    borderColor: '#777C75',
    borderRadius: 10,
    borderWidth: 1,
    height: 19,
    width: 19,
  },
  radioSelected: {
    backgroundColor: '#FFB52D',
    borderColor: '#FFB52D',
  },
  roleText: {
    flex: 1,
    gap: 3,
  },
  roleTitle: {
    color: '#F7F3EB',
    fontSize: 14,
    fontWeight: '800',
  },
  roleDescription: {
    color: '#A7AAA3',
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.78,
  },
});
