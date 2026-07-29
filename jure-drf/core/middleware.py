"""
Middleware for handling PDF file headers for iframe embedding.
"""
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


class PDFHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add proper headers for PDF files to allow iframe embedding.
    """
    
    def process_request(self, request):
        # Handle CORS preflight requests for PDF files
        if request.method == 'OPTIONS' and request.path.startswith(settings.MEDIA_URL):
            if request.path.lower().endswith('.pdf'):
                response = HttpResponse()
                origin = request.META.get('HTTP_ORIGIN', '')
                allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
                
                if origin and origin in allowed_origins:
                    response['Access-Control-Allow-Origin'] = origin
                    response['Access-Control-Allow-Credentials'] = 'true'
                elif getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
                    response['Access-Control-Allow-Origin'] = '*'
                elif origin and settings.DEBUG:
                    response['Access-Control-Allow-Origin'] = origin
                    response['Access-Control-Allow-Credentials'] = 'true'
                
                response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
                response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
                response['Access-Control-Max-Age'] = '86400'  # 24 hours
                return response
        return None
    
    def process_response(self, request, response):
        # Only process media file requests
        if not request.path.startswith(settings.MEDIA_URL):
            return response
        
        # Check if it's a PDF file
        file_path = request.path
        if file_path.lower().endswith('.pdf'):
            # Add CORS headers for PDF files
            origin = request.META.get('HTTP_ORIGIN', '')
            allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
            
            # Check if origin is in allowed origins
            if origin and origin in allowed_origins:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
            elif getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
                response['Access-Control-Allow-Origin'] = '*'
            elif origin:
                # If origin is provided but not in allowed list, use it anyway for development
                # In production, you might want to be more restrictive
                if settings.DEBUG:
                    response['Access-Control-Allow-Origin'] = origin
                    response['Access-Control-Allow-Credentials'] = 'true'
            
            # Add other CORS headers
            response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            
            # Ensure Content-Type is set correctly
            if 'Content-Type' not in response or not response['Content-Type'].startswith('application/pdf'):
                response['Content-Type'] = 'application/pdf'
            
            # Allow iframe embedding - remove or set X-Frame-Options appropriately
            # Remove X-Frame-Options if set to DENY, or set to SAMEORIGIN
            if 'X-Frame-Options' in response:
                if response['X-Frame-Options'] == 'DENY':
                    # Remove DENY to allow embedding
                    del response['X-Frame-Options']
                elif response['X-Frame-Options'] != 'SAMEORIGIN':
                    # Set to SAMEORIGIN for same-domain embedding
                    response['X-Frame-Options'] = 'SAMEORIGIN'
            else:
                # Set to SAMEORIGIN if not present
                response['X-Frame-Options'] = 'SAMEORIGIN'
            
            # Add Content-Security-Policy for frame-ancestors
            # This is more flexible than X-Frame-Options
            csp = response.get('Content-Security-Policy', '')
            if 'frame-ancestors' not in csp:
                if csp:
                    csp += "; frame-ancestors 'self'"
                else:
                    csp = "frame-ancestors 'self'"
                response['Content-Security-Policy'] = csp
        
        return response

