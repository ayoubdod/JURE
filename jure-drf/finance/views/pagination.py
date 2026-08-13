from core.utils import NumericPagination


class FinanceListPagination(NumericPagination):
    """Accept both `page_size` (frontend) and `per_page` (legacy)."""

    page_size_query_param = 'page_size'

    def get_page_size(self, request):
        if request is None:
            return self.page_size
        # Prefer page_size; fall back to per_page for older clients.
        if 'page_size' in request.query_params:
            return super().get_page_size(request)
        if 'per_page' in request.query_params:
            try:
                return min(int(request.query_params['per_page']), self.max_page_size)
            except (TypeError, ValueError):
                pass
        return self.page_size
