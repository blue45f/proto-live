import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { ProjectsService } from '../src/projects/projects.service'
import { createEmptyProjectsState, AuthSession } from '../src/projects/project.models'
import { JsonProjectsStore } from '../src/projects/projects.store'
import { CommunityService, ATTACHMENT_MAX_BYTES } from '../src/community/community.service'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function sessionFor(email: string, role: AuthSession['role'], id = 99): AuthSession {
  return { id, email, role, name: `${role} 테스트`, expiresAt: '2099-01-01T00:00:00.000Z' }
}

const maker = sessionFor('maker@example.com', 'maker', 1)
const member = sessionFor('member@example.com', 'member', 2)
const investor = sessionFor('investor@example.com', 'investor', 3)
const admin = sessionFor('admin@example.com', 'admin', 4)

async function withCommunity(
  run: (community: CommunityService, projects: ProjectsService) => Promise<void>
) {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-community-'))
  const previousProjectPath = process.env.PROJECT_STORE_PATH
  const previousCommunityPath = process.env.COMMUNITY_STORE_PATH
  try {
    process.env.PROJECT_STORE_PATH = join(dir, 'projects.json')
    process.env.COMMUNITY_STORE_PATH = join(dir, 'community.json')

    const state = createEmptyProjectsState()
    state.users.push({ id: 1, email: maker.email, role: 'maker', name: '메이커 김' })
    state.users.push({
      id: 2,
      email: member.email,
      role: 'member',
      name: '회원 이',
      password: 'pass-member-test',
    })
    state.users.push({
      id: 3,
      email: investor.email,
      role: 'investor',
      name: '투자자 박',
      password: 'pass-investor-test',
    })
    state.users.push({ id: 4, email: admin.email, role: 'admin', name: '운영자' })
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Community Demo',
      description: 'A demo for community threads.',
      liveUrl: 'https://example.com/demo',
      category: 'AI & SaaS',
      accessMode: 'open',
      protectionNoticeAccepted: true,
      thumbnail: null,
      maturity: 'live',
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: {
        success: true,
        status: 200,
        message: 'ok',
        checkedAt: '2026-06-01T00:00:00.000Z',
        finalUrl: 'https://example.com/demo',
        responseTimeMs: 120,
      },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    state.nextUserId = 5
    state.nextProjectId = 2
    new JsonProjectsStore(process.env.PROJECT_STORE_PATH).write(state)

    const projectsService = new ProjectsService()
    await projectsService.onModuleInit()
    const communityService = new CommunityService(projectsService)
    await communityService.onModuleInit()
    await run(communityService, projectsService)
  } finally {
    if (previousProjectPath === undefined) delete process.env.PROJECT_STORE_PATH
    else process.env.PROJECT_STORE_PATH = previousProjectPath
    if (previousCommunityPath === undefined) delete process.env.COMMUNITY_STORE_PATH
    else process.env.COMMUNITY_STORE_PATH = previousCommunityPath
    rmSync(dir, { recursive: true, force: true })
  }
}

test('토론 생성 → 목록/상세 라운드트립', async () => {
  await withCommunity(async (community) => {
    const created = await community.createThread(1, member, {
      category: 'question',
      title: '결제 연동은 어떻게 하셨나요?',
      body: '바이브코딩으로 결제까지 붙이셨다고 해서 과정이 궁금합니다. 어떤 도구를 쓰셨나요?',
    })
    assert.equal(created.thread.projectId, 1)
    assert.equal(created.thread.status, 'visible')

    const list = await community.listThreads(1)
    assert.equal(list.length, 1)
    assert.equal(list[0].title, '결제 연동은 어떻게 하셨나요?')
    assert.equal(list[0].commentCount, 0)

    const detail = await community.getThreadDetail(1, created.thread.id)
    assert.equal(detail.comments.length, 0)
    assert.equal(detail.thread.authorEmail, member.email)
  })
})

test('댓글은 1단 답글까지만 허용한다', async () => {
  await withCommunity(async (community) => {
    const { thread } = await community.createThread(1, member, {
      category: 'feedback',
      title: '온보딩 흐름 피드백',
      body: '첫 화면에서 무엇을 해야 할지 헤맸어요. 단계 안내가 있으면 좋겠습니다.',
    })
    const root = community.addComment(thread.id, maker, { body: '의견 감사합니다! 반영해볼게요.' })
    const reply = community.addComment(thread.id, member, {
      body: '기대하겠습니다 :)',
      parentId: root.id,
    })
    assert.equal(reply.parentId, root.id)

    assert.throws(
      () => community.addComment(thread.id, investor, { body: '저도요!', parentId: reply.id }),
      /1단 답글/
    )
  })
})

test('댓글 삭제는 레코드를 지우지 않고 플레이스홀더로 남긴다(첨부도 제거)', async () => {
  await withCommunity(async (community) => {
    const { thread } = await community.createThread(1, member, {
      category: 'help',
      title: '배포 도움 요청',
      body: '버셀 배포에서 환경변수 설정이 자꾸 풀립니다. 비슷한 경험 있으신 분 계신가요?',
    })
    const comment = community.addComment(thread.id, investor, {
      body: '스크린샷 첨부합니다.',
      attachments: [TINY_PNG],
    })
    assert.equal(comment.attachments.length, 1)

    const deleted = community.deleteComment(thread.id, comment.id, investor)
    assert.equal(deleted.status, 'deleted')
    assert.equal(deleted.body, '')
    assert.equal(deleted.attachments[0].dataUrl, '')
    assert.equal(deleted.attachments[0].removedBy, investor.email)

    const detail = await community.getThreadDetail(1, thread.id)
    assert.equal(detail.comments.length, 1)
    assert.equal(detail.comments[0].status, 'deleted')

    assert.throws(
      () => community.deleteComment(thread.id, comment.id, member),
      /본인이 작성한 댓글/
    )
  })
})

test('첨부는 형식과 2MB 캡을 서버에서 재검증한다', async () => {
  await withCommunity(async (community) => {
    await assert.rejects(
      community.createThread(1, member, {
        category: 'showcase',
        title: '첨부 형식 테스트',
        body: '이 본문은 첨부 형식 검증을 위한 테스트 본문입니다.',
        attachments: ['data:text/html;base64,PGI+aGk8L2I+'],
      }),
      /형식이 올바르지 않습니다/
    )

    const oversizedChars = Math.ceil((ATTACHMENT_MAX_BYTES + 1024) * (4 / 3))
    const oversized = `data:image/jpeg;base64,${'A'.repeat(oversizedChars)}`
    await assert.rejects(
      community.createThread(1, member, {
        category: 'showcase',
        title: '첨부 용량 테스트',
        body: '이 본문은 첨부 용량 검증을 위한 테스트 본문입니다.',
        attachments: [oversized],
      }),
      /2MB 이하/
    )

    const ok = await community.createThread(1, member, {
      category: 'showcase',
      title: '정상 첨부',
      body: '정상 크기의 PNG 한 장을 첨부하는 테스트입니다.',
      attachments: [TINY_PNG],
    })
    assert.equal(ok.thread.attachments.length, 1)

    const removed = community.removeAttachment(ok.thread.attachments[0].id, admin)
    assert.equal(removed.dataUrl, '')
    assert.equal(removed.removedBy, admin.email)
  })
})

test('운영자 모더레이션: 숨김 → 공개 목록 제외, 복구, 하드 삭제', async () => {
  await withCommunity(async (community) => {
    const { thread } = await community.createThread(1, member, {
      category: 'question',
      title: '모더레이션 대상 스레드',
      body: '이 스레드는 운영자 모더레이션 흐름을 검증하기 위한 것입니다.',
    })
    community.addComment(thread.id, investor, { body: '댓글 하나 답니다.' })

    community.moderateThread(thread.id, 'hide', admin, '커뮤니티 가이드 위반')
    assert.equal((await community.listThreads(1)).length, 0)
    await assert.rejects(community.getThreadDetail(1, thread.id), /찾을 수 없습니다/)
    // 운영자는 숨김 스레드 상세를 볼 수 있다(검토 목적).
    const adminDetail = await community.getThreadDetail(1, thread.id, admin)
    assert.equal(adminDetail.thread.status, 'hidden')
    assert.equal(community.listAdminThreads().length, 1)

    community.moderateThread(thread.id, 'restore', admin)
    assert.equal((await community.listThreads(1)).length, 1)

    community.moderateThread(thread.id, 'delete', admin)
    assert.equal(community.listAdminThreads().length, 0)
  })
})

