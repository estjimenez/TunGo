import { Platform } from 'react-native';

export type Establishment = {
  id: number;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  imagen: string | null;
  productos_count?: number;
};

export type Product = {
  id: number;
  establecimiento_id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  disponible: boolean;
};

export type Order = {
  id: number;
  direccion_entrega: string;
  estado: string;
  motivo_cancelacion: BusinessCancellationReason | null;
  detalle_cancelacion: string | null;
  total: number;
  tarifa_domicilio: number;
  ganancia_domiciliario: number;
  zona_entrega: string | null;
  pagado: boolean;
  confirmado_por_cliente: boolean;
  metodo_pago: string | null;
  codigo_recogida: string | null;
  created_at: string | null;
  establecimiento: Pick<Establishment, 'id' | 'nombre' | 'direccion'> | null;
  domiciliario: {
    id: number;
    name: string;
    telefono: string | null;
  } | null;
  cliente: {
    id: number;
    name: string;
    telefono: string | null;
    email: string;
  } | null;
  detalles: {
    id: number;
    producto_id: number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
  }[];
  ubicacion: {
    latitud: number;
    longitud: number;
    actualizada_en: string | null;
  } | null;
};

export const BUSINESS_CANCELLATION_REASONS = [
  { value: 'producto_agotado', label: 'El plato o producto se agotó' },
  { value: 'demora_preparacion', label: 'Demora en la preparación' },
  { value: 'establecimiento_cerrado', label: 'Establecimiento cerrado o sin servicio' },
  { value: 'problema_inventario', label: 'Problema con el inventario o el precio' },
  { value: 'problema_operativo', label: 'No es posible preparar este pedido' },
  { value: 'otro', label: 'Otro motivo' },
] as const;

export type BusinessCancellationReason =
  (typeof BUSINESS_CANCELLATION_REASONS)[number]['value'];

export function formatOrderCancellationReason(
  reason: BusinessCancellationReason,
  detail: string | null,
) {
  const label = BUSINESS_CANCELLATION_REASONS.find(
    (option) => option.value === reason,
  )?.label ?? reason.replaceAll('_', ' ');

  return reason === 'otro' && detail
    ? `${label}: ${detail}`
    : detail
      ? `${label}. ${detail}`
      : label;
}

export type BusinessDashboard = {
  establecimiento: Pick<Establishment, 'id' | 'nombre' | 'direccion' | 'descripcion'> & {
    latitud: number | null;
    longitud: number | null;
  };
  productos: Product[];
  pedidos: Order[];
};

export type CourierDashboard = {
  pedidos: Order[];
  aceptacion_automatica: boolean;
  disponibles: {
    id: number;
    estado: string;
    direccion_entrega: string;
    total: number;
    tarifa_domicilio: number;
    ganancia_domiciliario: number;
    establecimiento: Pick<Establishment, 'id' | 'nombre' | 'direccion'> | null;
  }[];
  ganancias: number;
  total_tarifa: number;
};

export type OrderMessage = {
  id: number;
  message: string;
  created_at: string;
  sender: {
    id: number;
    name: string;
    rol: AccountRole;
  };
};

export type EstablishmentMenu = Establishment & {
  productos: Product[];
};

export type AccountRole = 'cliente' | 'domiciliario' | 'establecimiento';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  rol: AccountRole;
  role_label: string;
  telefono: string | null;
  foto_portada: string | null;
  verified: boolean;
  establecimiento: {
    id: number;
    nombre: string;
    direccion: string | null;
  } | null;
};

export type AuthSessionResponse = {
  token: string;
  user: AuthUser;
};

export type PushPlatform = 'android' | 'ios';

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  rol: AccountRole;
  telefono?: string;
  nombre_establecimiento?: string;
  direccion_establecimiento?: string;
};

type AuthSessionEnvelope = AuthSessionResponse & {
  verification_email_sent?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authenticationFailureHandler: (() => void) | null = null;

export function setAuthenticationFailureHandler(
  handler: (() => void) | null,
) {
  authenticationFailureHandler = handler;
}

function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

  if (!configuredUrl) {
    throw new Error(
      'Configura EXPO_PUBLIC_API_URL en el archivo .env para conectar con TunGo.',
    );
  }

  if (!/^https?:\/\//i.test(configuredUrl)) {
    throw new Error('EXPO_PUBLIC_API_URL debe comenzar con http:// o https://.');
  }

  if (configuredUrl.includes('127.0.0.1') || configuredUrl.includes('localhost')) {
    return Platform.OS === 'android'
      ? configuredUrl.replace(/127\.0\.0\.1|localhost/i, '10.0.2.2')
      : configuredUrl;
  }

  return configuredUrl;
}

