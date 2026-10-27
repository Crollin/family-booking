import { Navbar } from '@/components/layout/Navbar'

export default function LivreDorLayout({
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


