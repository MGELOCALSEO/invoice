import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './invoice-system.jsx';

// Storage polyfill for window.storage API
if (!window.storage) {
  window.storage = {
    async get(key) {
      return new Promise((resolve) => {
        const value = localStorage.getItem(key);
        resolve({ value });
      });
    },
    async set(key, value) {
      return new Promise((resolve, reject) => {
        try {
          localStorage.setItem(key, value);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
