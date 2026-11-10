import type { HistoryItem } from '../rubric.ts'
import Dashboard from './home/Dashboard.tsx'
import Landing from './home/Landing.tsx'
import { Screen } from './primitives.tsx'

type Props = {
  /** null while loading, so a returning user never sees the first-visit page flash. */
  history: HistoryItem[] | null
  hasKey: boolean
  busy: boolean
  onStart: (topic: string, minutes: number) => void
  onNeedKey: (pending: { topic: string; minutes: number } | null) => void
}

export default function Home({ history, ...rest }: Props) {
  if (history === null) {
    return (
      <Screen>
        <div className="skeleton-stack" aria-busy="true" aria-label="Loading">
          <span className="skeleton" style={{ width: '30%', height: 12 }} />
          <span className="skeleton" style={{ width: '80%', height: 56 }} />
          <span className="skeleton" style={{ width: '100%', height: 48 }} />
        </div>
      </Screen>
    )
  }
  return history.length ? <Dashboard history={history} {...rest} /> : <Landing {...rest} />
}
