"use client"

import { useAppState } from '@/lib/app-state'
import { Navbar } from '@/components/navbar'
import { HomePage } from '@/components/home-page'
import { BuilderPage } from '@/components/builder-page'
import { PrebuiltPage } from '@/components/prebuilt-page'
import { ShopPage } from '@/components/shop-page'
import { DashboardPage } from '@/components/dashboard-page'
import { Notifications } from '@/components/notifications'

export default function Page() {
  const { currentPage } = useAppState()

  return (
    <>
      <Navbar />
      <main>
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'builder' && <BuilderPage />}
        {currentPage === 'prebuilt' && <PrebuiltPage />}
        {currentPage === 'shop' && <ShopPage />}
        {currentPage === 'dashboard' && <DashboardPage />}
      </main>
      <Notifications />
    </>
  )
}
