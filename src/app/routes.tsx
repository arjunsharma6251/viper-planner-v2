import { StudentApp } from '../ui/pages/StudentApp'
import { AdminApp } from '../ui/pages/AdminApp'
import { isAdminMode } from '../utils/mode'

/**
 * ?mode=admin in the URL enables admin mode and persists it to localStorage,
 * so subsequent visits without the param stay in admin mode.
 * ?mode=student clears it.
 */
export function AppRoutes() {
  return isAdminMode() ? <AdminApp /> : <StudentApp />
}
