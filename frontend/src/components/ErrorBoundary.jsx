import { Component } from 'react'
import { logAudit } from '@/lib/audit'

// Without this, ANY unhandled render error (a null pointer, a bad
// prop, whatever) white-screens the entire app with zero explanation
// — the worst possible outcome for a business tool someone's actively
// using at a till. This catches it, shows a real recovery option, and
// logs it so it's not a silent, unreproducible mystery later.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Sellaris crashed:', error, info)
    logAudit('app_error', {
      message: error?.message,
      stack: error?.stack?.slice(0, 2000),
      componentStack: info?.componentStack?.slice(0, 2000),
    }).catch(() => {}) // never let logging itself crash the crash handler
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAFAFC' }}>
          <div className="max-w-[420px] text-center">
            <div className="font-[Fraunces,serif] text-[20px] font-semibold mb-3" style={{ color: '#17151F' }}>
              Sell<span style={{ color: '#6D4BBD' }}>aris</span>
            </div>
            <h1 className="text-[16px] font-medium mb-2" style={{ color: '#17151F' }}>
              Something went wrong
            </h1>
            <p className="text-[13px] mb-5" style={{ color: '#6B6580' }}>
              This has been logged. Try reloading — if it keeps happening, tell your Sellaris admin
              what you were doing when it happened.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-[10px] text-[14px] font-medium"
              style={{ background: '#5B3FA6', color: '#F5F3FA' }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
