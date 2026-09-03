const API_BASE = (import.meta as any).env.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiService {
  private refreshPromise: Promise<string | null> | null = null;

  private getTokens() {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    };
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  public clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async refreshTokens(): Promise<string | null> {
    const { refreshToken: currentRefreshToken } = this.getTokens();
    if (!currentRefreshToken) return null;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!response.ok) {
        if (this.getTokens().refreshToken === currentRefreshToken) {
          this.clearTokens();
        }
        return null;
      }

      const data = await response.json();
      if (data.accessToken && data.refreshToken) {
        this.setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      if (this.getTokens().refreshToken === currentRefreshToken) {
        this.clearTokens();
      }
      return null;
    }
  }

  public async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    let originalToken = localStorage.getItem('accessToken');
    const makeCall = async (tokenOverride?: string) => {
      const token = tokenOverride !== undefined ? tokenOverride : localStorage.getItem('accessToken');
      if (tokenOverride === undefined) {
        originalToken = token;
      }
      const headers = new Headers(options.headers || {});
      
      if (!options.skipAuth && token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      return fetch(url, {
        ...options,
        headers,
      });
    };

    try {
      let response = await makeCall();

      if ((response.status === 401 || response.status === 403) && !options.skipAuth) {
        let isTokenError = response.status === 401;
        if (response.status === 403) {
          const clone = response.clone();
          const errData = await clone.json().catch(() => ({}));
          if (errData.error && typeof errData.error === 'string' && errData.error.toLowerCase().includes('token')) {
            isTokenError = true;
          }
        }

        if (isTokenError) {
          if (!this.refreshPromise) {
            this.refreshPromise = this.refreshTokens().finally(() => {
              this.refreshPromise = null;
            });
          }

          const newAccessToken = await this.refreshPromise;

          if (newAccessToken) {
            response = await makeCall(newAccessToken);
          } else {
            const currentToken = localStorage.getItem('accessToken');
            if (currentToken === originalToken || !currentToken) {
              this.clearTokens();
              window.dispatchEvent(new Event('auth:unauthorized'));
            }
            throw new Error('Session expired');
          }
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const err = new Error(errData.error || errData.message || `HTTP error! status: ${response.status}`);
        (err as any).status = response.status;
        throw err;
      }

      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      throw error;
    }
  }

  public get(endpoint: string, options?: RequestOptions) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  public post(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public put(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public delete(endpoint: string, options?: RequestOptions) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  public getAuthDownloadUrl(endpoint: string): string {
    const token = localStorage.getItem('accessToken') || '';
    const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
    const delimiter = cleanEndpoint.includes('?') ? '&' : '?';
    const baseUrl = `${API_BASE}${cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`}`;
    return token ? `${baseUrl}${delimiter}token=${encodeURIComponent(token)}` : baseUrl;
  }

  public async downloadFile(endpoint: string, defaultFilename: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint}`;

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `Download failed with HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = defaultFilename;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const api = new ApiService();
export const getAuthDownloadUrl = (endpoint: string) => api.getAuthDownloadUrl(endpoint);

