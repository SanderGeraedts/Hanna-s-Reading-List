import { Component } from 'react'
import type { ReactNode } from 'react'

/** A 3D scene that fails (no WebGL, a lost context) is left out; the rest of the page stays (Design §5). */
export class SceneBoundary extends Component<{ children: ReactNode; onFail?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
