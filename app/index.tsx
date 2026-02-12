import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function IndexRoute() {
  const { isHydrated, isAuthenticated } = useAuth();
  if (!isHydrated) {
    return null;
  }
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/signup'} />;
}
