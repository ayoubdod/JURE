from core.utils import NumericPagination


class FinanceListPagination(NumericPagination):
    page_size_query_param = 'per_page'
