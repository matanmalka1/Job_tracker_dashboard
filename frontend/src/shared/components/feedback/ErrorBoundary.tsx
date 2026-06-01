import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <div className="text-center max-w-sm">
            <h2 className="text-white font-semibold text-base">Something went wrong</h2>
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary