import { Platform } from 'react-native';

export function blurActiveElementOnWeb(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const active = document.activeElement as HTMLElement | null;
  active?.blur?.();
}
