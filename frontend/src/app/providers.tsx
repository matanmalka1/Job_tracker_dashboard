import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import ErrorBoundary from '../shared/components/feedback/ErrorBoundary.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

type AppProvidersProps = {
  children: ReactNode
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <ErrorBoundary>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
)

export default AppProviders
