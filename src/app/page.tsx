import { HomeContent } from '@/components/HomeContent'
import { getSiteName, getSiteTagline } from '@/lib/site-branding'

export default function Home() {
  return <HomeContent siteName={getSiteName()} siteTagline={getSiteTagline()} />
}
