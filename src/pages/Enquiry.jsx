import { useEffect, useMemo, useState } from 'react'
import { enquiries } from '../api/client'
import './Enquiry.css'

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_CLASS = {
  new: 'status-new',
  contacted: 'status-contacted',
  'in-progress': 'status-progress',
  converted: 'status-converted',
  closed: 'status-closed',
}

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data

  if (Array.isArray(data?.enquiries)) {
    return data.enquiries
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  return []
}

function normalizeSingleResponse(data) {
  if (data?.enquiry) return data.enquiry
  if (data?.data) return data.data
  return data
}

export default function Enquiry() {
  const [enquiryList, setEnquiryList] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedEnquiry, setSelectedEnquiry] = useState(null)

  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // ------------------------------------------------------------
  // LOAD ENQUIRIES
  // ------------------------------------------------------------

  const loadEnquiries = async (showRefresh = false) => {
    try {
      setError('')

      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const data = await enquiries.list()

      setEnquiryList(normalizeListResponse(data))
    } catch (err) {
      console.error('Failed to load enquiries:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load enquiries.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadEnquiries()
  }, [])

  // ------------------------------------------------------------
  // FILTER
  // ------------------------------------------------------------

  const filteredEnquiries = useMemo(() => {
    const query = search.trim().toLowerCase()

    return enquiryList.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (item.status || 'new') === statusFilter

      if (!matchesStatus) return false

      if (!query) return true

      return [
        item.ref,
        item.name,
        item.email,
        item.phone,
        item.weave,
        item.occasion,
        item.budget,
        item.timeline,
        item.notes,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    })
  }, [enquiryList, search, statusFilter])

  // ------------------------------------------------------------
  // COUNTS
  // ------------------------------------------------------------

  const statusCounts = useMemo(() => {
    return {
      all: enquiryList.length,

      new: enquiryList.filter(
        (item) => (item.status || 'new') === 'new'
      ).length,

      contacted: enquiryList.filter(
        (item) => item.status === 'contacted'
      ).length,

      'in-progress': enquiryList.filter(
        (item) => item.status === 'in-progress'
      ).length,

      converted: enquiryList.filter(
        (item) => item.status === 'converted'
      ).length,

      closed: enquiryList.filter(
        (item) => item.status === 'closed'
      ).length,
    }
  }, [enquiryList])

  // ------------------------------------------------------------
  // UPDATE STATUS
  // ------------------------------------------------------------

  const handleStatusChange = async (id, status) => {
    try {
      setUpdatingId(id)

      const response = await enquiries.update(id, { status })

      const updated = normalizeSingleResponse(response)

      setEnquiryList((current) =>
        current.map((item) =>
          item._id === id
            ? {
                ...item,
                ...(updated || {}),
                status,
              }
            : item
        )
      )

      setSelectedEnquiry((current) =>
        current?._id === id
          ? {
              ...current,
              ...(updated || {}),
              status,
            }
          : current
      )
    } catch (err) {
      console.error('Failed to update enquiry:', err)

      alert(
        err instanceof Error
          ? err.message
          : 'Failed to update enquiry.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  // ------------------------------------------------------------
  // DELETE
  // ------------------------------------------------------------

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this enquiry? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      setDeletingId(id)

      await enquiries.remove(id)

      setEnquiryList((current) =>
        current.filter((item) => item._id !== id)
      )

      if (selectedEnquiry?._id === id) {
        setSelectedEnquiry(null)
      }
    } catch (err) {
      console.error('Failed to delete enquiry:', err)

      alert(
        err instanceof Error
          ? err.message
          : 'Failed to delete enquiry.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ------------------------------------------------------------
  // DATE FORMAT
  // ------------------------------------------------------------

  const formatDate = (date) => {
    if (!date) return '-'

    const parsed = new Date(date)

    if (Number.isNaN(parsed.getTime())) {
      return '-'
    }

    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (date) => {
    if (!date) return '-'

    const parsed = new Date(date)

    if (Number.isNaN(parsed.getTime())) {
      return '-'
    }

    return parsed.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <div className="enquiry-page">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="enquiry-header">
        <div className="enquiry-header-content">

          <div>
            <h1>Enquiries</h1>

            <p>
              Bespoke, appointment and interior consultation enquiries from the website.
            </p>
          </div>

          <button
            type="button"
            className="enquiry-refresh-btn"
            onClick={() => loadEnquiries(true)}
            disabled={refreshing}
          >
            <RefreshIcon spinning={refreshing} />

            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

        </div>
      </div>

      {/* ======================================================
          SUMMARY CARDS
          ====================================================== */}

      <div className="enquiry-summary-grid">

        <SummaryCard
          label="All"
          count={statusCounts.all}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />

        <SummaryCard
          label="New"
          count={statusCounts.new}
          active={statusFilter === 'new'}
          onClick={() => setStatusFilter('new')}
          type="new"
        />

        <SummaryCard
          label="Contacted"
          count={statusCounts.contacted}
          active={statusFilter === 'contacted'}
          onClick={() => setStatusFilter('contacted')}
          type="contacted"
        />

        <SummaryCard
          label="In Progress"
          count={statusCounts['in-progress']}
          active={statusFilter === 'in-progress'}
          onClick={() => setStatusFilter('in-progress')}
          type="progress"
        />

        <SummaryCard
          label="Converted"
          count={statusCounts.converted}
          active={statusFilter === 'converted'}
          onClick={() => setStatusFilter('converted')}
          type="converted"
        />

        <SummaryCard
          label="Closed"
          count={statusCounts.closed}
          active={statusFilter === 'closed'}
          onClick={() => setStatusFilter('closed')}
          type="closed"
        />

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="enquiry-error">
          <div className="enquiry-error-message">
            <ErrorIcon />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => loadEnquiries()}
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================================
          FILTERS
          ====================================================== */}

      <div className="enquiry-filters">

        <div className="enquiry-filter-row">

          <div className="enquiry-search-wrapper">
            <SearchIcon />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone or reference..."
              className="enquiry-search-input"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="enquiry-status-filter"
          >
            <option value="all">
              All Statuses
            </option>

            {STATUS_OPTIONS.map((status) => (
              <option
                key={status.value}
                value={status.value}
              >
                {status.label}
              </option>
            ))}
          </select>

        </div>

        <div className="enquiry-results-info">
          Showing <strong>{filteredEnquiries.length}</strong> of{' '}
          <strong>{enquiryList.length}</strong> enquiries
        </div>

      </div>

      {/* ======================================================
          CONTENT
          ====================================================== */}

      {loading ? (
        <LoadingState />
      ) : filteredEnquiries.length === 0 ? (
        <EmptyState
          hasFilters={
            Boolean(search) ||
            statusFilter !== 'all'
          }
          onClear={() => {
            setSearch('')
            setStatusFilter('all')
          }}
        />
      ) : (
        <EnquiryTable
          enquiries={filteredEnquiries}
          updatingId={updatingId}
          deletingId={deletingId}
          onView={setSelectedEnquiry}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          formatDate={formatDate}
        />
      )}

      {/* ======================================================
          DETAILS MODAL
          ====================================================== */}

      {selectedEnquiry && (
        <EnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => setSelectedEnquiry(null)}
          onStatusChange={handleStatusChange}
          updating={updatingId === selectedEnquiry._id}
          formatDateTime={formatDateTime}
        />
      )}

    </div>
  )
}


/* ============================================================
   SUMMARY CARD
   ============================================================ */

function SummaryCard({
  label,
  count,
  active,
  onClick,
  type = 'all',
}) {
  return (
    <button
      type="button"
      className={`enquiry-summary-card ${
        active ? 'active' : ''
      } summary-${type}`}
      onClick={onClick}
    >
      <div className="summary-card-top">
        <span>{label}</span>

        <span className="summary-card-dot" />
      </div>

      <div className="summary-card-count">
        {count}
      </div>
    </button>
  )
}


/* ============================================================
   TABLE
   ============================================================ */

function EnquiryTable({
  enquiries,
  updatingId,
  deletingId,
  onView,
  onStatusChange,
  onDelete,
  formatDate,
}) {
  return (
    <div className="enquiry-table-card">

      <div className="enquiry-table-desktop">

        <table className="enquiry-table">

          <thead>
            <tr>
              <th>Enquiry</th>
              <th>Customer</th>
              <th>Requirement</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Date</th>
              <th className="action-column">Action</th>
            </tr>
          </thead>

          <tbody>
            {enquiries.map((item) => {
              const status = item.status || 'new'

              return (
                <tr key={item._id}>

                  {/* Reference */}
                  <td>
                    <div className="reference-badge">
                      {item.ref || '-'}
                    </div>

                    <div className="reference-sub">
                      Studio enquiry
                    </div>
                  </td>

                  {/* Customer */}
                  <td>
                    <div className="customer-cell">

                      <div className="customer-avatar">
                        {getInitials(item.name)}
                      </div>

                      <div className="customer-info">
                        <div className="customer-name">
                          {item.name || '-'}
                        </div>

                        {item.email && (
                          <div className="customer-email">
                            {item.email}
                          </div>
                        )}

                        {item.phone && (
                          <div className="customer-phone">
                            {item.phone}
                          </div>
                        )}
                      </div>

                    </div>
                  </td>

                  {/* Requirement */}
                  <td>
                    <div className="requirement-cell">

                      <div className="requirement-main">
                        {item.category || item.weave || '-'}
                      </div>

                      <div className="requirement-sub">
                        {item.occasion || 'Open to suggestions'}
                      </div>

                      {item.timeline && (
                        <div className="requirement-time">
                          {item.timeline}
                        </div>
                      )}

                    </div>
                  </td>

                  {/* Budget */}
                  <td>
                    <div className="budget-value">
                      {item.budget || '-'}
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <select
                      value={status}
                      disabled={updatingId === item._id}
                      onChange={(e) =>
                        onStatusChange(
                          item._id,
                          e.target.value
                        )
                      }
                      className={`enquiry-status-select ${
                        STATUS_CLASS[status] || STATUS_CLASS.new
                      }`}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Date */}
                  <td>
                    <div className="date-cell">
                      <div className="date-main">
                        {formatDate(item.createdAt)}
                      </div>

                      <div className="date-sub">
                        Submitted
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="action-column">
                    <div className="table-actions">

                      <button
                        type="button"
                        className="view-button"
                        onClick={() => onView(item)}
                      >
                        <EyeIcon />
                       
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        disabled={deletingId === item._id}
                        onClick={() => onDelete(item._id)}
                      >
                        <TrashIcon />
                        {/* {deletingId === item._id
                          ? 'Deleting...'
                          : 'Delete'} */}
                      </button>

                    </div>
                  </td>

                </tr>
              )
            })}
          </tbody>

        </table>

      </div>

      {/* Mobile cards */}

      <div className="enquiry-mobile-list">

        {enquiries.map((item) => {
          const status = item.status || 'new'

          return (
            <div
              key={item._id}
              className="enquiry-mobile-card"
            >

              <div className="mobile-card-header">

                <div>
                  <div className="reference-badge">
                    {item.ref || '-'}
                  </div>

                  <h3>
                    {item.name || '-'}
                  </h3>
                </div>

                <StatusBadge status={status} />

              </div>

              <div className="mobile-contact">

                {item.email && (
                  <span>
                    {item.email}
                  </span>
                )}

                {item.phone && (
                  <span>
                    {item.phone}
                  </span>
                )}

              </div>

              <div className="mobile-details">

                <InfoBox
                  label="Space"
                  value={item.occasion}
                />

                <InfoBox
                  label="Weave"
                  value={item.weave}
                />

                <InfoBox
                  label="Budget"
                  value={item.budget}
                />

                <InfoBox
                  label="Timeline"
                  value={item.timeline}
                />

              </div>

              <div className="mobile-actions">

                <button
                  type="button"
                  className="view-button"
                  onClick={() => onView(item)}
                >
                  <EyeIcon />
                  View Details
                </button>

                <select
                  value={status}
                  disabled={updatingId === item._id}
                  onChange={(e) =>
                    onStatusChange(
                      item._id,
                      e.target.value
                    )
                  }
                  className={`enquiry-status-select ${
                    STATUS_CLASS[status] || STATUS_CLASS.new
                  }`}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="delete-button"
                  disabled={deletingId === item._id}
                  onClick={() => onDelete(item._id)}
                >
                  <TrashIcon />
                  Delete
                </button>

              </div>

            </div>
          )
        })}

      </div>

    </div>
  )
}


