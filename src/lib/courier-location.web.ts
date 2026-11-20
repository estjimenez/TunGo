export async function startCourierBackgroundTracking(): Promise<void> {
  throw new Error(
    'La ubicación se comparte mientras el panel está abierto en la web. El seguimiento en segundo plano requiere la app Android/iOS.',
  );
}

export async function resumeCourierBackgroundTracking(): Promise<boolean> {
  return false;
}

export async function stopCourierBackgroundTracking(): Promise<void> {}
