import PocketBase from 'pocketbase';
import { singleton } from '~/singleton.server';

declare global {
  var __pb: PocketBase | undefined;
}

export const getPocketBase = singleton('pocketbase', () => {
  const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');
  if (process.env.NODE_ENV !== 'production') {
    // Allow easy access during development
    global.__pb = pb;
  }
  return pb;
});

export const getAuthenticatedPocketBase = async (request: Request) => {
  const pb = getPocketBase();
  
  // Get the cookie header from the request
  const cookie = request.headers.get('Cookie') || '';
  pb.authStore.loadFromCookie(cookie);
  
  // Check if auth is valid and refresh it if needed
  if (pb.authStore.isValid) {
    try {
      // Try to refresh the session
      await pb.collection('users').authRefresh();
    } catch (_) {
      // Clear the auth store on failed refresh
      pb.authStore.clear();
    }
  }
  
  return pb;
}; 