import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/heebo';
import App from './App';
import './index.css';

// Set document-level RTL and Hebrew language
document.documentElement.dir = 'rtl';
document.documentElement.lang = 'he';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
