import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'
import { CartProvider } from './context/CartContext'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider><CartProvider><CatalogProvider><App /></CatalogProvider></CartProvider></AuthProvider></BrowserRouter></QueryClientProvider></StrictMode>)
