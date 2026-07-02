$(document).ready(function () {
  const POLL_INTERVAL = 30 * 1000 // 30 detik

  function updateBadge() {
    $.get('/api/v1/notifications/unread-count')
      .done(function (data) {
        const $badge = $('#notif-badge')
        if (data.count > 0) {
          $badge.text(data.count).removeClass('d-none')
        } else {
          $badge.text('').addClass('d-none')
        }
      })
      .fail(function () {
        // Diam saja jika endpoint belum ada (Modul 7)
      })
  }

  updateBadge()
  setInterval(updateBadge, POLL_INTERVAL)
})
