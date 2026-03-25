import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles.css';

function formatFatalError(error) {
  if (!error) {
    return 'Unknown runtime error';
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function showFatalError(error, extra = '') {
  const existing = document.getElementById('fatal-runtime-error');
  if (existing) {
    existing.remove();
  }

  const panel = document.createElement('pre');
  panel.id = 'fatal-runtime-error';
  panel.style.position = 'fixed';
  panel.style.inset = '16px';
  panel.style.zIndex = '99999';
  panel.style.margin = '0';
  panel.style.padding = '16px';
  panel.style.overflow = 'auto';
  panel.style.whiteSpace = 'pre-wrap';
  panel.style.background = '#fff6f4';
  panel.style.border = '2px solid #c63d2f';
  panel.style.color = '#18202c';
  panel.style.fontFamily = 'Consolas, monospace';
  panel.textContent = `Fatal app error\n\n${formatFatalError(error)}${extra ? `\n\n${extra}` : ''}`;
  document.body.appendChild(panel);
}

window.addEventListener('error', (event) => {
  showFatalError(event.error ?? event.message, event.filename ? `${event.filename}:${event.lineno}` : '');
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalError(event.reason, 'Unhandled promise rejection');
});

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    showFatalError(error, info?.componentStack ?? '');
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '24px', fontFamily: 'Manrope, sans-serif' }}>
          <h1 style={{ marginTop: 0 }}>Fatal app error</h1>
          <p>{formatFatalError(this.state.error)}</p>
          <p>Open the page again after the error is fixed.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

async function bootstrap() {
  try {
    const { default: App } = await import('./App.jsx');

    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <HashRouter>
            <App />
          </HashRouter>
        </RootErrorBoundary>
      </React.StrictMode>,
    );
  } catch (error) {
    showFatalError(error, 'Module bootstrap failure while loading App.jsx');
  }
}

bootstrap();