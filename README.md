# TunGo móvil

Aplicación móvil de TunGo construida con Expo y React Native. La app consulta
el catálogo público de establecimientos y productos del backend Laravel; no se
conecta directamente a MySQL.

## Requisitos

- Node.js y npm
- XAMPP con MySQL iniciado y la base de datos `tungo` configurada
- El backend Laravel disponible en `C:\xampp\htdocs\tungo`
- Expo account para crear builds de desarrollo, Apple Developer y un iPhone
  registrado para instalar una build interna
- Un teléfono en la misma red Wi-Fi que el computador

## Configuración

1. Instala las dependencias desde esta carpeta:

   ```sh
   npm install
   ```

2. Inicia **MySQL** desde el panel de XAMPP. Laravel debe tener sus dependencias
   instaladas y su `.env` configurado para conectarse a la base de datos
   `tungo`. La primera vez, prepara la base desde `C:\xampp\htdocs\tungo`:

   ```sh
   composer install
   php artisan migrate
   php artisan storage:link
   ```

3. Desde esta carpeta, inicia **la API y Expo en la misma terminal**:

   ```sh
   npm run dev:full
   ```

`npm run dev:full` inicia Apache con la API de Laravel y Expo Go con web en la
red local.
Apache usa el puerto `80` y MySQL debe estar iniciado desde el panel de XAMPP.
Presiona `Ctrl+C` para detener los procesos iniciados por el comando.
El comando detecta la IP Wi-Fi actual, la configura para la API y busca un
puerto Expo libre entre `8081` y `8090`. Imprime dos QR distintos: uno `exp://`
para abrir la app en **Expo Go** y otro `http://` para abrirla en Safari o en
otro navegador. Instala Expo Go en el teléfono y escanea el QR correspondiente.
El teléfono y el computador deben estar en la misma Wi-Fi; XAMPP es local y no
se publica por Internet. En iPhone, Expo Go puede pedir que la cuenta iniciada
en Expo Go coincida con la de la CLI.

El QR `exp+tungo://` corresponde a **TunGo Development**, no a Expo Go ni a un
navegador. Para usar esa build personalizada, créala e instálala siguiendo los
pasos de abajo; sirve para probar capacidades nativas que Expo Go no incluye,
como ubicación en segundo plano.

## Instalar TunGo Development en iPhone

1. Inicia sesión en tu cuenta Expo y enlaza el proyecto una vez:

   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

2. Registra el iPhone para una distribución interna y sigue las instrucciones
   de EAS para instalar el perfil de aprovisionamiento y activar Developer Mode:

   ```sh
   npx eas-cli@latest device:create
   ```

3. Genera la build de desarrollo iOS:

   ```sh
   npm run build:development:ios
   ```

4. Abre en el iPhone el enlace de instalación que proporciona EAS y termina la
   instalación. Verifica que **TunGo Development** aparezca en la pantalla de
   inicio. Inicia MySQL y el servidor con
   `npx expo start --dev-client --lan`; escanea el QR con el cliente de
   desarrollo. El backend seguirá siendo local y el teléfono debe estar en la
   misma Wi-Fi que el computador.

La build de desarrollo elimina la dependencia de Expo Go, pero no publica TunGo
para el público. Para usarla fuera de la red local habrá que desplegar Laravel y
MySQL en un servidor público y publicar una build de producción.

El `.env` de la app debe apuntar a la dirección de este computador (por ejemplo,
`http://192.168.1.10/api`). Para Android Emulator usa
`http://10.0.2.2/api`; en un teléfono físico usa la IP local del computador y
conecta ambos a la misma red Wi-Fi. Reinicia Expo después de cambiar `.env`.

## Flujos por rol

- Cada rol tiene una barra de navegación propia: el negocio separa resumen,
  catálogo y pedidos; el domiciliario tiene entregas, mapa, ganancias e
  historial; el cliente encuentra explorar, pedidos y carrito.
- En **Perfil**, todas las cuentas pueden cambiar su nombre, teléfono y foto de
  portada. El correo y el rol no se editan desde esta pantalla.
- **Establecimiento:** publicar y editar productos, pausarlos, revisar pedidos
  y confirmarlos. En el resumen puede guardar su ubicación actual para permitir
  la asignación automática por cercanía. Puede cancelar pedidos sin pago y sin domiciliario asignado,
  seleccionando una razón: producto agotado, demora de preparación,
  establecimiento cerrado, problema de inventario/precio, problema operativo
  u otro motivo (con detalle obligatorio). El cliente ve el motivo y recibe un
  aviso. Los pedidos pagados deben reembolsarse antes de cancelarlos. El código
  de recogida de seis dígitos aparece en el pedido para validarlo cuando llegue
  el domiciliario.
- **Domiciliario:** elegir aceptación manual o automática, aceptar o rechazar
  pedidos (un rechazo solo los oculta para esa cuenta), consultar ganancias e
  historial, actualizar cada estado y validar el código de recogida. El modo
  automático asigna al domiciliario libre más cercano con ubicación actualizada
  en los últimos dos minutos; si falta ubicación del local o del domiciliario,
  el pedido queda disponible para aceptación manual. En modo automático la app
  actualiza la ubicación mientras el modo está activo; las entregas también
  comparten ubicación mientras están en curso. La pestaña **Mapa** permite
  abrir la ruta al establecimiento o al cliente en la aplicación de mapas.
- **Cliente:** consultar el historial y estado de cada pedido, abrir el mapa del
  domiciliario cuando quiera y recibir avisos de cambios.
- Los paneles se actualizan automáticamente cada 10 segundos. En la web la
  actualización funciona mientras la pantalla está abierta; las notificaciones
  push llegan a Android/iOS aunque la app esté en segundo plano.
- El mapa usa OpenStreetMap con atribución visible, sin clave de Google Maps.
- La ubicación en segundo plano requiere una build de desarrollo Android/iOS;
  Expo Go solo permite probar los flujos compatibles mientras la app está
  abierta.

## Notificaciones push y build móvil

1. Vincula el proyecto con tu cuenta Expo:

   ```sh
   npx eas-cli@latest init
   ```

   Configura credenciales push de FCM (Android) y/o APNs (iOS) en EAS. Copia el
   `projectId` que EAS agrega a `app.json` o define
   `EXPO_PUBLIC_EAS_PROJECT_ID=<projectId>` en `.env`.
2. Ejecuta `php artisan migrate` en Laravel para crear la tabla de tokens push.
3. Crea una build de desarrollo; las notificaciones remotas, el sonido original
   de pedidos y la ubicación en segundo plano no funcionan en Expo Go:

   ```sh
   npx eas-cli@latest build --profile development --platform android
   ```

   Repite con `--platform ios` si vas a probar en iPhone. Configura los perfiles
   de desarrollo y credenciales de la app en EAS antes de compilar.

Las alertas de pedidos incluyen acciones para aceptar o rechazar desde la
notificación en Android/iOS. El sonido personalizado respeta los ajustes de
volumen, silencio y No molestar del dispositivo. Después de cambiar el sonido
o su configuración en `app.json`, instala una build nueva. En Android, si el
usuario cambió manualmente el sonido del canal de pedidos en los ajustes,
deberá restaurar el sonido de TunGo allí.
