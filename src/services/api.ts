/**
 * API Service for connecting KAGUM App to cPanel MySQL Backend (api.php)
 */

export interface SyncResponse {
  status: 'success' | 'error' | 'not_found';
  code?: string;
  connected?: boolean;
  message?: string;
  detail?: string;
  hint?: string;
  db_name?: string;
  data?: any;
}

const API_BASE_URL = 'api.php';

export const ApiService = {
  /**
   * Test connection to MySQL database via api.php with detailed report
   */
  async testConnection(): Promise<SyncResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=test`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      const rawText = await res.text();
      
      // Jika server mengembalikan kodingan PHP <?php ... bukannya JSON
      if (rawText.trim().startsWith('<?php') || rawText.includes('<?php')) {
        return {
          status: 'error',
          code: 'PHP_ENGINE_OFF',
          message: 'PHP Engine tidak aktif di server cPanel untuk domain/subdomain ini!',
          detail: `Server mengembalikan kode PHP mentah: "${rawText.trim().slice(0, 50)}..."`,
          hint: 'Di cPanel: Masuk ke menu "MultiPHP Manager" atau "Select PHP Version", pilih domain/subdomain ini lalu ubah versi PHP ke PHP 8.1 / 8.2 (aktifkan ea-php81 / ea-php82).'
        };
      }

      try {
        const json: SyncResponse = JSON.parse(rawText);
        return json;
      } catch (parseErr: any) {
        return {
          status: 'error',
          code: 'INVALID_JSON_RESPONSE',
          message: 'Server cPanel mengembalikan respons bukan format JSON.',
          detail: `Respons Server: "${rawText.slice(0, 100)}..."`,
          hint: 'Pastikan file api.php tidak mengandung output error PHP biasa (misal syntax error) sebelum header JSON.'
        };
      }
    } catch (err: any) {
      return {
        status: 'error',
        code: 'NETWORK_ERROR',
        message: 'File api.php tidak dapat diakses atau terjadi kesalahan jaringan/CORS.',
        detail: err?.message || 'Server 404/500 Error'
      };
    }
  },

  /**
   * Load all app data from MySQL
   */
  async fetchAllData(): Promise<Record<string, any> | null> {
    try {
      const res = await fetch(`${API_BASE_URL}?action=get_all`, {
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
      const res = await fetch(`${API_BASE_URL}?action=save_all`, {
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
      const res = await fetch(`${API_BASE_URL}?action=save_key`, {
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
