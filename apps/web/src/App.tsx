import { useEffect, useRef, useState } from 'react'
import { Plus, RefreshCw, Zap, Users } from 'lucide-react'
import { resolveRoleLabel } from './local-auth'
import ToastContainer from './components/ToastContainer'
import { ProjectDiligencePanel } from './components/ProjectDiligencePanel'
import { AdminDashboardView } from './components/pages/AdminDashboardView'
import { MarketView } from './components/pages/MarketView'
import { LoginModal } from './components/modals/LoginModal'
import { MatchModal } from './components/modals/MatchModal'
import { SubmitProjectModal } from './components/modals/SubmitProjectModal'
import { ReviewModal } from './components/modals/ReviewModal'
import { PreviewModal } from './components/modals/PreviewModal'
import { useProtoLiveApp } from './state/useProtoLiveApp'

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
    canRefreshProject,
    category,
    categoryOptions,
    closeDiligence,
    closePreview,
    closeProjectDetail,
    closeReviewDialog,
    config,
    copyAdminRevenueSnapshot,
    copyFilterLink,
    description,
    detailProject,
    detailProjectId,
    diligenceDialogRef,
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
    loginModalRef,
    loginPassword,
    matchLegalNoticeAccepted,
    matchMessage,
    matchModalRef,
    matchPrivacyConsentAccepted,
    matchRiskNoticeAccepted,
    matchingProject,
    maxFundingAmount,
    minFundingAmount,
    minSignal,
    moderatingReviewId,
    onlyVerified,
    openProjectDetail,
    openSubmitDialog,
    orderedAdminRecommendations,
    pageSize,
    previewDialogRef,
    previewEvents,
    previewProject,
    projectListView,
    projectMeta,
    projectReviews,
    projects,
    protectedProjectCount,
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
    publicProjectCount,
    recommendationSummary,
    replyToReview,
    reportingReviewId,
    resetAdminScenarioMultipliers,
    resetFilters,
    revenueProjection,
    reviewBody,
    reviewModalRef,
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
    submitModalRef,
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

  // 뷰별 문서 타이틀 + 뷰 전환 시 보조기술 안내(aria-live). 첫 진입은 announce 를 건너뛴다.
  const [viewAnnouncement, setViewAnnouncement] = useState('')
  const hasAnnouncedRef = useRef(false)
  useEffect(() => {
    const label = isAdminView ? '운영 콘솔' : '프로토타입 마켓'
    document.title = `${label} · ProtoLive`
    if (!hasAnnouncedRef.current) {
      hasAnnouncedRef.current = true
      return
    }
    setViewAnnouncement(`${label} 화면으로 전환했습니다`)
  }, [isAdminView])

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
            <div className="protolive-logo grid h-11 w-11 place-items-center rounded-lg bg-lime-300 text-slate-950 shadow-[0_0_0_1px_oklch(89%_0.18_125/0.25)]">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="protolive-title text-xl font-black tracking-tight text-stone-50">
                  ProtoLive
                </h1>
                <span className="protolive-badge rounded-full border border-lime-400/30 bg-lime-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
                  평가·리뷰·투자
                </span>
              </div>
              <p className="protolive-subtitle truncate text-xs font-medium text-stone-400">
                {isAdminView
                  ? '프로토타입 투자 연결 플랫폼의 수익·운영 지표를 관리하는 관리자 대시보드'
                  : '만든 사이트를 올리면 평가와 리뷰를 거쳐 투자 관심까지 이어집니다'}
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-1 sm:justify-end lg:flex-nowrap">
            <div className="protolive-pill-group order-last flex w-full min-w-0 shrink-0 items-center gap-2 overflow-x-auto rounded-lg border border-stone-700/80 bg-stone-900/70 px-2 py-2 text-xs font-bold sm:order-none sm:w-auto sm:rounded-full sm:px-3">
              <button
                type="button"
                onClick={() => switchView('market')}
                className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                  isAdminView ? 'text-stone-400 hover:text-stone-100' : 'bg-cyan-300 text-slate-950'
                }`}
              >
                프로토타입 둘러보기
              </button>
              <button
                type="button"
                onClick={() => switchView('admin')}
                className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                  isAdminView ? 'bg-cyan-300 text-slate-950' : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                운영 현황
              </button>
            </div>
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
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
              disabled={isRefreshing || !apiOnline || projects.length === 0 || !canAccessAdmin}
              className="protolive-btn-grid grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="전체 사이트 상태 새로고침"
              title={
                canAccessAdmin
                  ? '전체 사이트 상태 새로고침 (⌘/Ctrl + R)'
                  : '운영자 계정에서만 전체 갱신 가능'
              }
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={openSubmitDialog}
              disabled={!apiOnline || config.categories.length === 0}
              aria-label="프로토타입 등록"
              title="프로토타입 등록 (⌘/Ctrl + N)"
              className="protolive-btn protolive-btn-primary inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-lime-300 px-3 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">프로토타입 등록</span>
            </button>
            <span className="hidden shrink-0 text-[10px] text-stone-500 2xl:block">
              단축키: / 검색 · ⌘/Ctrl + N 등록 · ⌘/Ctrl + R 갱신
            </span>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="protolive-main mx-auto grid max-w-7xl gap-6 px-4 py-6 outline-none sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8"
      >
        {isAdminView ? (
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
          />
        ) : (
          <MarketView
            apiOnline={apiOnline}
            stats={stats}
            config={config}
            isInitialLoading={isInitialLoading}
            loadError={loadError}
            protectedProjectCount={protectedProjectCount}
            publicProjectCount={publicProjectCount}
            fastestResponseProject={fastestResponseProject}
            averageSignalDensity={averageSignalDensity}
            detailProjectId={detailProjectId}
            detailProject={detailProject}
            diligenceEvents={diligenceEvents}
            projectReviews={projectReviews}
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
            onOpenDetail={openProjectDetail}
            onToggleFavorite={toggleFavorite}
            onToggleUpvote={(project) => void handleToggleUpvote(project)}
            canFeature={canAccessAdmin}
            onToggleFeatured={(project) => void handleToggleFeatured(project)}
          />
        )}
      </main>

      {diligenceProject && (
        <ProjectDiligencePanel
          project={diligenceProject}
          events={diligenceEvents}
          isLoadingEvents={isDiligenceEventsLoading}
          dialogRef={diligenceDialogRef}
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
          dialogRef={previewDialogRef}
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
          dialogRef={reviewModalRef}
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
          dialogRef={matchModalRef}
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
          dialogRef={submitModalRef}
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
          dialogRef={loginModalRef}
          onClose={() => setIsLoginOpen(false)}
          onEmailChange={setLoginEmail}
          onPasswordChange={setLoginPassword}
          onQuickFill={(account) => {
            setLoginEmail(account.email)
            setLoginPassword(account.password)
          }}
          onSubmit={handleLogin}
        />
      )}
    </div>
  )
}
