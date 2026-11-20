import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeader } from './BrandHeader';

type AuthShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) {
  return (
    <ScrollView
      contentContainerStyle={authStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <BrandHeader />
      <View style={authStyles.heading}>
        <Text style={authStyles.eyebrow}>{eyebrow}</Text>
        <Text style={authStyles.title}>{title}</Text>
        <Text style={authStyles.description}>{description}</Text>
      </View>
      {children}
    </ScrollView>
  );
}

export const authStyles = StyleSheet.create({
  content: {
    backgroundColor: '#090A09',
    flexGrow: 1,
    padding: 20,
    paddingBottom: 36,
  },
  heading: {
    marginBottom: 22,
    marginTop: 22,
  },
  eyebrow: {
    color: '#FF7A16',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  title: {
    color: '#F7F3EB',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 38,
  },
  description: {
    color: '#A7AAA3',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  field: {
    color: '#F7F3EB',
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderRadius: 2,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 13,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  fieldLabel: {
    color: '#F7F3EB',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  fieldGroup: {
    marginBottom: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFB52D',
    borderRadius: 2,
    justifyContent: 'center',
    marginTop: 7,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#090A09',
    fontSize: 14,
    fontWeight: '900',
  },
  textButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textButtonText: {
    color: '#FFB52D',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  error: {
    backgroundColor: '#261512',
    borderColor: '#7D3A24',
    borderWidth: 1,
    color: '#FFB59A',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    padding: 12,
  },
  notice: {
    backgroundColor: '#141614',
    borderColor: '#30332F',
    borderWidth: 1,
    color: '#A7AAA3',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
    padding: 13,
  },
});