/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({ status }) {
  const normalized = status || 'new'

  const option =
    STATUS_OPTIONS.find(
      (item) => item.value === normalized
    )

  return (
    <span
      className={`status-badge ${
        STATUS_CLASS[normalized] || STATUS_CLASS.new
      }`}
    >
      <span className="status-dot" />
      {option?.label || 'New'}
    </span>
  )
}


/* ============================================================
   INFO BOX
   ============================================================ */

function InfoBox({ label, value }) {
  return (
    <div className="mobile-info-box">
      <div className="mobile-info-label">
        {label}
      </div>

      <div className="mobile-info-value">
        {value || '-'}
      </div>
    </div>
  )
}


/* ============================================================
   LOADING
   ============================================================ */

function LoadingState() {
  return (
    <div className="enquiry-loading-card">

      <div className="loading-header">
        <div className="loading-line large" />
        <div className="loading-line medium" />
      </div>

      {[1, 2, 3, 4, 5].map((item) => (
        <div
          className="loading-row"
          key={item}
        >
          <div className="loading-block small" />
          <div className="loading-block customer" />
          <div className="loading-block requirement" />
          <div className="loading-block budget" />
          <div className="loading-block status" />
        </div>
      ))}

    </div>
  )
}


/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({
  hasFilters,
  onClear,
}) {
  return (
    <div className="enquiry-empty">

      <div className="empty-icon">
        <MailIcon />
      </div>

      <h3>
        {hasFilters
          ? 'No enquiries found'
          : 'No enquiries yet'}
      </h3>

      <p>
        {hasFilters
          ? 'Try changing your search or status filter.'
          : 'Website enquiries will appear here when customers submit the enquiry form.'}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
        >
          Clear filters
        </button>
      )}

    </div>
  )
}


