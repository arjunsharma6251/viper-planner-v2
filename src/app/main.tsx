import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { AppRoutes } from './routes'
import { installNccModule } from '../ncc/scheduler-module'

// The scheduler reaches NCC slot/check logic through this registration.
installNccModule()

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <AppRoutes />
  </StrictMode>,
)
