import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ApiError,
  AuthSessionResponse,
  AuthUser,
  getCurrentUser,
  getErrorMessage,
  login,
  logout,
  RegisterData,
  register,
  resendVerificationCode,
  setAuthenticationFailureHandler,
  verifyEmail,
  updateProfile,
  ProfileImageUpload,
} from './api';
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from './auth-storage';
import { useCart } from './cart';
import { disablePushNotifications } from './push-notifications';
import { stopCourierBackgroundTracking } from './courier-location';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  sessionError: string | null;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (data: RegisterData) => Promise<boolean>;
  verify: (code: string) => Promise<AuthUser>;
  resendCode: () => Promise<void>;
  signOut: () => Promise<void>;
  retrySession: () => Promise<void>;
  updateUserProfile: (
    profile: { name: string; telefono: string },
    image?: ProfileImageUpload,
  ) => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function restoreStoredSession() {
  let savedSession: AuthSessionResponse | null;

  try {
    savedSession = await readAuthSession();
  } catch (error) {
    return { session: null, error: getErrorMessage(error) };
  }

  if (!savedSession) {
    return { session: null, error: null };
  }

  try {
    const currentUser = await getCurrentUser(savedSession.token);
    const session = { token: savedSession.token, user: currentUser };
    await writeAuthSession(session);
    return { session, error: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      try {
        await clearAuthSession();
        return {
          session: null,
          error: 'Tu sesión ya no es válida. Inicia sesión de nuevo para continuar.',
        };
      } catch (storageError) {
        return { session: savedSession, error: getErrorMessage(storageError) };
      }
    }

    return { session: savedSession, error: getErrorMessage(error) };
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { clearCart } = useCart();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const authenticationFailureHandled = useRef(false);

  const retrySession = useCallback(async () => {
    const restored = await restoreStoredSession();
    authenticationFailureHandled.current = false;
    if (!restored.session && user) {
      clearCart();
    }
    setUser(restored.session?.user ?? null);
    setToken(restored.session?.token ?? null);
    setSessionError(restored.error);
    setReady(true);
  }, [user, clearCart]);

  const handleAuthenticationFailure = useCallback(() => {
    if (authenticationFailureHandled.current) return;
    authenticationFailureHandled.current = true;

    const currentUser = user;
    setUser(null);
    setToken(null);
    setSessionError('Tu sesión ya no es válida. Inicia sesión de nuevo para continuar.');
    clearCart();

    void clearAuthSession().catch((error: unknown) => {
      setSessionError(
        `Tu sesión ya no es válida. Inicia sesión de nuevo. No se pudo limpiar la sesión guardada: ${getErrorMessage(error)}`,
      );
    });

    if (currentUser?.rol === 'domiciliario') {
      void stopCourierBackgroundTracking().catch((error: unknown) => {
        console.error('No se pudo detener el seguimiento tras vencer la sesión.', error);
      });
    }
  }, [user, clearCart]);

  useEffect(() => {
    setAuthenticationFailureHandler(handleAuthenticationFailure);
    return () => setAuthenticationFailureHandler(null);
  }, [handleAuthenticationFailure]);

  useEffect(() => {
    let active = true;

    void restoreStoredSession().then((restored) => {
      if (active) {
        setUser(restored.session?.user ?? null);
        setToken(restored.session?.token ?? null);
        setSessionError(restored.error);
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const saveSession = useCallback(async (session: AuthSessionResponse) => {
    authenticationFailureHandled.current = false;
    if (user && user.id !== session.user.id) {
      clearCart();
    }

    await writeAuthSession(session);
    setUser(session.user);
    setToken(session.token);
    setSessionError(null);
  }, [user, clearCart]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await login(email.trim(), password);
    await saveSession(session);
    return session.user;
  }, [saveSession]);

  const signUp = useCallback(async (data: RegisterData) => {
    const result = await register(data);
    await saveSession(result.session);
    return result.verificationEmailSent;
  }, [saveSession]);

  const verify = useCallback(async (code: string) => {
    if (!user) {
      throw new Error('Inicia sesión para verificar tu correo.');
    }

    const session = await verifyEmail(user.email, code);
    await saveSession(session);
    return session.user;
  }, [user, saveSession]);

  const resendCode = useCallback(async () => {
    if (!user) {
      throw new Error('Inicia sesión para solicitar otro código.');
    }

    await resendVerificationCode(user.email);
  }, [user]);

  const updateUserProfile = useCallback(async (
    profile: { name: string; telefono: string },
    image?: ProfileImageUpload,
  ) => {
    if (!token) {
      throw new Error('Inicia sesión para editar tu perfil.');
    }

    const updatedUser = await updateProfile(token, profile, image);
    await writeAuthSession({ token, user: updatedUser });
    setUser(updatedUser);
    return updatedUser;
  }, [token]);

  const signOut = useCallback(async () => {
    authenticationFailureHandled.current = false;
    const currentToken = token;
    let cleanupError: unknown;

    if (currentToken) {
      try {
        await disablePushNotifications(currentToken);
      } catch (error) {
        cleanupError = error;
      }
    }
    if (user?.rol === 'domiciliario') {
      try {
        await stopCourierBackgroundTracking();
      } catch (error) {
        cleanupError ??= error;
      }
    }

    await clearAuthSession();
    clearCart();
    setUser(null);
    setToken(null);
    setSessionError(null);

    if (currentToken) {
      try {
        await logout(currentToken);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          throw error;
        }
      }
    }
    if (cleanupError) {
      throw new Error(
        `La sesión se cerró, pero no se pudo completar la limpieza de notificaciones o ubicación: ${getErrorMessage(cleanupError)}`,
      );
    }
  }, [token, user, clearCart]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      sessionError,
      signIn,
      signUp,
      verify,
      resendCode,
      signOut,
      retrySession,
      updateUserProfile,
    }),
    [
      user,
      token,
      ready,
      sessionError,
      signIn,
      signUp,
      verify,
      resendCode,
      signOut,
      retrySession,
      updateUserProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }

  return context;
}
