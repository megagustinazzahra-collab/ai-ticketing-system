$(document).ready(function () {
  const getUrl = () => new URL(window.location)
  const getParams = (url) => new URLSearchParams(url.search)
  const buildUrl = (url, params) => `${url.protocol}//${url.host}${url.pathname}?${params.toString()}`

  // Submit filter form via URL params (reset ke page 1)
  $('#filter-form').on('submit', function (e) {
    e.preventDefault()
    const url = getUrl()
    const params = new URLSearchParams()

    $(this).serializeArray().forEach(function (field) {
      if (field.value.trim()) params.set(field.name, field.value.trim())
    })
    params.set('page', '1')
    params.set('paginate', getParams(url).get('paginate') || '20')

    window.location.assign(buildUrl(url, params))
  })

  // Dropdown filter yang submit otomatis saat berubah
  $('#filter-status, #filter-priority, #filter-issue-type').on('change', function () {
    $('#filter-form').trigger('submit')
  })
})