test('작성자는 본인 스레드를 숨김(소프트 삭제)할 수 있다', async () => {
  await withCommunity(async (community) => {
    const { thread } = await community.createThread(1, member, {
      category: 'feedback',
      title: '작성자 삭제 테스트',
      body: '작성자 본인 삭제 후 목록에서 빠지는지 확인하는 테스트입니다.',
    })
    assert.throws(() => community.hideOwnThread(thread.id, investor), /본인이 작성한 토론/)
    community.hideOwnThread(thread.id, member)
    assert.equal((await community.listThreads(1)).length, 0)
  })
})

test('쪽지: 관심 회원이 시작하고 메이커가 답장하며 읽음 처리가 동작한다', async () => {
  await withCommunity(async (community) => {
    // 메이커는 자기 프로젝트로 새 대화를 시작할 수 없다(받은 쪽지에 답장만).
    await assert.rejects(
      community.sendMessage(maker, { projectId: 1, body: '제 프로젝트 어떠세요?' }),
      /관심 회원\/투자자/
    )

    const first = await community.sendMessage(investor, {
      projectId: 1,
      body: '데모 잘 봤습니다. 수익 모델이 궁금해요.',
    })
    assert.equal(first.conversation.makerEmail, maker.email)
    assert.equal(first.conversation.investorEmail, investor.email)

    // 같은 (프로젝트, 투자자) 조합은 기존 대화를 재사용한다.
    const second = await community.sendMessage(investor, {
      projectId: 1,
      body: '시간 되실 때 답장 부탁드립니다.',
    })
    assert.equal(second.conversation.id, first.conversation.id)

    // 메이커 수신함: 미확인 2건.
    const makerInbox = community.listConversations(maker)
    assert.equal(makerInbox.length, 1)
    assert.equal(makerInbox[0].unreadCount, 2)

    // 메이커가 대화를 열면 읽음 처리되고, 답장은 conversationId 로 보낸다.
    const opened = community.getConversationMessages(first.conversation.id, maker)
    assert.equal(opened.messages.length, 2)
    assert.equal(community.listConversations(maker)[0].unreadCount, 0)

    await community.sendMessage(maker, {
      conversationId: first.conversation.id,
      body: '관심 감사합니다! 구독 + 거래 수수료 혼합 모델입니다.',
    })
    const investorInbox = community.listConversations(investor)
    assert.equal(investorInbox[0].unreadCount, 1)

    // 제3자는 대화를 볼 수 없다.
    assert.throws(
      () => community.getConversationMessages(first.conversation.id, member),
      /찾을 수 없습니다/
    )
  })
})

test('운영 콘솔 회원 디렉터리: 활동 집계와 메모 갱신', async () => {
  await withCommunity(async (_community, projects) => {
    projects.createProjectReview(1, {
      email: member.email,
      role: 'member',
      type: 'review',
      rating: 4,
      body: '커뮤니티 모듈 테스트용 리뷰입니다.',
    })

    const members = projects.getAdminMembers()
    assert.equal(members.length, 4)
    const memberRow = members.find((row) => row.email === member.email)
    assert.ok(memberRow)
    assert.equal(memberRow.reviewCount, 1)
    const makerRow = members.find((row) => row.email === maker.email)
    assert.ok(makerRow)
    assert.equal(makerRow.projectCount, 1)

    const updated = projects.updateMemberNotes(memberRow.id, '활발한 베타 테스터')
    assert.equal(updated.notes, '활발한 베타 테스터')
    const cleared = projects.updateMemberNotes(memberRow.id, '   ')
    assert.equal(cleared.notes, null)
  })
})

