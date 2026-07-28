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

const API_BASE_URL = '/api.php';

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
      const json: SyncResponse = await res.json();
      return json;
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
      const json: SyncResponse = await res.json();
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
      const json: SyncResponse = await res.json();
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
