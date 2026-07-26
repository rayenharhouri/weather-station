import { config } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

export const OPS_AUTH_TOKEN_KEY = 'weather_station_auth_token';

export const ACTIVE_API_TOKEN_KEY = 'wh.research.activeApiToken';

export interface CreateApiClientOptions {
  getAuthToken?: () => string | null;
}

const defaultGetAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OPS_AUTH_TOKEN_KEY);
};

export const createApiClient = (
  baseUrl: string,
  options: CreateApiClientOptions = {},
) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const getAuthToken = options.getAuthToken ?? defaultGetAuthToken;

  const normalizeError = (error: any): string => {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  };

  const withTimeout = (promise: Promise<Response>, ms: number): Promise<Response> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new ApiError('Request timeout', 408));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  };

  const executeRequest = async (
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<Response> => {
    const { timeout = 30000, retries = 3, ...fetchOptions } = options;
    const url = new URL(endpoint, baseUrl).toString();
    const authToken = getAuthToken();

    const requestHeaders = {
      ...headers,
      ...fetchOptions.headers,
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await withTimeout(
          fetch(url, {
            ...fetchOptions,
            headers: requestHeaders,
          }),
          timeout
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new ApiError(
            errorText || `HTTP ${response.status}`,
            response.status
          );
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isClientError =
          error instanceof ApiError &&
          error.statusCode &&
          error.statusCode >= 400 &&
          error.statusCode < 500 &&
          error.statusCode !== 408;

        if (isClientError || attempt === retries - 1) {
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw lastError || new ApiError('Failed to complete request');
  };

  return {
    async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
      try {
        const response = await executeRequest(endpoint, {
          ...options,
          method: 'GET',
        });
        return response.json();
      } catch (error) {
        throw new ApiError(normalizeError(error), undefined, error as Error);
      }
    },

    async post<T>(
      endpoint: string,
      body?: unknown,
      options?: FetchOptions
    ): Promise<T> {
      try {
        const response = await executeRequest(endpoint, {
          ...options,
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined,
        });
        return response.json();
      } catch (error) {
        throw new ApiError(normalizeError(error), undefined, error as Error);
      }
    },

    async patch<T>(
      endpoint: string,
      body?: unknown,
      options?: FetchOptions
    ): Promise<T> {
      try {
        const response = await executeRequest(endpoint, {
          ...options,
          method: 'PATCH',
          body: body ? JSON.stringify(body) : undefined,
        });
        return response.json();
      } catch (error) {
        throw new ApiError(normalizeError(error), undefined, error as Error);
      }
    },

    async put<T>(
      endpoint: string,
      body?: unknown,
      options?: FetchOptions
    ): Promise<T> {
      try {
        const response = await executeRequest(endpoint, {
          ...options,
          method: 'PUT',
          body: body ? JSON.stringify(body) : undefined,
        });
        return response.json();
      } catch (error) {
        throw new ApiError(normalizeError(error), undefined, error as Error);
      }
    },

    async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
      try {
        const response = await executeRequest(endpoint, {
          ...options,
          method: 'DELETE',
        });
        return response.json();
      } catch (error) {
        throw new ApiError(normalizeError(error), undefined, error as Error);
      }
    },
  };
};

export const apiClient = createApiClient(config.apiUrl);

export const v1ApiClient = createApiClient(config.apiUrl, {
  getAuthToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_API_TOKEN_KEY);
  },
});
