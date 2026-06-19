import { Modal } from './Modal'

/** 화면에 표시할 단축키 한 줄(키 조합 + 설명 + 노출 조건). */
interface ShortcutRow {
  keys: string[]
  label: string
  enabled: boolean
}

/**
 * 키보드 단축키 도움말 다이얼로그. 앱에 이미 존재하던 전역 단축키를 한곳에 모아
 * 발견 가능하게(discoverable) 만든다. `?` 키 또는 헤더의 도움말 버튼으로 열리고,
 * 공용 Modal(Radix Dialog) 위에 렌더해 포커스 트랩·Esc·바깥 클릭 닫힘을 그대로 따른다.
 */
export function ShortcutsDialog({
  open,
  onClose,
  canSubmitProject,
  canRefresh,
  searchPaletteEnabled,
}: {
  open: boolean
  onClose: () => void
  canSubmitProject: boolean
  canRefresh: boolean
  searchPaletteEnabled: boolean
}) {
  if (!open) {
    return null
  }

  const rows: ShortcutRow[] = [
    { keys: ['/'], label: '검색 입력으로 이동', enabled: true },
    { keys: ['⌘', 'K'], label: '전체 검색 팔레트 열기', enabled: searchPaletteEnabled },
    { keys: ['⌘', 'N'], label: '프로토타입 등록 열기', enabled: canSubmitProject },
    { keys: ['⌘', 'R'], label: '전체 사이트 상태 새로고침', enabled: canRefresh },
    { keys: ['?'], label: '이 단축키 도움말 열기', enabled: true },
    { keys: ['Esc'], label: '열린 다이얼로그·팝오버 닫기', enabled: true },
  ]

  const visibleRows = rows.filter((row) => row.enabled)

  return (
    <Modal
      title="키보드 단축키"
      subtitle="⌘ 는 macOS 기준이며, Windows·Linux 에서는 Ctrl 로 동작합니다."
      onClose={onClose}
    >
      <ul className="space-y-2">
        {visibleRows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-4 rounded-lg border border-stone-800 bg-stone-950/55 px-3 py-2.5"
          >
            <span className="text-sm font-bold text-stone-200">{row.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {row.keys.map((key) => (
                <kbd
                  key={key}
                  className="min-w-7 rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-center text-xs font-black text-stone-200 shadow-[0_1px_0_oklch(20%_0.02_250/0.4)]"
                >
                  {key}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-6 text-stone-500">
        입력란·텍스트 영역에 포커스가 있을 때는 단축키가 동작하지 않습니다(타이핑 보호).
      </p>
    </Modal>
  )
}