/* ============================================================
   MODAL
   ============================================================ */

function EnquiryModal({
  enquiry,
  onClose,
  onStatusChange,
  updating,
  formatDateTime,
}) {
  const status = enquiry.status || 'new'

  return (
    <div
      className="enquiry-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >

      <div className="enquiry-modal">

        {/* Header */}

        <div className="modal-header">

          <div>
            <div className="modal-reference">
              {enquiry.ref || '-'}
            </div>

            <h2>
              Enquiry Details
            </h2>

            <p>
              Submitted {formatDateTime(enquiry.createdAt)}
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>

        </div>

        {/* Body */}

        <div className="modal-body">

          {/* Customer */}

          <ModalSection title="Customer Information">

            <div className="detail-grid">

              <DetailItem
                label="Name"
                value={enquiry.name}
              />

              <DetailItem
                label="Phone"
                value={enquiry.phone}
                link={
                  enquiry.phone
                    ? `tel:${enquiry.phone}`
                    : undefined
                }
              />

              <DetailItem
                label="Email"
                value={enquiry.email}
                link={
                  enquiry.email
                    ? `mailto:${enquiry.email}`
                    : undefined
                }
              />

              <DetailItem
                label="Submitted"
                value={formatDateTime(enquiry.createdAt)}
              />

            </div>

          </ModalSection>

          {/* Piece requirement */}

          <ModalSection title="Piece Requirement">

            <div className="detail-grid">

              <DetailItem
                label="Category"
                value={enquiry.weave || enquiry.category}
              />

              <DetailItem
                label="Space"
                value={enquiry.occasion}
              />

              <DetailItem
                label="Budget"
                value={enquiry.budget}
              />

              <DetailItem
                label="Timeline"
                value={enquiry.timeline}
              />

            </div>

          </ModalSection>

          {/* Notes */}

          <ModalSection title="Customer Notes">

            <div className="notes-box">
              {enquiry.notes ? (
                <p>
                  {enquiry.notes}
                </p>
              ) : (
                <p className="no-notes">
                  No additional notes provided.
                </p>
              )}
            </div>

          </ModalSection>

          {/* Status */}

          <ModalSection title="Enquiry Status">

            <div className="modal-status-row">

              <select
                value={status}
                disabled={updating}
                onChange={(e) =>
                  onStatusChange(
                    enquiry._id,
                    e.target.value
                  )
                }
                className={`modal-status-select ${
                  STATUS_CLASS[status] || STATUS_CLASS.new
                }`}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              {updating && (
                <span className="updating-text">
                  Updating...
                </span>
              )}

            </div>

          </ModalSection>

        </div>

        {/* Footer */}

        <div className="modal-footer">

          <button
            type="button"
            onClick={onClose}
            className="modal-close-button"
          >
            Close
          </button>

        </div>

      </div>

    </div>
  )
}


/* ============================================================
   MODAL SECTION
   ============================================================ */

function ModalSection({
  title,
  children,
}) {
  return (
    <section className="modal-section">

      <h3>
        {title}
      </h3>

      {children}

    </section>
  )
}


/* ============================================================
   DETAIL ITEM
   ============================================================ */

function DetailItem({
  label,
  value,
  link,
}) {
  return (
    <div className="detail-item">

      <div className="detail-label">
        {label}
      </div>

      {link ? (
        <a
          href={link}
          className="detail-value detail-link"
        >
          {value || '-'}
        </a>
      ) : (
        <div className="detail-value">
          {value || '-'}
        </div>
      )}

    </div>
  )
}


/* ============================================================
   HELPERS
   ============================================================ */

function getInitials(name) {
  if (!name) return 'EN'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}


/* ============================================================
   ICONS
   ============================================================ */

function SearchIcon() {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

function RefreshIcon({ spinning = false }) {
  return (
    <svg
      className={`icon refresh-icon ${
        spinning ? 'spinning' : ''
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2" />
      <path d="M4 5v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2" />
      <path d="M20 19v-4h-4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      className="action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      className="action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  )
}