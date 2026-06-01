import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import ConfirmDialog from '../../../shared/components/feedback/ConfirmDialog.tsx'
import ApplicationModal from '../components/ApplicationModal.tsx'
import ApplicationsHeader from '../components/ApplicationsHeader.tsx'
import ApplicationsTable from '../components/ApplicationsTable.tsx'
import PaginationBar from '../components/PaginationBar.tsx'
import SearchAndFilters from '../components/SearchAndFilters.tsx'
import { PAGE_SIZE, useApplicationsPage } from '../hooks/useApplicationsPage.ts'
import { exportCsv } from '../utils.ts'

const ApplicationsPage = () => {
  const navigate = useNavigate()
  const page = useApplicationsPage()
  const { isLoading, isError, isFetching } = page.applicationsQuery

  return (
    <div className="space-y-6">
      <ApplicationsHeader
        total={page.total}
        selectedCount={page.selectedIds.size}
        onBulkDelete={() => page.setBulkDeleteOpen(true)}
        onExport={() => exportCsv(page.applications)}
        onAdd={() => page.setAddOpen(true)}
        disableExport={page.applications.length === 0}
      />

      <SearchAndFilters
        search={page.search}
        onSearchChange={page.setSearchAndResetPage}
        statusFilter={page.statusFilter}
        onStatusChange={page.changeFilter}
      />

      {isLoading && <LoadingSpinner size="lg" message="Loading applications..." />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load applications.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <ApplicationsTable
          applications={page.applications}
          selectedIds={page.selectedIds}
          allOnPageSelected={page.allOnPageSelected}
          onToggleSelectAll={page.toggleSelectAll}
          onToggleSelect={page.toggleSelect}
          onEdit={page.setEditApp}
          onDelete={page.setDeleteTarget}
          onRowClick={(id) => navigate(`/applications/${id}`)}
          dimmed={isFetching}
        />
      )}

      {!isLoading && !isError && (
        <PaginationBar
          page={page.page}
          totalPages={page.totalPages}
          total={page.total}
          pageSize={PAGE_SIZE}
          onPageChange={page.setPage}
        />
      )}

      <ApplicationModal
        open={page.addOpen}
        onClose={() => page.setAddOpen(false)}
        onSubmit={(data) => page.addMutation.mutate(data)}
        loading={page.addMutation.isPending}
      />

      <ApplicationModal
        open={!!page.editApp}
        initial={page.editApp}
        onClose={() => page.setEditApp(null)}
        onSubmit={(data) => page.editMutation.mutate(data)}
        loading={page.editMutation.isPending}
      />

      <ConfirmDialog
        open={!!page.deleteTarget}
        title="Delete Application"
        description={
          page.deleteTarget
            ? `Delete ${page.deleteTarget.company_name} - ${page.deleteTarget.role_title ?? 'Unknown Role'}? This cannot be undone.`
            : ''
        }
        onConfirm={() => page.deleteTarget && page.deleteMutation.mutate(page.deleteTarget.id)}
        onCancel={() => page.setDeleteTarget(null)}
        loading={page.deleteMutation.isPending}
      />

      <ConfirmDialog
        open={page.bulkDeleteOpen}
        title={`Delete ${page.selectedIds.size} Applications`}
        description={`This will permanently delete ${page.selectedIds.size} application${page.selectedIds.size !== 1 ? 's' : ''}. This cannot be undone.`}
        confirmLabel={`Delete ${page.selectedIds.size}`}
        onConfirm={() => page.bulkDeleteMutation.mutate(Array.from(page.selectedIds))}
        onCancel={() => page.setBulkDeleteOpen(false)}
        loading={page.bulkDeleteMutation.isPending}
      />
    </div>
  )
}

export default ApplicationsPage