async function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: object | FormData;
    token?: string;
  } = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  let response: Response;
  const isFormData = options.body instanceof FormData;
  const requestBody: BodyInit | undefined = options.body
    ? isFormData
      ? options.body as FormData
      : JSON.stringify(options.body)
    : undefined;

  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body && !isFormData
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options.token
          ? { Authorization: `Bearer ${options.token}` }
          : {}),
      },
      ...(requestBody ? { body: requestBody } : {}),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No pudimos conectar con TunGo en ${url}. Verifica que el teléfono y el computador estén en la misma red Wi-Fi. ${detail}`,
    );
  }

  const body = (await response.json()) as {
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
    verification_email_sent?: boolean;
  };

  if (!response.ok) {
    const firstValidationError = Object.values(body.errors ?? {})[0]?.[0];
    if (response.status === 401 && options.token) {
      authenticationFailureHandler?.();
    }
    throw new ApiError(
      firstValidationError ?? body.message ?? `Error del servidor (${response.status}).`,
      response.status,
    );
  }

  if (body.data === undefined) {
    throw new Error('El servidor de TunGo devolvió una respuesta incompleta.');
  }

  return body.data;
}

export function getEstablishments() {
  return get<Establishment[]>('/establecimientos');
}

export function getEstablishmentMenu(id: string) {
  return get<EstablishmentMenu>(`/establecimientos/${encodeURIComponent(id)}`);
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'No fue posible cargar la información. Intenta de nuevo.';
}

export function getImageUrl(path: string | null) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiRoot = getApiBaseUrl().replace(/\/api\/?$/, '');
  return `${apiRoot}/${path.replace(/^\/+/, '')}`;
}

export async function login(email: string, password: string) {
  return request<AuthSessionEnvelope>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function register(data: RegisterData) {
  const result = await request<AuthSessionEnvelope>(
    '/auth/register',
    { method: 'POST', body: data },
  );

  return {
    session: { token: result.token, user: result.user },
    verificationEmailSent: result.verification_email_sent ?? false,
  };
}

export function getCurrentUser(token: string) {
  return request<AuthUser>('/auth/me', { token });
}

export type ProfileImageUpload = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export async function updateProfile(
  token: string,
  profile: { name: string; telefono: string },
  image?: ProfileImageUpload,
) {
  if (!image) {
    return request<AuthUser>('/auth/profile', {
      method: 'POST',
      token,
      body: profile,
    });
  }

  const body = new FormData();
  body.append('name', profile.name);
  body.append('telefono', profile.telefono);

  if (Platform.OS === 'web') {
    const imageResponse = await fetch(image.uri);
    if (!imageResponse.ok) {
      throw new Error('No pudimos leer la imagen seleccionada.');
    }
    body.append('foto_portada', await imageResponse.blob(), image.fileName);
  } else {
    const nativeFormData = body as FormData & {
      append(
        name: string,
        value: { uri: string; name: string; type: string },
      ): void;
    };
    nativeFormData.append('foto_portada', {
      uri: image.uri,
      name: image.fileName,
      type: image.mimeType,
    });
  }

  return request<AuthUser>('/auth/profile', {
    method: 'POST',
    token,
    body,
  });
}

export function verifyEmail(email: string, code: string) {
  return request<AuthSessionResponse>('/auth/verify-email', {
    method: 'POST',
    body: { email, code },
  });
}

export function resendVerificationCode(email: string) {
  return request<{ email_sent: boolean }>('/auth/resend-verification', {
    method: 'POST',
    body: { email },
  });
}

export function logout(token: string) {
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
    token,
  });
}

export function getMyOrders(token: string) {
  return request<Order[]>('/orders', { token });
}

export function createOrder(
  token: string,
  data: {
    direccion_entrega: string;
    items: { product_id: number; quantity: number }[];
  },
) {
  return request<Order>('/orders', { method: 'POST', body: data, token });
}

export function getOrder(token: string, id: number) {
  return request<Order>(`/orders/${id}`, { token });
}

export function getOrderLocation(token: string, id: number) {
  return request<{
    latitud: number | null;
    longitud: number | null;
    actualizada_en: string | null;
    estado: string;
    domiciliario: string | null;
  }>(`/orders/${id}/location`, { token });
}

export function registerPushToken(
  token: string,
  pushToken: string,
  platform: PushPlatform,
) {
  return request<{ registered: boolean }>('/notifications/push-token', {
    method: 'POST',
    body: { token: pushToken, platform },
    token,
  });
}

export function unregisterPushToken(token: string, pushToken: string) {
  return request<{ registered: boolean }>('/notifications/push-token', {
    method: 'DELETE',
    body: { token: pushToken },
    token,
  });
}

export function confirmOrderDelivery(
  token: string,
  id: number,
  metodo_pago: 'efectivo' | 'transferencia',
) {
  return request<Order>(`/orders/${id}/confirm-delivery`, {
    method: 'POST',
    body: { metodo_pago, pagado: true },
    token,
  });
}

export function getOrderPaymentUrl(token: string, id: number) {
  return request<{ checkout_url: string }>(`/orders/${id}/payment`, {
    method: 'POST',
    body: {},
    token,
  });
}

export function getOrderChat(token: string, id: number) {
  return request<OrderMessage[]>(`/orders/${id}/chat`, { token });
}

export function sendOrderMessage(token: string, id: number, message: string) {
  return request<OrderMessage>(`/orders/${id}/chat`, {
    method: 'POST',
    body: { message },
    token,
  });
}

export function getBusinessDashboard(token: string) {
  return request<BusinessDashboard>('/business/dashboard', { token });
}

export function updateBusinessLocation(
  token: string,
  location: { latitud: number; longitud: number },
) {
  return request<{ latitud: number; longitud: number }>('/business/location', {
    method: 'PATCH',
    body: location,
    token,
  });
}

export function createBusinessProduct(
  token: string,
  data: { nombre: string; descripcion: string; precio: number },
) {
  return request<Product>('/business/products', {
    method: 'POST',
    body: data,
    token,
  });
}

export function updateBusinessProduct(
  token: string,
  id: number,
  data: Partial<Pick<Product, 'nombre' | 'descripcion' | 'precio' | 'disponible'>>,
) {
  return request<Product>(`/business/products/${id}`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

export function updateBusinessOrder(
  token: string,
  id: number,
  estado: 'recibido' | 'confirmado',
) {
  return request<Order>(`/business/orders/${id}/status`, {
    method: 'PATCH',
    body: { estado },
    token,
  });
}

export function cancelBusinessOrder(
  token: string,
  id: number,
  data: {
    motivo_cancelacion: BusinessCancellationReason;
    detalle_cancelacion?: string;
  },
) {
  return request<Order>(`/business/orders/${id}/cancel`, {
    method: 'POST',
    body: data,
    token,
  });
}

export function getCourierDashboard(token: string) {
  return request<CourierDashboard>('/courier/dashboard', { token });
}

export function takeCourierOrder(token: string, id: number) {
  return request<Order>(`/courier/orders/${id}/take`, {
    method: 'POST',
    body: {},
    token,
  });
}

export function rejectCourierOrder(token: string, id: number) {
  return request<{ ok: boolean }>(`/courier/orders/${id}/reject`, {
    method: 'POST',
    body: {},
    token,
  });
}

export function updateCourierAcceptancePreference(
  token: string,
  automatic: boolean,
) {
  return request<{ aceptacion_automatica: boolean }>('/courier/preferences', {
    method: 'PATCH',
    body: { aceptacion_automatica: automatic },
    token,
  });
}

export function updateCourierOrderStatus(
  token: string,
  id: number,
  estado: 'llego_tienda' | 'recogido' | 'en_camino' | 'entregado',
  codigo_recogida?: string,
) {
  return request<Order>(`/courier/orders/${id}/status`, {
    method: 'PATCH',
    body: { estado, ...(codigo_recogida ? { codigo_recogida } : {}) },
    token,
  });
}

export function updateCourierLocation(
  token: string,
  location: { latitud: number; longitud: number },
  orderId?: number,
) {
  return request<{ ok: boolean }>(
    orderId ? `/courier/orders/${orderId}/location` : '/courier/location',
    { method: 'POST', body: location, token },
  );
}
