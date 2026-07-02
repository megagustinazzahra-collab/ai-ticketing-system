export const SLA_CONFIG = {
  Critical: { hours: 4, label: '4 Jam' },
  High: { hours: 8, label: '8 Jam' },
  Medium: { hours: 48, label: '2 Hari Kerja' },
  Low: { hours: 120, label: '5 Hari Kerja' },
}

export const SLA_WARNING_THRESHOLD = 0.20

export const SLA_COLOR = {
  NORMAL: 'secondary',
  WARNING: 'warning',
  BREACHED: 'danger',
  INACTIVE: 'light',
}
