export const USER_ROLE = {
  REPORTER: 1,
  HELPDESK: 2,
}

export const TICKET_STATUS = {
  OPEN: 1,
  IN_PROGRESS: 2,
  PENDING: 3,
  RESOLVED: 4,
  CLOSED: 5,
  REJECTED: 6,
}

export const TICKET_STATUS_LABEL = {
  1: 'Open',
  2: 'In Progress',
  3: 'Pending',
  4: 'Resolved',
  5: 'Closed',
  6: 'Rejected',
}

export const ALLOWED_TRANSITIONS = {
  [TICKET_STATUS.OPEN]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.REJECTED],
  [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.PENDING, TICKET_STATUS.RESOLVED, TICKET_STATUS.REJECTED],
  [TICKET_STATUS.PENDING]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.REJECTED],
  [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED, TICKET_STATUS.IN_PROGRESS],
  [TICKET_STATUS.CLOSED]: [],
  [TICKET_STATUS.REJECTED]: [],
}

export const TICKET_PRIORITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

export const TICKET_SEVERITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

export const ISSUE_TYPE_OPTIONS = [
  'Bug', 'Change', 'Cleansing', 'Inquiries',
  'New Request', 'Performance', 'UI/UX', 'Lainnya',
]

export const DEVICE_OPTIONS = [
  'Web', 'Mobile', 'All', 'Backend', 'Timbangan', 'Printer', 'Lainnya',
]

export const WMS_MODULE_OPTIONS = [
  'Kemitraan', 'Data Limbah', 'Persetujuan Penimbangan Manual',
  'Serah Terima', 'Detail Limbah', 'Tindak Lanjut', 'Nomor Kendaraan',
  'Rekap Total Limbah', 'Program WMS', 'Operator dan Nomor Kendaraan',
  'Limbah Sisa', 'Kendaraan Pengangkut', 'Login', 'Batas Jarak',
  'Logbook', 'Operator Pengangkut', 'Karakteristik Limbah',
  'Manajemen Aset', 'Printer', 'Timbangan', 'Kertas Thermal Printer',
  'Lokasi', 'Pelacakan Limbah Keluar', 'Tanggal Limbah Keluar',
  'Penimbangan', 'Dashboard Monitoring Timbulan', 'Berita Acara Serah Terima',
  'Lainnya',
]

export const XSS_OPTION = {
  allowedTags: [],
  allowedAttributes: {},
}
