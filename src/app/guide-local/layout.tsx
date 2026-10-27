import { Navbar } from '@/components/layout/Navbar'

export default function GuideLocalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}
