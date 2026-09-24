/**
 * API Service for connecting KAGUM App to cPanel MySQL Backend (api.php)
 */

export interface SyncResponse {
  status: 'success' | 'error' | 'not_found';
  code?: string;
  connected?: boolean;
  is_preview?: boolean;
  php_version?: string | null;
  server_software?: string;
  driver?: string;
  message?: string;
  detail?: string;
  hint?: string;
  db_name?: string;
  db_user?: string;
  db_host?: string;
  tested_host?: string;
  tested_database?: string;
  tested_user?: string;
  table_ready?: boolean;
  total_keys_stored?: number;
  data?: any;
}

export const getCustomCpanelUrl = (): string => {
  return (typeof window !== 'undefined' ? localStorage.getItem('kagum_cpanel_url') : '') || '';
};

export const setCustomCpanelUrl = (url: string): void => {
  if (typeof window === 'undefined') return;
  if (url && url.trim()) {
    localStorage.setItem('kagum_cpanel_url', url.trim());
  } else {
    localStorage.removeItem('kagum_cpanel_url');
  }
};

export const isPreviewEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('run.app') || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('webcontainer');
};

export const getApiBaseUrl = (overrideUrl?: string): string => {
  const target = overrideUrl !== undefined ? overrideUrl : getCustomCpanelUrl();
  if (target && target.trim()) {
    let clean = target.trim().replace(/\/+$/, '');
    if (clean.endsWith('/api.php')) return clean;
    return `${clean}/api.php`;
  }
  return 'api.php';
};

export const ApiService = {
  getCustomCpanelUrl,
  setCustomCpanelUrl,
  isPreviewEnvironment,
  getApiBaseUrl,

  /**
   * Test connection to MySQL database via api.php with detailed report
   */
  async testConnection(customUrl?: string, customCredentials?: { host?: string; db?: string; user?: string; pass?: string }): Promise<SyncResponse> {
    try {
      const baseUrl = getApiBaseUrl(customUrl);
      const url = new URL(baseUrl, window.location.href);
      url.searchParams.set('action', 'test');
      url.searchParams.set('_t', Date.now().toString());

      if (customCredentials) {
        if (customCredentials.host) url.searchParams.set('test_host', customCredentials.host);
        if (customCredentials.db) url.searchParams.set('test_db', customCredentials.db);
        if (customCredentials.user) url.searchParams.set('test_user', customCredentials.user);
        if (customCredentials.pass !== undefined) url.searchParams.set('test_pass', customCredentials.pass);
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      const rawText = await res.text();

      // Jika server mengembalikan kodingan PHP mentah <?php ... bukannya JSON
      if (rawText.trim().startsWith('<?php') || rawText.includes('<?php')) {
        const isPreview = isPreviewEnvironment() && !customUrl;
        if (isPreview) {
          return {
            status: 'error',
            code: 'PREVIEW_ENVIRONMENT',
            is_preview: true,
            message: 'Anda saat ini membuka aplikasi di Link PREVIEW AI STUDIO (bukan di cPanel Anda)!',
            detail: 'Server preview di AI Studio menggunakan Node.js/Cloud Run sehingga kode PHP tidak diproses oleh PHP engine hosting Anda. Pengubahan versi PHP di cPanel Anda hanya berpengaruh pada domain cPanel Anda.',
            hint: 'Untuk menghubungkan database cPanel, masukkan alamat URL domain website cPanel Anda pada kolom "URL Server cPanel" di bawah ini, atau buka aplikasi langsung melalui domain cPanel Anda setelah mengupload ZIP.'
          };
        }

        return {
          status: 'error',
          code: 'PHP_HANDLER_OFF',
          message: 'Server cPanel menampilkan file api.php sebagai teks biasa (PHP Handler belum aktif)!',
          detail: `Server mengembalikan kode PHP mentah: "${rawText.trim().slice(0, 60)}..."`,
          hint: 'Di cPanel: Masuk ke menu "MultiPHP Manager" -> pilih domain Anda -> ubah versi PHP ke PHP 8.1 atau 8.2 (ea-php81/ea-php82).'
        };
      }

      try {
        const json: SyncResponse = JSON.parse(rawText);
        return json;
      } catch {
        return {
          status: 'error',
          code: 'INVALID_JSON_RESPONSE',
          message: 'Server mengembalikan format respons bukan JSON.',
          detail: `Respons Server: "${rawText.slice(0, 120)}..."`,
          hint: 'Pastikan file api.php tidak mengandung output error HTML atau karakter spasi sebelum tag <?php.'
        };
      }
    } catch (err: any) {
      return {
        status: 'error',
        code: 'NETWORK_ERROR',
        message: 'File api.php tidak dapat diakses atau terjadi kesalahan jaringan/CORS.',
        detail: err?.message || 'Gagal menghubungi server'
      };
    }
  },

  /**
   * Load all app data from MySQL
   */
  async fetchAllData(): Promise<Record<string, any> | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}?action=get_all&_t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return null;
      const rawText = await res.text();
      if (rawText.trim().startsWith('<?php')) return null;
      const json: SyncResponse = JSON.parse(rawText);
      if (json.status === 'success' && json.data) {
        return json.data;
      }
      return null;
    } catch (err) {
      console.warn('MySQL Fetch Failed, fallback to local state:', err);
      return null;
    }
  },

  /**
   * Push all current local state keys to MySQL
   */
  async pushLocalDataToMysql(allData: Record<string, any>): Promise<SyncResponse> {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}?action=save_all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(allData)
      });
      const rawText = await res.text();
      const json: SyncResponse = JSON.parse(rawText);
      return json;
    } catch (err: any) {
      return {
        status: 'error',
        message: 'Gagal mengirim data ke server.',
        detail: err?.message
      };
    }
  },

  /**
   * Save a single data key to MySQL
   */
  async saveKey(key: string, value: any): Promise<boolean> {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}?action=save_key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) return false;
      const json: SyncResponse = await res.json();
      return json.status === 'success';
    } catch (err) {
      console.warn(`MySQL Save Key [${key}] Failed:`, err);
      return false;
    }
  }
};
