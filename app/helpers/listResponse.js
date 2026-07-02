export default function listResponse(total, page, perPage, data) {
  return {
    total,
    page: parseInt(page, 10),
    perPage: parseInt(perPage, 10),
    list: data,
  }
}
