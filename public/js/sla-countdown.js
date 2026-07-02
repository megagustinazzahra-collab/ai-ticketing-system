$(document).ready(() => {
  const $el = $('#sla-countdown')
  if (!$el.length) return

  const deadlineMs = parseInt($el.data('deadline-ms'), 10)
  if (!deadlineMs || isNaN(deadlineMs)) return

  const update = () => {
    const remaining = deadlineMs - Date.now()

    if (remaining <= 0) {
      $el.text('Terlampaui')
        .removeClass('text-warning text-success')
        .addClass('text-danger font-weight-bold')
      return true // breached
    }

    const h = Math.floor(remaining / 3600000)
    const m = Math.floor((remaining % 3600000) / 60000)
    const s = Math.floor((remaining % 60000) / 1000)
    const label = h > 0 ? `${h}j ${m}m ${s}d` : `${m}m ${s}d`
    $el.text(label)
    return false
  }

  if (update()) return // sudah breach, tidak perlu interval

  const timer = setInterval(() => {
    const done = update()
    if (done) clearInterval(timer)
  }, 1000)
})
