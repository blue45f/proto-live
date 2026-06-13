import { Plus, RefreshCw, Zap, Users, Mail } from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'

import { LoginModal } from './components/modals/LoginModal'
import { MatchModal } from './components/modals/MatchModal'
import { PreviewModal } from './components/modals/PreviewModal'
import { ReviewModal } from './components/modals/ReviewModal'
import { SubmitProjectModal } from './components/modals/SubmitProjectModal'
import { NotificationBell } from './components/NotificationBell'
import { MarketView } from './components/pages/MarketView'
import { ProjectDiligencePanel } from './components/ProjectDiligencePanel'
import { RouteFallback } from './components/RouteFallback'
import ToastContainer from './components/ToastContainer'
import { lazyRetry } from './lib/lazy-retry'
import { POLICY_PAGES } from './lib/termsdesk'
import { resolveRoleLabel } from './local-auth'
import { routePath } from './router/route'
import { useProtoLiveApp } from './state/useProtoLiveApp'

// 라우트 코드 스플리팅: 기본 랜딩(MarketView)은 첫 페인트 경로라 eager 로 유지하고,
// 나머지 화면은 방문 시점에 청크를 불러온다. lazyRetry 는 재배포로 stale 해진 청크
// 요청 실패를 세션당 1회 전체 새로고침으로 복구한다(lib/lazy-retry.ts 참고).
const AdminDashboardView = lazyRetry(() =>
  import('./components/pages/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView }))
)
const MakerProfileView = lazyRetry(() =>
  import('./components/pages/MakerProfileView').then((m) => ({ default: m.MakerProfileView }))
)
const AboutView = lazyRetry(() =>
  import('./components/pages/AboutView').then((m) => ({ default: m.AboutView }))
)
const PolicyView = lazyRetry(() =>
  import('./components/pages/PolicyView').then((m) => ({ default: m.PolicyView }))
)
const SupportView = lazyRetry(() =>
  import('./components/pages/SupportView').then((m) => ({ default: m.SupportView }))
)
const MessagesView = lazyRetry(() =>
  import('./components/pages/MessagesView').then((m) => ({ default: m.MessagesView }))
)
const AdminCommunityView = lazyRetry(() =>
  import('./components/pages/AdminCommunityView').then((m) => ({ default: m.AdminCommunityView }))
)
const AdminMembersView = lazyRetry(() =>
  import('./components/pages/AdminMembersView').then((m) => ({ default: m.AdminMembersView }))
)
const DiscussionHub = lazyRetry(() =>
  import('./components/community/DiscussionHub').then((m) => ({ default: m.DiscussionHub }))
)

export default function App() {
  const {
    accessMode,
    accessModeOptions,
    activeFilterCount,
    activeFilters,
    adminAuditLogs,
    adminDashboard,
    adminDashboardError,
    adminReportedReviews,
    adminRevenueConfig,
    adminRevenueHealthScore,
    adminRevenueHealthTone,
    adminRevenueProjectionParams,
    adminRevenueTargetGap,
    adminRevenueTargetMonthly,
    adminScenarioMultipliers,
    adminTrendMetrics,
    apiOnline,
    applyAdminRecommendation,
    applyAllAdminRecommendations,
    applyFundingRange,
    applyObservedConversionRates,
    applyRevenueModelPreset,
    averageSignalDensity,
    canAccessAdmin,
    canSubmitProject,
    canRefreshProject,
    category,
    categoryOptions,
    closeDiligence,
    closePreview,
    closeProjectDetail,
    closeReviewDialog,
    config,
    handleSetChallenge,
    copyAdminRevenueSnapshot,
    copyFilterLink,
    description,
    detailProject,
    detailProjectId,
    isDetailUnavailable,
    diligenceEvents,
    diligenceProject,
    exportAdminRevenueReport,
    fastestResponseProject,
    favoriteProjectCount,
    favoriteProjectIds,
    upvotedProjectIds,
    handleToggleUpvote,
    handleToggleFeatured,
    fundingRangeId,
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    handleModerateReview,
    handleOpenMatchDialog,
    handleOpenPreview,
    handleProjectEvent,
    handleRefreshAll,
    handleRefreshProject,
    handleReportReview,
    handleSubmitMatch,
    handleSubmitProject,
    handleSubmitReview,
    handleVerifyUrl,
    hasFundingRangeError,
    iframeKey,
    iframeLoading,
    isAdminDashboardAvailable,
    isAdminView,
    isAboutView,
    activePolicyView,
    openAbout,
    openPolicy,
    goHome,
    isAdminCommunityView,
    isAdminMembersView,
    isSupportView,
    isMessagesView,
    activeDiscussionRoute,
    conversationId,
    messageUnreadCount,
    setMessageUnreadCount,
    openSupport,
    openMessages,
    openConversation,
    closeConversation,
    openDiscussionList,
    openDiscussionNew,
    openDiscussionDetail,
    closeDiscussions,
    openAdminArea,
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
    openNotification,
    isApplyingAllAdminRecommendations,
    isAuthenticated,
    isDiligenceEventsLoading,
    isInitialLoading,
    isMobileProjectTimelineOpen,
    isPreviewEventsLoading,
    isProjectReviewsLoading,
    isRefreshing,
    isSendingMatch,
    isSendingReview,
    isSubmitOpen,
    isSubmitting,
    liveUrl,
    loadDiligenceEvents,
    loadError,
    loadProjectEvents,
    loginEmail,
    loginPassword,
    matchLegalNoticeAccepted,
    matchMessage,
    matchPrivacyConsentAccepted,
    matchRiskNoticeAccepted,
    matchingProject,
    maxFundingAmount,
    minFundingAmount,
    minSignal,
    moderatingReviewId,
    onlyVerified,
    openProjectDetail,
    makerProfileId,
    makerProfile,
    isMakerProfileLoading,
    openMakerProfile,
    closeMakerProfile,
    openSubmitDialog,
    orderedAdminRecommendations,
    pageSize,
    previewEvents,
    previewProject,
    projectListView,
    projectMeta,
    projectReviews,
    projectLog,
    isProjectLogLoading,
    logBody,
    setLogBody,
    handleSubmitLog,
    isSubmittingLog,
    projects,
    protectionNoticeAccepted,
    maturity,
    setMaturity,
    stack,
    setStack,
    builtWith,
    toggleBuildTool,
    customToolsInput,
    setCustomToolsInput,
    vibeCoded,
    setVibeCoded,
    recommendationSummary,
    replyToReview,
    reportingReviewId,
    resetAdminScenarioMultipliers,
    resetFilters,
    revenueProjection,
    reviewBody,
    reviewProject,
    reviewRating,
    reviewType,
    searchInputRef,
    searchQuery,
    selectedAccessMode,
    selectedCategory,
    selectedTag,
    session,
    setAccessMode,
    setCategory,
    setDescription,
    setFundingRangeId,
    setIframeKey,
    setIframeLoading,
    setIsLoginOpen,
    setIsMobileProjectTimelineOpen,
    setIsSubmitOpen,
    setLiveUrl,
    setLoginEmail,
    setLoginPassword,
    setMatchLegalNoticeAccepted,
    setMatchMessage,
    setMatchPrivacyConsentAccepted,
    setMatchRiskNoticeAccepted,
    setMatchingProject,
    setMaxFundingAmount,
    setMinFundingAmount,
    setMinSignal,
    setOnlyVerified,
    setPage,
    setPageSize,
    setProjectListView,
    setProtectionNoticeAccepted,
    setReplyToReview,
    setReviewBody,
    setReviewRating,
    setReviewType,
    setSearchQuery,
    setSelectedAccessMode,
    setSelectedCategory,
    setSelectedTag,
    setShowAdvancedFilters,
    setShowFavoritesOnly,
    setSortMode,
    setTagInput,
    setTitle,
    setUrlCheckMessage,
    setUrlCheckStatus,
    shouldShowLogin,
    showAdvancedFilters,
    showFavoritesOnly,
    signalRankByProjectId,
    sortMode,
    stats,
    switchView,
    tagInput,
    tagOptions,
    targetGapRate,
    testAccountsByRole,
    title,
    toggleFavorite,
    updateRevenueInput,
    updateRevenueTargetInput,
    updateScenarioMultiplier,
    urlCheckMessage,
    urlCheckStatus,
    visibleProjects,
  } = useProtoLiveApp()

  // 운영 콘솔 패밀리(대시보드 + 토론/회원 서브). 헤더 탭 활성/타이틀에 함께 쓴다.
  const isAnyAdminView = isAdminView || isAdminCommunityView || isAdminMembersView

  // 뷰별 문서 타이틀 + 뷰 전환 시 보조기술 안내(aria-live). 첫 진입은 announce 를 건너뛴다.
  const [viewAnnouncement, setViewAnnouncement] = useState('')
  const hasAnnouncedRef = useRef(false)
  useEffect(() => {
    const label = isAdminView
      ? '운영 콘솔'
      : isAdminCommunityView
        ? '커뮤니티 모더레이션'
        : isAdminMembersView
          ? '회원 관리'
          : isAboutView
            ? '소개'
            : isSupportView
              ? '문의하기'
              : isMessagesView
                ? '쪽지함'
                : activePolicyView
                  ? POLICY_PAGES[activePolicyView].label
                  : '프로토타입 마켓'
    document.title = `${label} · ProtoLive`
    if (!hasAnnouncedRef.current) {
      hasAnnouncedRef.current = true
      return
    }
    setViewAnnouncement(`${label} 화면으로 전환했습니다`)
  }, [
    isAdminView,
    isAdminCommunityView,
    isAdminMembersView,
    isAboutView,
    isSupportView,
    isMessagesView,
    activePolicyView,
  ])

  return (
    <div className="protolive-shell min-h-screen bg-base text-stone-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cyan-300 focus:px-4 focus:py-2 focus:font-bold focus:text-slate-950"
      >
        메인 콘텐츠로 건너뛰기
      </a>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {viewAnnouncement}
      </p>

      <ToastContainer />

      <header className="protolive-header sticky top-0 z-40 border-b bg-base/85 backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={goHome}
              aria-label="ProtoLive 홈으로"
              className="protolive-logo grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-lime-300 text-slate-950 shadow-[0_0_0_1px_oklch(89%_0.18_125/0.25)] transition hover:bg-lime-200"
            >
              <Zap className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="protolive-title text-xl font-black tracking-tight text-stone-50">
                  ProtoLive
                </h1>
                <span className="protolive-badge whitespace-nowrap rounded-full border border-lime-400/30 bg-lime-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
                  공유·피드백·투자
                </span>
              </div>
              {/* 640~1023px: nowrap 부제가 max-content로 브랜드 존을 키워 우측 액션 존을
                  짓누르지 않게 중간 구간도 16rem으로 캡(<768은 CSS가 동일 값 적용). */}
              <p className="protolive-subtitle max-w-64 truncate text-xs font-medium text-stone-400 lg:max-w-none">
                {isAdminView
                  ? '바이브코딩 커뮤니티의 수익·운영 지표를 관리하는 관리자 대시보드'
                  : isAboutView
                    ? '바이브코딩으로 만든 웹앱을 살아있는 채로 공유하고 피드백받는 커뮤니티'
                    : '바이브코딩으로 만든 사이트를 올리고 커뮤니티 피드백과 투자 관심을 받으세요'}
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-1 sm:justify-end lg:flex-nowrap">
            {canAccessAdmin ? (
              // shrink 허용: 중간 폭에서 액션 존보다 길어지면 밀어내는 대신
              // min-w-0 + overflow-x-auto로 내부 스크롤된다.
              <div className="protolive-pill-group order-last flex w-full min-w-0 items-center gap-2 overflow-x-auto rounded-lg border border-stone-700/80 bg-stone-900/70 px-2 py-2 text-xs font-bold sm:order-none sm:w-auto sm:rounded-full sm:px-3">
                <button
                  type="button"
                  onClick={() => switchView('market')}
                  className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                    isAnyAdminView
                      ? 'text-stone-400 hover:text-stone-100'
                      : 'bg-cyan-300 text-slate-950'
                  }`}
                >
                  프로토타입 둘러보기
                </button>
                <button
                  type="button"
                  onClick={() => openAdminArea('admin')}
                  className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                    isAdminView
                      ? 'bg-cyan-300 text-slate-950'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  운영 현황
                </button>
                <button
                  type="button"
                  onClick={() => openAdminArea('adminCommunity')}
                  className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                    isAdminCommunityView
                      ? 'bg-cyan-300 text-slate-950'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  커뮤니티
                </button>
                <button
                  type="button"
                  onClick={() => openAdminArea('adminMembers')}
                  className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                    isAdminMembersView
                      ? 'bg-cyan-300 text-slate-950'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  회원
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={isAboutView ? goHome : openAbout}
              aria-pressed={isAboutView}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-xs font-black transition sm:rounded-full ${
                isAboutView
                  ? 'border-lime-300/50 bg-lime-300/10 text-lime-100'
                  : 'border-stone-700/80 bg-stone-900/70 text-stone-300 hover:border-lime-300/40 hover:text-lime-100'
              }`}
            >
              소개
            </button>
            <div
              className={`protolive-status hidden shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold xl:flex ${
                apiOnline
                  ? 'border-lime-400/30 bg-lime-300/10 text-lime-200'
                  : 'border-red-400/30 bg-red-500/10 text-red-200'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${apiOnline ? 'bg-lime-300' : 'bg-red-300'}`}
              />
              {apiOnline ? '서버 연결됨' : 'API Offline'}
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={openMessages}
                aria-pressed={isMessagesView}
                aria-label={
                  messageUnreadCount > 0 ? `쪽지함, 새 쪽지 ${messageUnreadCount}건` : '쪽지함'
                }
                className={`relative grid min-h-11 min-w-11 place-items-center rounded-lg border text-xs font-black transition sm:rounded-full ${
                  isMessagesView
                    ? 'border-lime-300/50 bg-lime-300/10 text-lime-100'
                    : 'border-stone-700/80 bg-stone-900/70 text-stone-300 hover:border-lime-300/40 hover:text-lime-100'
                }`}
              >
                <Mail className="h-4 w-4" />
                {messageUnreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-cyan-300 px-1 text-[10px] font-black text-slate-950">
                    {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                  </span>
                ) : null}
                <span className="sr-only">쪽지함</span>
              </button>
            ) : null}
            {isAuthenticated ? (
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadNotificationCount}
                onMarkAllRead={markAllNotificationsRead}
                onOpen={openNotification}
              />
            ) : null}
            {isAuthenticated ? (
              <div className="protolive-user-chip inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-stone-700/80 bg-stone-900/70 px-3 py-2 text-xs font-black sm:rounded-full">
                <span className="hidden max-w-28 truncate xl:inline">{session?.name}</span>
                <span
                  className={`protolive-badge shrink-0 rounded-full border px-2 py-0.5 ${
                    canAccessAdmin
                      ? 'border-lime-300/40 text-lime-200'
                      : 'border-amber-300/40 text-amber-100'
                  }`}
                >
                  {session ? resolveRoleLabel(session.role) : ''}
                </span>
                <button
                  type="button"
                  onClick={() => handleLogout()}
                  className="protolive-pill shrink-0 whitespace-nowrap rounded-full border border-stone-600/70 px-2 py-0.5 text-stone-300 transition hover:border-red-300/60 hover:text-red-100"
                  aria-label="로그아웃"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="protolive-btn-grid grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 px-3 text-xs font-black text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                aria-label="로그인"
              >
                <Users className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">로그인</span>
                <span className="sr-only">로그인</span>
              </button>
            )}
            {canAccessAdmin ? (
              <button
                type="button"
                onClick={() => void handleRefreshAll()}
                disabled={isRefreshing || !apiOnline || projects.length === 0}
                className="protolive-btn-grid grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="전체 사이트 상태 새로고침"
                title="전체 사이트 상태 새로고침 (⌘/Ctrl + R)"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            ) : null}
            {!isAuthenticated || canSubmitProject ? (
              <button
                type="button"
                onClick={openSubmitDialog}
                disabled={!apiOnline || config.categories.length === 0}
                aria-label={isAuthenticated ? '프로토타입 등록' : '프로토타입 등록 (로그인 필요)'}
                title={
                  isAuthenticated
                    ? '프로토타입 등록 (⌘/Ctrl + N)'
                    : '로그인하면 바로 등록할 수 있어요'
                }
                className="protolive-btn protolive-btn-primary inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-lime-300 px-3 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline">프로토타입 등록</span>
              </button>
            ) : null}
            <span className="hidden shrink-0 text-[10px] text-stone-500 2xl:block">
              단축키: / 검색{canSubmitProject ? ' · ⌘/Ctrl + N 등록' : ''}
              {canAccessAdmin ? ' · ⌘/Ctrl + R 갱신' : ''}
            </span>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="protolive-main mx-auto grid max-w-7xl gap-6 px-4 py-6 outline-none sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8"
      >
        {/* 라우트 청크가 내려오는 동안 본문 자리에 스켈레톤을 유지한다(레이아웃 점프 방지). */}
        <Suspense fallback={<RouteFallback />}>
          {makerProfileId ? (
            <MakerProfileView
              profile={makerProfile}
              isLoading={isMakerProfileLoading}
              onBack={closeMakerProfile}
              onOpenProject={openProjectDetail}
            />
          ) : isAboutView ? (
            <div className="lg:col-span-2">
              <AboutView onCreate={openSubmitDialog} onBrowse={goHome} />
            </div>
          ) : activePolicyView ? (
            <div className="lg:col-span-2">
              <PolicyView view={activePolicyView} />
            </div>
          ) : isSupportView ? (
            <div className="lg:col-span-2">
              <SupportView
                contactEmail={session?.email}
                originUrl={typeof window !== 'undefined' ? window.location.href : ''}
              />
            </div>
          ) : isMessagesView ? (
            <div className="lg:col-span-2">
              <MessagesView
                session={session}
                activeConversationId={conversationId}
                onOpenConversation={openConversation}
                onCloseConversation={closeConversation}
                onUnreadChange={setMessageUnreadCount}
              />
            </div>
          ) : isAdminCommunityView ? (
            <AdminCommunityView />
          ) : isAdminMembersView ? (
            <AdminMembersView />
          ) : activeDiscussionRoute && detailProjectId !== null ? (
            <div className="lg:col-span-2">
              <DiscussionHub
                projectId={detailProjectId}
                route={activeDiscussionRoute}
                session={session}
                onRequireLogin={() => setIsLoginOpen(true)}
                onNavigateList={() => openDiscussionList(detailProjectId)}
                onNavigateNew={() => openDiscussionNew(detailProjectId)}
                onNavigateDetail={(discussionId) =>
                  openDiscussionDetail(detailProjectId, discussionId)
                }
                onBackToProject={() => closeDiscussions(detailProjectId)}
              />
            </div>
          ) : isAdminView ? (
            <AdminDashboardView
              adminDashboard={adminDashboard}
              adminDashboardError={adminDashboardError}
              adminReportedReviews={adminReportedReviews}
              adminAuditLogs={adminAuditLogs}
              moderatingReviewId={moderatingReviewId}
              recommendationSummary={recommendationSummary}
              orderedAdminRecommendations={orderedAdminRecommendations}
              isApplyingAllAdminRecommendations={isApplyingAllAdminRecommendations}
              adminRevenueConfig={adminRevenueConfig}
              adminScenarioMultipliers={adminScenarioMultipliers}
              adminRevenueTargetMonthly={adminRevenueTargetMonthly}
              adminRevenueProjectionParams={adminRevenueProjectionParams}
              revenueProjection={revenueProjection}
              adminRevenueTargetGap={adminRevenueTargetGap}
              targetGapRate={targetGapRate}
              adminRevenueHealthScore={adminRevenueHealthScore}
              adminRevenueHealthTone={adminRevenueHealthTone}
              adminTrendMetrics={adminTrendMetrics}
              isAdminDashboardAvailable={isAdminDashboardAvailable}
              onModerateReview={(entry, action) => void handleModerateReview(entry, action)}
              onApplyAllRecommendations={applyAllAdminRecommendations}
              onApplyRecommendation={applyAdminRecommendation}
              onCopyRevenueSnapshot={copyAdminRevenueSnapshot}
              onExportRevenueReport={exportAdminRevenueReport}
              onApplyObservedConversionRates={applyObservedConversionRates}
              onApplyRevenueModelPreset={applyRevenueModelPreset}
              onResetScenarioMultipliers={resetAdminScenarioMultipliers}
              onScenarioMultiplierChange={updateScenarioMultiplier}
              onRevenueTargetChange={updateRevenueTargetInput}
              onRevenueInputChange={updateRevenueInput}
              challenge={config.challenge ?? null}
              onSetChallenge={(title, description, endsAt) =>
                void handleSetChallenge(title, description, endsAt)
              }
            />
          ) : (
            <MarketView
              apiOnline={apiOnline}
              stats={stats}
              config={config}
              isInitialLoading={isInitialLoading}
              loadError={loadError}
              fastestResponseProject={fastestResponseProject}
              averageSignalDensity={averageSignalDensity}
              detailProjectId={detailProjectId}
              detailProject={detailProject}
              isDetailUnavailable={isDetailUnavailable}
              diligenceEvents={diligenceEvents}
              projectReviews={projectReviews}
              projectLog={projectLog}
              isProjectLogLoading={isProjectLogLoading}
              logBody={logBody}
              onLogBodyChange={setLogBody}
              onSubmitLog={handleSubmitLog}
              isSubmittingLog={isSubmittingLog}
              session={session}
              isDiligenceEventsLoading={isDiligenceEventsLoading}
              isProjectReviewsLoading={isProjectReviewsLoading}
              reviewType={reviewType}
              reviewRating={reviewRating}
              reviewBody={reviewBody}
              replyToReview={replyToReview}
              isSendingReview={isSendingReview}
              reportingReviewId={reportingReviewId}
              canRefreshProject={canRefreshProject}
              searchInputRef={searchInputRef}
              categoryOptions={categoryOptions}
              tagOptions={tagOptions}
              accessModeOptions={accessModeOptions}
              selectedCategory={selectedCategory}
              selectedTag={selectedTag}
              selectedAccessMode={selectedAccessMode}
              searchQuery={searchQuery}
              sortMode={sortMode}
              projectListView={projectListView}
              onlyVerified={onlyVerified}
              minSignal={minSignal}
              minFundingAmount={minFundingAmount}
              maxFundingAmount={maxFundingAmount}
              showFavoritesOnly={showFavoritesOnly}
              showAdvancedFilters={showAdvancedFilters}
              hasFundingRangeError={hasFundingRangeError}
              favoriteProjectCount={favoriteProjectCount}
              favoriteProjectIds={favoriteProjectIds}
              upvotedProjectIds={upvotedProjectIds}
              pageSize={pageSize}
              projectMeta={projectMeta}
              activeFilters={activeFilters}
              activeFilterCount={activeFilterCount}
              visibleProjects={visibleProjects}
              signalRankByProjectId={signalRankByProjectId}
              onBack={closeProjectDetail}
              onDetailPreview={() => {
                if (detailProject) void handleOpenPreview(detailProject)
              }}
              onDetailMatch={() => {
                if (detailProject) void handleOpenMatchDialog(detailProject)
              }}
              onDetailRefresh={() => {
                if (detailProject) void handleRefreshProject(detailProject)
              }}
              onDetailOutbound={() => {
                if (detailProject) void handleProjectEvent(detailProject, 'outbound')
              }}
              onSubmitReview={handleSubmitReview}
              onReviewTypeChange={setReviewType}
              onReviewRatingChange={setReviewRating}
              onReviewBodyChange={setReviewBody}
              onReplyTo={setReplyToReview}
              onCancelReply={() => setReplyToReview(null)}
              onReportReview={(review) => void handleReportReview(review)}
              onDetailLogin={() => {
                closeReviewDialog()
                setIsLoginOpen(true)
              }}
              onSelectCategory={(item) => {
                setSelectedCategory(item)
                setPage(1)
              }}
              onSelectTag={(item) => {
                setSelectedTag(item)
                setPage(1)
              }}
              onSelectAccessMode={(item) => {
                setSelectedAccessMode(item)
                setPage(1)
              }}
              onSearchChange={(value) => {
                setPage(1)
                setSearchQuery(value)
              }}
              onToggleAdvancedFilters={() => setShowAdvancedFilters((value: boolean) => !value)}
              onProjectListViewChange={setProjectListView}
              onSortSignal={() => {
                setSortMode('signal')
                setPage(1)
              }}
              onSortUpvotes={() => {
                setSortMode('upvotes')
                setPage(1)
              }}
              onSortRecentClean={() => {
                setSortMode('recent')
                setOnlyVerified(false)
                setMinSignal(0)
                setPage(1)
              }}
              onSortFunding={() => {
                setSortMode('funding')
                setPage(1)
              }}
              onToggleOnlyVerified={() => {
                setOnlyVerified((current) => !current)
                setPage(1)
              }}
              onToggleFavoritesOnly={() => {
                if (favoriteProjectCount > 0) {
                  setShowFavoritesOnly((value) => !value)
                  setPage(1)
                }
              }}
              onOnlyVerifiedChange={(value) => {
                setOnlyVerified(value)
                setPage(1)
              }}
              onMinSignalChange={(value) => {
                setMinSignal(value)
                setPage(1)
              }}
              onMinFundingAmountChange={(value) => {
                setMinFundingAmount(value)
                setPage(1)
              }}
              onMaxFundingAmountChange={(value) => {
                setMaxFundingAmount(value)
                setPage(1)
              }}
              onClearFundingRange={() => {
                setMinFundingAmount(0)
                setMaxFundingAmount(0)
                setPage(1)
              }}
              onApplyFundingRange={applyFundingRange}
              onToggleFavoritesOnlyAdvanced={() => {
                setShowFavoritesOnly((value) => !value)
                setPage(1)
              }}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
              onCopyFilterLink={() => void copyFilterLink()}
              onResetFilters={resetFilters}
              onPrevPage={() => setPage((value) => Math.max(1, value - 1))}
              onNextPage={() => setPage((value) => (projectMeta.hasNext ? value + 1 : value))}
              onCreate={openSubmitDialog}
              onOpenAbout={openAbout}
              onOpenDetail={openProjectDetail}
              onOpenMaker={openMakerProfile}
              onOpenDiscussions={
                detailProjectId !== null ? () => openDiscussionList(detailProjectId) : undefined
              }
              onToggleFavorite={toggleFavorite}
              onToggleUpvote={(project) => void handleToggleUpvote(project)}
              canFeature={canAccessAdmin}
              onToggleFeatured={(project) => void handleToggleFeatured(project)}
            />
          )}
        </Suspense>
      </main>

      {diligenceProject && (
        <ProjectDiligencePanel
          project={diligenceProject}
          events={diligenceEvents}
          isLoadingEvents={isDiligenceEventsLoading}
          signalRank={signalRankByProjectId.get(diligenceProject.id) ?? null}
          canRefresh={canRefreshProject(diligenceProject)}
          onClose={closeDiligence}
          onMatch={() => {
            const project = diligenceProject
            closeDiligence()
            handleOpenMatchDialog(project)
          }}
          onPreview={() => {
            const project = diligenceProject
            closeDiligence()
            void handleOpenPreview(project)
          }}
          onRefresh={() => {
            const project = diligenceProject
            void handleRefreshProject(project).then(() => loadDiligenceEvents(project.id))
          }}
        />
      )}

      {previewProject && (
        <PreviewModal
          project={previewProject}
          iframeKey={iframeKey}
          iframeLoading={iframeLoading}
          isMobileTimelineOpen={isMobileProjectTimelineOpen}
          previewEvents={previewEvents}
          isPreviewEventsLoading={isPreviewEventsLoading}
          onClose={closePreview}
          onRefresh={async () => {
            await handleProjectEvent(previewProject, 'refresh')
            await loadProjectEvents(previewProject.id)
            setIframeKey((current) => current + 1)
            setIframeLoading(true)
          }}
          onOutbound={() => {
            void handleProjectEvent(previewProject, 'outbound').then(() =>
              loadProjectEvents(previewProject.id)
            )
          }}
          onMatch={() => {
            setMatchingProject(previewProject)
            closePreview()
          }}
          onToggleTimeline={() => setIsMobileProjectTimelineOpen((value) => !value)}
          onIframeLoad={() => setIframeLoading(false)}
        />
      )}

      {reviewProject && (
        <ReviewModal
          project={reviewProject}
          reviews={projectReviews}
          isLoading={isProjectReviewsLoading}
          session={session}
          reviewType={reviewType}
          reviewRating={reviewRating}
          reviewBody={reviewBody}
          replyToReview={replyToReview}
          isSubmitting={isSendingReview}
          reportingReviewId={reportingReviewId}
          onClose={closeReviewDialog}
          onTypeChange={setReviewType}
          onRatingChange={setReviewRating}
          onBodyChange={setReviewBody}
          onReplyTo={setReplyToReview}
          onCancelReply={() => setReplyToReview(null)}
          onReportReview={(review) => void handleReportReview(review)}
          onLogin={() => {
            closeReviewDialog()
            setIsLoginOpen(true)
          }}
          onSubmit={handleSubmitReview}
        />
      )}

      {matchingProject && (
        <MatchModal
          project={matchingProject}
          config={config}
          fundingRangeId={fundingRangeId}
          matchMessage={matchMessage}
          matchLegalNoticeAccepted={matchLegalNoticeAccepted}
          matchPrivacyConsentAccepted={matchPrivacyConsentAccepted}
          matchRiskNoticeAccepted={matchRiskNoticeAccepted}
          isSendingMatch={isSendingMatch}
          onClose={() => {
            setMatchingProject(null)
            setMatchLegalNoticeAccepted(false)
            setMatchPrivacyConsentAccepted(false)
            setMatchRiskNoticeAccepted(false)
          }}
          onFundingRangeChange={setFundingRangeId}
          onMessageChange={setMatchMessage}
          onLegalNoticeChange={setMatchLegalNoticeAccepted}
          onPrivacyConsentChange={setMatchPrivacyConsentAccepted}
          onRiskNoticeChange={setMatchRiskNoticeAccepted}
          onSubmit={handleSubmitMatch}
        />
      )}

      {isSubmitOpen && (
        <SubmitProjectModal
          session={session}
          title={title}
          category={category}
          maturity={maturity}
          stack={stack}
          builtWith={builtWith}
          customToolsInput={customToolsInput}
          vibeCoded={vibeCoded}
          config={config}
          accessMode={accessMode}
          protectionNoticeAccepted={protectionNoticeAccepted}
          description={description}
          tagInput={tagInput}
          liveUrl={liveUrl}
          urlCheckStatus={urlCheckStatus}
          urlCheckMessage={urlCheckMessage}
          isSubmitting={isSubmitting}
          onClose={() => setIsSubmitOpen(false)}
          onTitleChange={setTitle}
          onCategoryChange={setCategory}
          onMaturityChange={setMaturity}
          onStackChange={setStack}
          onToggleBuildTool={toggleBuildTool}
          onCustomToolsInputChange={setCustomToolsInput}
          onVibeCodedChange={setVibeCoded}
          onAccessModeChange={setAccessMode}
          onProtectionNoticeChange={setProtectionNoticeAccepted}
          onDescriptionChange={setDescription}
          onTagInputChange={setTagInput}
          onLiveUrlChange={(value) => {
            setLiveUrl(value)
            setUrlCheckStatus('idle')
            setUrlCheckMessage('')
          }}
          onVerifyUrl={() => void handleVerifyUrl()}
          onSubmit={handleSubmitProject}
        />
      )}

      {shouldShowLogin && (
        <LoginModal
          loginEmail={loginEmail}
          loginPassword={loginPassword}
          testAccountsByRole={testAccountsByRole}
          onClose={() => setIsLoginOpen(false)}
          onEmailChange={setLoginEmail}
          onPasswordChange={setLoginPassword}
          onQuickFill={(account) => {
            setLoginEmail(account.email)
            setLoginPassword(account.password)
          }}
          onSubmit={handleLogin}
          googleClientId={config.googleClientId ?? null}
          onGoogleCredential={handleGoogleLogin}
        />
      )}

      <footer className="protolive-footer border-t border-stone-800/70 bg-stone-950 px-4 py-4 text-xs text-stone-300 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 text-center sm:justify-between">
          <span>ProtoLive © TermsDesk 포트폴리오</span>
          <nav aria-label="법적 고지 링크" className="flex flex-wrap justify-center gap-4">
            {/* 약관/개인정보처리방침은 내부 페이지(TermsDesk 게시본 렌더). 지원 보드만 외부 유지. */}
            <a
              href={routePath.policy('terms')}
              onClick={(event) => {
                // cmd/ctrl/shift 클릭(새 탭·새 창)은 브라우저 기본 동작에 맡긴다.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                openPolicy('terms')
              }}
              className="hover:text-stone-100"
            >
              이용약관
            </a>
            <a
              href={routePath.policy('privacy')}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                openPolicy('privacy')
              }}
              className="hover:text-stone-100"
            >
              개인정보처리방침
            </a>
            <a
              href={routePath.support()}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                openSupport()
              }}
              className="hover:text-stone-100"
            >
              문의
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
