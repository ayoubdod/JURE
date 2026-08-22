from collections import OrderedDict
import json
import re
from rest_framework import pagination
from rest_framework.response import Response
from rest_framework.request import Request

def is_valid_slug(slug: str) -> bool:
    """
    Validate if a string is a valid slug.
    
    A valid slug contains only lowercase letters, numbers, hyphens, and underscores.
    It cannot start or end with a hyphen or underscore.
    """
    if not slug:
        return False
    
    # Django's slug pattern: lowercase letters, numbers, hyphens, underscores
    # Cannot start or end with hyphen or underscore
    pattern = r'^[a-z0-9]+(?:[_-][a-z0-9]+)*$'
    return bool(re.match(pattern, slug))

class NumericPagination(pagination.PageNumberPagination):
    page_query_param = 'page'
    page_size_query_param = 'page_size'
    page_size = 20
    max_page_size = 100

    # def get_page_size(self, request:Request):
    #     if request.query_params.get('all','false') != 'false':
    #         return None
    #     return super().get_page_size(request)


    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('last_page', self.page.paginator.num_pages),
            ('page_size', self.get_page_size(self.request)),
            ('page', self.page.number),
            ('next', self.page.next_page_number() if self.page.has_next() else None),
            ('previous', self.page.previous_page_number() if self.page.has_previous() else None),
            ('results', data)
        ]))


# core/utils.py (add or extend)
def get_user_cabinet(user):
    """
    Returns the cabinet instance (or None) for the current user.
    Tries, in order:
      - owned cabinet (owner)
      - member cabinet (member)
      - direct 'cabinet' field if you have one
    """
    # owner
    if hasattr(user, "get_owned_cabinet_or_none"):
        cab = user.get_owned_cabinet_or_none()
        if cab:
            return cab

    # member
    if getattr(user, "is_cabinet_member", False):
        # Adjust this accessor to your schema (e.g., user.cabinet_member.cabinet)
        if hasattr(user, "cabinet") and user.cabinet:
            return user.cabinet
        if hasattr(user, "cabinet_member") and getattr(user.cabinet_member, "cabinet", None):
            return user.cabinet_member.cabinet

    # fallback: direct field
    if hasattr(user, "cabinet"):
        return user.cabinet

    return None


def get_user_jurisdiction(user):
    """Jurisdiction of the user's active cabinet, or None."""
    cabinet = get_user_cabinet(user)
    if cabinet is None:
        return None
    return getattr(cabinet, "jurisdiction", None)



