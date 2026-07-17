import { useEffect } from 'react';
import { usePwaSettings } from '@/hooks/usePwaSettings';

/**
 * Sincroniza tags do <head> que iOS lê (ignora manifest.json) com pwa_settings.
 * - apple-touch-icon (180x180 e 192x192)
 * - apple-mobile-web-app-title
 * - theme-color
 * - <title>
 */
export function PwaHeadSync() {
  const { data } = usePwaSettings();

  useEffect(() => {
    if (!data) return;

    // Pick best PNG icon (prefer 192 from icons[], fallback to icon_url)
    const png192 =
      data.icons?.find((i) => i.sizes === '192x192' && i.type === 'image/png')?.src ||
      data.icon_url ||
      '/nexa-logo.svg';
    const png512 =
      data.icons?.find((i) => i.sizes === '512x512' && i.purpose === 'any' && i.type === 'image/png')
        ?.src || png192;

    setOrCreateLink('apple-touch-icon', png192, '180x180');
    setOrCreateLink('apple-touch-icon', png512, '192x192');

    setOrCreateMeta('apple-mobile-web-app-title', data.short_name || 'Neovale');
    setOrCreateMeta('apple-mobile-web-app-capable', 'yes');
    setOrCreateMeta('mobile-web-app-capable', 'yes');
    setOrCreateMeta('theme-color', data.theme_color || '#1B1E2C');

    if (data.name) document.title = data.name;
  }, [data]);

  return null;
}

function setOrCreateMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setOrCreateLink(rel: string, href: string, sizes?: string) {
  const sel = sizes
    ? `link[rel="${rel}"][sizes="${sizes}"]`
    : `link[rel="${rel}"]:not([sizes])`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (sizes) el.setAttribute('sizes', sizes);
    document.head.appendChild(el);
  }
  el.href = href;
}
