import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', background:'#0a0c10', color:'#e8eaf0',
          fontFamily:'DM Mono, monospace', padding:40 }}>
          <h2 style={{ color:'#ff6b35', fontFamily:'Syne,sans-serif', marginBottom:16 }}>
            App Crashed
          </h2>
          <pre style={{ background:'#181b22', border:'1px solid #252830',
            borderRadius:8, padding:16, fontSize:'0.8rem', overflow:'auto',
            whiteSpace:'pre-wrap', maxWidth:900 }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
