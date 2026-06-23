import { ProjectDetailPage } from './pages/ProjectDetailPage.tsx'
import { ProjectListPage } from './pages/ProjectListPage.tsx'
import { useHashPath } from './router'
import IntroSplashScreen from './components/IntroSplashScreen.tsx'

export function App() {
  const path = useHashPath()
  const m = path.match(/^\/project\/(.+)$/)
  const content = m ? (
    <ProjectDetailPage id={decodeURIComponent(m[1])} />
  ) : (
    <ProjectListPage />
  )

  return (
    <>
      <IntroSplashScreen />
      {content}
    </>
  )
}
