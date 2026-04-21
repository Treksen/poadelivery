import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext({})
export const useSettings = () => useContext(SettingsContext)

const TRANSLATIONS = {
  en: {
    home: 'Home', orders: 'Orders', track: 'Track', profile: 'Profile',
    menu: 'Menu', dashboard: 'Dashboard', earnings: 'Earnings',
    search: 'Search restaurants, food...', orderNow: 'Order now',
    addToCart: 'Add', viewCart: 'View cart', placeOrder: 'Place order',
    delivery: 'Delivery', subtotal: 'Subtotal', total: 'Total',
    loading: 'Loading...', signOut: 'Sign out', signIn: 'Sign in',
    welcome: 'Welcome back', noOrders: 'No orders yet',
    trackOrder: 'Track order', cancelled: 'Cancelled',
    delivered: 'Delivered', preparing: 'Preparing', pending: 'Pending',
  },
  sw: {
    home: 'Nyumbani', orders: 'Maagizo', track: 'Fuatilia', profile: 'Wasifu',
    menu: 'Menyu', dashboard: 'Dashibodi', earnings: 'Mapato',
    search: 'Tafuta mikahawa, chakula...', orderNow: 'Agiza sasa',
    addToCart: 'Ongeza', viewCart: 'Ona kikapu', placeOrder: 'Weka agizo',
    delivery: 'Uwasilishaji', subtotal: 'Jumla ndogo', total: 'Jumla',
    loading: 'Inapakia...', signOut: 'Toka', signIn: 'Ingia',
    welcome: 'Karibu tena', noOrders: 'Hakuna maagizo bado',
    trackOrder: 'Fuatilia agizo', cancelled: 'Imefutwa',
    delivered: 'Imewasilishwa', preparing: 'Inaandaliwa', pending: 'Inasubiri',
  }
}

export function SettingsProvider({ children }) {
  const [theme, setTheme]    = useState(() => localStorage.getItem('poa_theme') || 'light')
  const [lang, setLang]      = useState(() => localStorage.getItem('poa_lang')  || 'en')

  useEffect(() => {
    localStorage.setItem('poa_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('poa_lang', lang)
  }, [lang])

  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key

  const toggleTheme = () => setTheme(p => p === 'light' ? 'dark' : 'light')
  const toggleLang  = () => setLang(p => p === 'en' ? 'sw' : 'en')

  return (
    <SettingsContext.Provider value={{ theme, lang, t, toggleTheme, toggleLang }}>
      {children}
    </SettingsContext.Provider>
  )
}
