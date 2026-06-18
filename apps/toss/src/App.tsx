import { ProjectDetailPage } from './pages/ProjectDetailPage.tsx'
import { ProjectListPage } from './pages/ProjectListPage.tsx'
import { useHashPath } from './router'

export function App() {
  const path = useHashPath()
  const m = path.match(/^\/project\/(.+)$/)
  if (m) return <ProjectDetailPage id={decodeURIComponent(m[1])} />
  return <ProjectListPage />
}
