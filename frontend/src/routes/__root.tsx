import { createRootRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const token = sessionStorage.getItem('arrendia_token')
    const isLoginPage = location.pathname === '/login'

    if (!token && !isLoginPage) {
      throw redirect({ to: '/login' })
    }
    if (token && isLoginPage) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: Outlet,
})
