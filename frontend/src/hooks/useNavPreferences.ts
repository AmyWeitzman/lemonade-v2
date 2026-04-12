/**
 * useNavPreferences — stores nav collapse/expand and filter preferences in browser cookies.
 * Requirements: Req 41
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=')[1]);
}

export interface NavPreferences {
  sidebarCollapsed: boolean;
  drawerOpen: boolean;
}

const PREF_COOKIE = 'lemonade_nav_prefs';

function loadPreferences(): NavPreferences {
  try {
    const raw = getCookie(PREF_COOKIE);
    if (raw) return JSON.parse(raw) as NavPreferences;
  } catch {
    // ignore malformed cookie
  }
  return { sidebarCollapsed: false, drawerOpen: false };
}

function savePreferences(prefs: NavPreferences): void {
  setCookie(PREF_COOKIE, JSON.stringify(prefs));
}

export function useNavPreferences() {
  const prefs = loadPreferences();

  const setSidebarCollapsed = (collapsed: boolean) => {
    savePreferences({ ...loadPreferences(), sidebarCollapsed: collapsed });
  };

  const setDrawerOpen = (open: boolean) => {
    savePreferences({ ...loadPreferences(), drawerOpen: open });
  };

  return {
    prefs,
    setSidebarCollapsed,
    setDrawerOpen,
  };
}
