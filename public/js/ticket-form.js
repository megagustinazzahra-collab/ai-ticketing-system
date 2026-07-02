$(document).ready(function () {
  const MAX_FILES = 5
  const MAX_SIZE_BYTES = 5 * 1024 * 1024
  const ALLOWED_EXTS = ['png', 'jpg', 'jpeg', 'pdf']

  // ── Char counter untuk textarea ──
  $('textarea[maxlength]').each(function () {
    const $el = $(this)
    const max = parseInt($el.attr('maxlength'), 10)
    const targetId = $el.attr('id')
    const $counter = $(`.char-count[data-target="${targetId}"]`)

    $counter.text(`0 / ${max}`)
    $el.on('input', function () {
      $counter.text(`${this.value.length} / ${max}`)
    })
  })

  // ── File input label & preview ──
  $('#attachments').on('change', function () {
    const files = Array.from(this.files)
    let errorMsg = ''

    if (files.length > MAX_FILES) {
      errorMsg = `Maksimal ${MAX_FILES} file attachment.`
    }

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!ALLOWED_EXTS.includes(ext)) {
        errorMsg = `Format file tidak diizinkan: "${file.name}". Gunakan PNG, JPG, JPEG, PDF.`
        break
      }
      if (file.size > MAX_SIZE_BYTES) {
        errorMsg = `File "${file.name}" melebihi batas ukuran 5MB.`
        break
      }
    }

    if (errorMsg) {
      $('#file-label').text(errorMsg).addClass('text-danger')
      $('#file-preview').empty()
      this.value = ''
      return
    }

    const label = files.length > 0 ? `${files.length} file dipilih` : 'Belum ada file dipilih'
    $('#file-label').text(label).removeClass('text-danger')

    // Preview list
    const $preview = $('#file-preview').empty()
    files.forEach((f) => {
      $preview.append(
        $('<div class="small text-muted">').html(
          `<i class="fas fa-file mr-1"></i>${f.name} <span class="text-secondary">(${Math.ceil(f.size / 1024)} KB)</span>`
        )
      )
    })
  })

  // ── Konfirmasi & disable button saat submit ──
  $('#ticket-form').on('submit', function () {
    const $btn = $('#btn-submit')
    $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i>Mengirim...')
  })
})
