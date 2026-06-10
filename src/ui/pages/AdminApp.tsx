import { StudentApp } from './StudentApp'

/** Admin mode = everything in student mode plus the NCC sandbox. */
export function AdminApp() {
  return (
    <div>
      <StudentApp />
      {/* NCC Sandbox lands here */}
    </div>
  )
}
