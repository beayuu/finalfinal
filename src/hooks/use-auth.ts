import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient, apiRequest } from "@/lib/queryClient";

export type AuthUser = { id: string; username: string; isAdmin: boolean };

export const AUTH_QUERY_KEY = ["/api/auth/me"] as const;

export function useAuth() {
  const { data, isLoading } = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
    isAdmin: !!data?.isAdmin,
  };
}

export async function logout() {
  await apiRequest("POST", "/api/auth/logout");
  queryClient.setQueryData(AUTH_QUERY_KEY, null);
  await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
}
