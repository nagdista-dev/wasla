const OLD_TO_NEW: Record<string, string> = {
  'theme': 'wasla_theme',
  'language': 'wasla_language',
  'channels': 'wasla_channels',
  'playlists': 'wasla_playlists',
  'prevCategories': 'wasla_prev_categories',
};

const OLD_INSTALL_KEY = 'wasla_app_banner_dismissed';
const NEW_INSTALL_KEY = 'wasla_install_dismissed';

export function migrateStorage(): void {
  for (const [oldKey, newKey] of Object.entries(OLD_TO_NEW)) {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue !== null) {
      const newValue = localStorage.getItem(newKey);
      if (newValue === null) {
        localStorage.setItem(newKey, oldValue);
      }
      localStorage.removeItem(oldKey);
    }
  }

  const oldInstall = localStorage.getItem(OLD_INSTALL_KEY);
  if (oldInstall !== null) {
    const newInstall = localStorage.getItem(NEW_INSTALL_KEY);
    if (newInstall === null) {
      localStorage.setItem(NEW_INSTALL_KEY, oldInstall);
    }
    localStorage.removeItem(OLD_INSTALL_KEY);
  }
}
