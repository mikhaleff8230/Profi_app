import Cookie from 'js-cookie';
import SSRCookie from 'cookie';
import {
  AUTH_CRED, EMAIL_VERIFIED,
  PERMISSIONS,
  STAFF,
  STORE_OWNER,
  SUPER_ADMIN,
  TOKEN,
} from './constants';

export const allowedRoles = [SUPER_ADMIN, STORE_OWNER, STAFF];
export const adminAndOwnerOnly = [SUPER_ADMIN, STORE_OWNER];
export const adminOwnerAndStaffOnly = [SUPER_ADMIN, STORE_OWNER, STAFF];
export const adminOnly = [SUPER_ADMIN];
export const ownerOnly = [STORE_OWNER];
export const ownerAndStaffOnly = [STORE_OWNER, STAFF];

const LEGACY_AUTH_KEYS = ['authToken'];

function getAuthStorageKeys() {
  return Array.from(
    new Set(
      [
        AUTH_CRED,
        process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY,
        ...LEGACY_AUTH_KEYS,
      ].filter(Boolean) as string[]
    )
  );
}

function parseAuthPayload(authCred?: string | null): {
  token: string | null;
  permissions: string[] | null;
} {
  if (!authCred) {
    return { token: null, permissions: null };
  }

  try {
    return JSON.parse(authCred);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(authCred));
    } catch {
      return { token: null, permissions: null };
    }
  }
}

function getClientAuthPayload() {
  for (const key of getAuthStorageKeys()) {
    const cookieValue = Cookie.get(key);
    if (cookieValue) {
      return cookieValue;
    }
  }

  if (typeof window !== 'undefined') {
    for (const key of getAuthStorageKeys()) {
      const storageValue = window.localStorage.getItem(key);
      if (storageValue) {
        return storageValue;
      }
    }
  }

  return null;
}

export function setAuthCredentials(token: string, permissions: any) {
  const payload = JSON.stringify({ token, permissions });
  for (const key of getAuthStorageKeys()) {
    Cookie.set(key, payload, {
      sameSite: 'lax',
      expires: 7,
      path: '/',
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, payload);
    }
  }
}

export function clearAuthCredentials() {
  for (const key of getAuthStorageKeys()) {
    Cookie.remove(key, { path: '/' });
    Cookie.remove(key);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  }
}
export function setEmailVerified(emailVerified: boolean) {
  Cookie.set(EMAIL_VERIFIED, JSON.stringify({ emailVerified }));
}
export function getEmailVerified(): {
  emailVerified: boolean;
} {
  const emailVerified = Cookie.get(EMAIL_VERIFIED);
  return emailVerified ? JSON.parse(emailVerified) : false;
}

export function getAuthCredentials(context?: any): {
  token: string | null;
  permissions: string[] | null;
} {
  let authCred: string | null | undefined;
  if (context) {
    const cookies = parseSSRCookie(context);
    for (const key of getAuthStorageKeys()) {
      if (cookies[key]) {
        authCred = cookies[key];
        break;
      }
    }
  } else {
    authCred = getClientAuthPayload();
  }

  return parseAuthPayload(authCred);
}

export function parseSSRCookie(context: any) {
  return SSRCookie.parse(context.req.headers.cookie ?? '');
}

export function hasAccess(
  _allowedRoles: string[],
  _userPermissions: string[] | undefined | null
) {
  if (_userPermissions) {
    return Boolean(
      _allowedRoles?.find((aRole) => _userPermissions.includes(aRole))
    );
  }
  return false;
}
export function isAuthenticated(_cookies: any) {
  return (
    !!_cookies[TOKEN] &&
    Array.isArray(_cookies[PERMISSIONS]) &&
    !!_cookies[PERMISSIONS].length
  );
}
