import { QueryClient } from '@tanstack/react-query';

// Cliente único de React Query: el cierre de sesión lo vacía para no mezclar datos entre usuarios.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    },
});
