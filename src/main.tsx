import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Dynamic route for different labs */}
        <Route path="/:labSlug" element={<App />} />
        
        {/* Fallback route if no slug is provided */}
        <Route path="/" element={<Navigate to="/default-lab" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
