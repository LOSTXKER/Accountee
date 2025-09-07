// src/components/auth/AuthProvider.tsx
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext } from '@/hooks/useAuth';

const supabase = createClient();

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // This effect is commented out as it might be causing redirect loops
  // or unwanted behavior. The logic in src/app/page.tsx should handle
  // the initial redirection. We can re-enable this if specific
  // protected routes need more granular control.
  /*
  useEffect(() => {
    const protectedRoutes = ['/dashboard']; // Add other protected routes if needed
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (!loading && !user && isProtectedRoute) {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);
  */

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}