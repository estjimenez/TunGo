import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getErrorMessage, getImageUrl, ProfileImageUpload } from '../lib/api';
import { useAuth } from '../lib/auth';

export function ProfileEditor() {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.telefono ?? '');
  const [selectedImage, setSelectedImage] = useState<ProfileImageUpload | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const chooseCover = async () => {
    setError(null);
    setSaved(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('Elige una imagen JPG, PNG o WEBP.');
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('La imagen debe pesar menos de 5 MB.');
      }

      setSelectedImage({
        uri: asset.uri,
        fileName: asset.fileName ?? `portada.${mimeType.split('/')[1]}`,
        mimeType,
      });
    } catch (pickerError) {
      setError(getErrorMessage(pickerError));
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Escribe tu nombre para guardar los cambios.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateUserProfile(
        { name: name.trim(), telefono: phone.trim() },
        selectedImage ?? undefined,
      );
      setSelectedImage(null);
      setSaved(true);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const coverUrl = selectedImage?.uri ?? getImageUrl(user?.foto_portada ?? null);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Dale tu toque a TunGo</Text>
      <Text style={styles.description}>
        Mantén tus datos al día y personaliza tu perfil con una portada.
      </Text>
      <View style={styles.cover}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} resizeMode="cover" style={styles.coverImage} />
        ) : (
          <View style={styles.coverEmpty}>
            <Text style={styles.coverEmoji}>✨</Text>
            <Text style={styles.coverEmptyText}>Tu portada aparece aquí</Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => void chooseCover()}
          style={styles.coverButton}
        >
          <Text style={styles.coverButtonText}>
            {selectedImage ? 'Cambiar portada' : 'Elegir foto de portada'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        accessibilityLabel="Nombre del perfil"
        autoCapitalize="words"
        maxLength={120}
        onChangeText={setName}
        placeholder="Tu nombre"
        placeholderTextColor="#777C75"
        style={styles.input}
        value={name}
      />
      <Text style={styles.label}>Teléfono</Text>
      <TextInput
        accessibilityLabel="Teléfono del perfil"
        keyboardType="phone-pad"
        maxLength={30}
        onChangeText={setPhone}
        placeholder="Tu número de contacto"
        placeholderTextColor="#777C75"
        style={styles.input}
        value={phone}
      />
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {saved && <Text accessibilityLiveRegion="polite" style={styles.success}>¡Perfil actualizado!</Text>}
      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={() => void save()}
        style={[styles.saveButton, saving && styles.disabled]}
      >
        {saving ? (
          <ActivityIndicator color="#090A09" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  heading: { color: '#F7F3EB', fontSize: 20, fontWeight: '900' },
  description: { color: '#A7AAA3', fontSize: 13, lineHeight: 19, marginTop: 5 },
  cover: {
    backgroundColor: '#23251F',
    borderRadius: 14,
    height: 155,
    marginTop: 16,
    overflow: 'hidden',
  },
  coverImage: { height: '100%', position: 'absolute', width: '100%' },
  coverEmpty: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  coverEmoji: { fontSize: 32 },
  coverEmptyText: { color: '#D3CFC3', fontSize: 12, fontWeight: '700', marginTop: 5 },
  coverButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#090A09E6',
    borderRadius: 18,
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 10,
  },
  coverButtonText: { color: '#FFB52D', fontSize: 11, fontWeight: '900' },
  label: { color: '#F7F3EB', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#090A09',
    borderColor: '#30332F',
    borderRadius: 11,
    borderWidth: 1,
    color: '#F7F3EB',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  error: {
    backgroundColor: '#261512',
    borderColor: '#7D3A24',
    borderWidth: 1,
    color: '#FFB59A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    padding: 12,
  },
  success: { color: '#B9E5A5', fontSize: 13, fontWeight: '800', marginTop: 12 },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#FFB52D',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 49,
  },
  saveButtonText: { color: '#090A09', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
});
