const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const qrcode = require('qrcode-terminal');

const appRoot = path.resolve(__dirname, '..');
const xamppRoot = 'C:\\xampp';
const apacheRoot = path.join(xamppRoot, 'apache');
const apache = path.join(apacheRoot, 'bin', 'httpd.exe');
const apacheConfig = path.join(apacheRoot, 'conf', 'httpd.conf');
const expoCli = path.join(appRoot, 'node_modules', 'expo', 'bin', 'cli');
const expoPort = 8081;

if (!fs.existsSync(path.join(xamppRoot, 'htdocs', 'tungo', 'public', 'index.php'))) {
  console.error('No se encontró el backend TunGo en C:\\xampp\\htdocs\\tungo\\public.');
  process.exit(1);
}

if (!fs.existsSync(apache) || !fs.existsSync(apacheConfig)) {
  console.error(`No se encontró Apache en ${apacheRoot}.`);
  process.exit(1);
}

if (!fs.existsSync(expoCli)) {
  console.error('No se encontró Expo CLI. Ejecuta npm install en la carpeta de la app.');
  process.exit(1);
}

const children = [];
let stopping = false;

function stopAll(exitCode) {
  if (stopping) {
    return;
  }

  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill();
    }
  }
}

function startService(label, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);

  child.on('error', (error) => {
    console.error(`No se pudo iniciar ${label}: ${error.message}`);
    stopAll(1);
  });

  child.on('exit', (code, signal) => {
    if (!stopping) {
      if (signal) {
        console.error(`${label} se detuvo por la señal ${signal}.`);
      } else if (code !== 0) {
        console.error(`${label} terminó con código ${code}.`);
      }
      stopAll(code ?? 1);
    }
  });

  return child;
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

async function isApiReady() {
  try {
    const response = await fetch('http://127.0.0.1/api/establecimientos', {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApi() {
  for (let attempt = 0; attempt < 30 && !stopping; attempt += 1) {
    if (await isApiReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function getLanAddress() {
  const interfaces = Object.entries(os.networkInterfaces());
  const candidates = interfaces.flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter((address) =>
        !address.internal
        && (address.family === 'IPv4' || address.family === 4)
        && !address.address.startsWith('169.254.'),
      )
      .map((address) => ({ name, address: address.address })),
  );
  const selected = candidates.find(({ name }) => /wi-?fi/i.test(name))
    ?? candidates.find(({ address }) =>
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address),
    );

  if (!selected) {
    throw new Error('Conecta este computador a la misma red Wi-Fi del teléfono e inténtalo de nuevo.');
  }

  return selected.address;
}

function configureMobileApiUrl(address) {
  const envPath = path.join(appRoot, '.env');
  const currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const apiUrl = `EXPO_PUBLIC_API_URL=http://${address}/api`;
  const updatedEnv = /^EXPO_PUBLIC_API_URL=.*$/m.test(currentEnv)
    ? currentEnv.replace(/^EXPO_PUBLIC_API_URL=.*$/m, apiUrl)
    : `${currentEnv.trimEnd()}${currentEnv ? '\n' : ''}${apiUrl}\n`;

  fs.writeFileSync(envPath, updatedEnv);
  console.log(`API para el teléfono: http://${address}/api`);
}

function printQr(label, url) {
  console.log(`\n${label}\n${url}`);
  qrcode.generate(url, { small: true });
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort() {
  for (let port = expoPort; port < expoPort + 10; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  return null;
}

async function start() {
  console.log('Iniciando Apache y Expo. Presiona Ctrl+C para detenerlos.');

  if (!(await isApiReady())) {
    startService(
      'Apache',
      apache,
      ['-f', apacheConfig, '-DFOREGROUND'],
      apacheRoot,
    );

    if (!(await waitForApi())) {
      console.error(
        'La API de TunGo no respondió en http://127.0.0.1/api. Revisa Apache y MySQL en XAMPP.',
      );
      stopAll(1);
      return;
    }
  }

  let lanAddress;
  try {
    lanAddress = getLanAddress();
    configureMobileApiUrl(lanAddress);
  } catch (error) {
    console.error(error.message);
    stopAll(1);
    return;
  }

  const availableExpoPort = await findAvailablePort();
  if (availableExpoPort === null) {
    console.error(
      `No hay puertos libres entre ${expoPort} y ${expoPort + 9}. Cierra otra instancia Expo y vuelve a ejecutar npm run dev:full.`,
    );
    stopAll(1);
    return;
  }

  if (availableExpoPort !== expoPort) {
    console.log(`El puerto ${expoPort} está ocupado; Expo usará el puerto ${availableExpoPort}.`);
  }

  console.log('API TunGo disponible en http://localhost/api.');
  console.log('Iniciando Expo Go y la vista web en la red local.');
  printQr(
    'QR para abrir TunGo en Expo Go (iPhone/Android):',
    `exp://${lanAddress}:${availableExpoPort}`,
  );
  printQr(
    'QR para abrir TunGo en el navegador:',
    `http://${lanAddress}:${availableExpoPort}`,
  );
  startService(
    'Expo',
    process.execPath,
    [expoCli, 'start', '--go', '--web', '--lan', '--port', String(availableExpoPort), '--clear'],
    appRoot,
  );
  console.log(`Ambos QR requieren que el teléfono esté en la misma Wi-Fi que XAMPP (${lanAddress}).`);
}

start().catch((error) => {
  console.error(`No se pudo iniciar TunGo: ${error.message}`);
  stopAll(1);
});