test('운영 콘솔 회원 라이프사이클: 정지/복구/탈퇴가 로그인과 세션에 반영된다', async () => {
  await withCommunity(async (_community, projects) => {
    const loggedIn = projects.login({ email: member.email, password: 'pass-member-test' })
    assert.ok(projects.getSessionFromCookie(loggedIn.cookie))

    const memberRow = projects.getAdminMembers().find((row) => row.email === member.email)
    assert.ok(memberRow)

    const suspended = projects.updateMemberLifecycle(
      memberRow.id,
      { action: 'suspend', reason: '반복 광고 게시' },
      admin
    )
    assert.equal(suspended.member.status, 'suspended')
    assert.equal(projects.getSessionFromCookie(loggedIn.cookie), null)
    assert.throws(
      () => projects.login({ email: member.email, password: 'pass-member-test' }),
      /정지된 계정/
    )

    const restored = projects.updateMemberLifecycle(memberRow.id, { action: 'restore' }, admin)
    assert.equal(restored.member.status, 'active')
    assert.ok(projects.login({ email: member.email, password: 'pass-member-test' }).session)

    const withdrawn = projects.updateMemberLifecycle(
      memberRow.id,
      { action: 'withdraw', reason: '본인 탈퇴 요청 처리' },
      admin
    )
    assert.equal(withdrawn.member.status, 'withdrawn')
    assert.equal(withdrawn.member.name, null)
    assert.throws(
      () => projects.login({ email: member.email, password: 'pass-member-test' }),
      /이메일 또는 비밀번호/
    )
  })
})

test('커뮤니티 금칙어: 토론/댓글/쪽지 입력을 저장 전에 차단하고 비활성화하면 허용한다', async () => {
  await withCommunity(async (community) => {
    const term = community.createForbiddenTerm(admin, {
      term: '금지어',
      scope: 'all',
      reason: '테스트 정책',
    })
    assert.equal(community.listForbiddenTerms().length, 1)

    await assert.rejects(
      community.createThread(1, member, {
        category: 'question',
        title: '금지어 포함 제목',
        body: '본문은 충분히 정상적인 길이입니다.',
      }),
      /금칙어/
    )

    const { thread } = await community.createThread(1, member, {
      category: 'question',
      title: '정상 제목',
      body: '금칙어 없이 충분히 긴 정상 토론 본문입니다.',
    })
    assert.throws(
      () => community.addComment(thread.id, investor, { body: '댓글에 금지어 포함' }),
      /금칙어/
    )
    await assert.rejects(
      community.sendMessage(investor, { projectId: 1, body: '쪽지에 금지어 포함' }),
      /금칙어/
    )

    community.updateForbiddenTerm(term.id, admin, { enabled: false })
    const allowed = community.addComment(thread.id, investor, { body: '비활성 금지어는 허용' })
    assert.equal(allowed.status, 'visible')
  })
})

test('커뮤니티 금칙어 관리: 중복 방지, 범위 변경, 삭제가 동작한다', async () => {
  await withCommunity(async (community) => {
    const term = community.createForbiddenTerm(admin, {
      term: '스팸',
      scope: 'discussion',
      reason: '광고성 표현',
    })
    assert.throws(
      () => community.createForbiddenTerm(admin, { term: '  스팸  ', scope: 'discussion' }),
      /이미 등록/
    )

    community.updateForbiddenTerm(term.id, admin, { scope: 'message' })
    await community.createThread(1, member, {
      category: 'help',
      title: '스팸이라는 단어가 있지만 토론 범위에서는 해제됨',
      body: '범위를 쪽지로 바꾼 뒤에는 토론 작성이 허용됩니다.',
    })
    await assert.rejects(
      community.sendMessage(investor, { projectId: 1, body: '스팸 문의입니다.' }),
      /금칙어/
    )

    community.deleteForbiddenTerm(term.id)
    const message = await community.sendMessage(investor, {
      projectId: 1,
      body: '스팸 단어도 삭제 후에는 전송됩니다.',
    })
    assert.equal(message.message.body, '스팸 단어도 삭제 후에는 전송됩니다.')
  })
})
