import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsProvider } from './hooks/useSettings'

ReactDOM.createRoot(document.getElementById('root')).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
)
