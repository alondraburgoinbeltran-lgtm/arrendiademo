/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { createFileRoute, createRootRoute } from '@tanstack/react-router'

import { Route as RootImport } from './routes/__root'
import { Route as AppImport } from './routes/_app'
import { Route as LoginImport } from './routes/login'
import { Route as IndexImport } from './routes/index'
import { Route as AppDashboardImport } from './routes/_app/dashboard'
import { Route as AppPropiedadesImport } from './routes/_app/propiedades'
import { Route as AppCobranzaImport } from './routes/_app/cobranza'
import { Route as AppContratosImport } from './routes/_app/contratos'
import { Route as AppServiciosImport } from './routes/_app/servicios'
import { Route as AppCalendarioImport } from './routes/_app/calendario'
import { Route as AppReportesImport } from './routes/_app/reportes'
import { Route as AppMasImport } from './routes/_app/mas'
import { Route as AppGastosImport } from './routes/_app/gastos'

const RootRoute = RootImport.update({ id: '/__root' } as any)
const AppRoute = AppImport.update({ id: '/_app', path: '/_app' } as any)
const LoginRoute = LoginImport.update({ path: '/login' } as any)
const IndexRoute = IndexImport.update({ path: '/' } as any)
const AppDashboardRoute = AppDashboardImport.update({ path: '/dashboard' } as any)
const AppPropiedadesRoute = AppPropiedadesImport.update({ path: '/propiedades' } as any)
const AppCobranzaRoute = AppCobranzaImport.update({ path: '/cobranza' } as any)
const AppContratosRoute = AppContratosImport.update({ path: '/contratos' } as any)
const AppServiciosRoute = AppServiciosImport.update({ path: '/servicios' } as any)
const AppCalendarioRoute = AppCalendarioImport.update({ path: '/calendario' } as any)
const AppReportesRoute = AppReportesImport.update({ path: '/reportes' } as any)
const AppMasRoute = AppMasImport.update({ path: '/mas' } as any)
const AppGastosRoute = AppGastosImport.update({ path: '/gastos' } as any)

export const routeTree = RootRoute.addChildren([
  LoginRoute,
  IndexRoute,
  AppRoute.addChildren([
    AppDashboardRoute,
    AppPropiedadesRoute,
    AppCobranzaRoute,
    AppContratosRoute,
    AppServiciosRoute,
    AppCalendarioRoute,
    AppReportesRoute,
    AppMasRoute,
    AppGastosRoute,
  ]),
])
