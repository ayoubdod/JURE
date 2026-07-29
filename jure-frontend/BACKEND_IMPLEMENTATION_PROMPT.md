# Backend Implementation Prompt for Role-Based Access Control (RBAC)

## Overview
Implement a comprehensive role-based access control system for the Jure legal management platform. The system should allow team members to have different roles with specific permissions for viewing, editing, and accessing various resources.

## Requirements

### 1. Database Schema

#### Add Role Field to CabinetMember Model
```python
# In your CabinetMember model (likely in models.py)
class CabinetMember(models.Model):
    # ... existing fields ...
    role = models.CharField(
        max_length=20,
        choices=[
            ('OWNER', 'Owner'),
            ('ADMIN', 'Administrator'),
            ('MANAGER', 'Manager'),
            ('LAWYER', 'Lawyer'),
            ('ASSISTANT', 'Assistant'),
            ('VIEWER', 'Viewer'),
        ],
        default='VIEWER',
        null=True,
        blank=True
    )
    # Optional: Store custom permissions as JSON
    custom_permissions = models.JSONField(default=list, blank=True)
```

#### Create Permission Model (Optional - for more granular control)
```python
class Permission(models.Model):
    """
    Represents a specific permission that can be granted to roles or users
    """
    code = models.CharField(max_length=50, unique=True)  # e.g., 'cases.view'
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    resource = models.CharField(max_length=50)  # e.g., 'cases', 'clients', 'team'
    action = models.CharField(max_length=50)  # e.g., 'view', 'create', 'edit', 'delete'
    
    class Meta:
        ordering = ['resource', 'action']
    
    def __str__(self):
        return f"{self.resource}.{self.action}"

class RolePermission(models.Model):
    """
    Maps permissions to roles
    """
    role = models.CharField(max_length=20, choices=[...])  # Same choices as CabinetMember.role
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ['role', 'permission']
```

### 2. API Endpoints

#### Update CabinetMember Serializer
```python
class CabinetMemberSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=['OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER'],
        required=False,
        allow_null=True
    )
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = CabinetMember
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone',
            'date_joined', 'is_active', 'address', 'role', 'permissions'
        ]
    
    def get_permissions(self, obj):
        """Return list of permissions for this member based on their role"""
        from .utils import get_role_permissions
        return get_role_permissions(obj.role)
```

#### Add Role Update Endpoint
```python
# In views.py or viewsets.py
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_cabinet_member_role(request, member_id):
    """
    Update a cabinet member's role
    PATCH /api/v1/cabinets/members/{id}/role/
    Body: {
        "role": "ADMIN",
        "permissions": ["cases.view", "cases.edit"]  # optional custom permissions
    }
    """
    try:
        member = CabinetMember.objects.get(id=member_id)
        
        # Check if current user has permission to manage roles
        if not request.user.has_perm('cabinet.manage_roles'):
            # Or check if user is OWNER/ADMIN
            current_member = CabinetMember.objects.filter(user=request.user).first()
            if not current_member or current_member.role not in ['OWNER', 'ADMIN']:
                return Response(
                    {'error': 'You do not have permission to manage roles'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        role = request.data.get('role')
        if role not in ['OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER']:
            return Response(
                {'error': 'Invalid role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        member.role = role
        
        # Handle custom permissions if provided
        if 'permissions' in request.data:
            member.custom_permissions = request.data['permissions']
        
        member.save()
        
        serializer = CabinetMemberSerializer(member)
        return Response(serializer.data)
    
    except CabinetMember.DoesNotExist:
        return Response(
            {'error': 'Member not found'},
            status=status.HTTP_404_NOT_FOUND
        )
```

#### Add Role Permissions Endpoint
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role_permissions(request):
    """
    Get all roles and their default permissions
    GET /api/v1/cabinets/roles/permissions/
    """
    from .utils import DEFAULT_ROLE_PERMISSIONS
    
    roles_data = []
    for role, permissions in DEFAULT_ROLE_PERMISSIONS.items():
        roles_data.append({
            'role': role,
            'permissions': permissions
        })
    
    return Response(roles_data)
```

### 3. Permission Utility Functions

```python
# In utils.py or permissions.py

# Default permissions for each role
DEFAULT_ROLE_PERMISSIONS = {
    'OWNER': [
        'cases.view', 'cases.create', 'cases.edit', 'cases.delete',
        'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
        'team.view', 'team.create', 'team.edit', 'team.delete', 'team.manage_roles',
        'library.view', 'library.create', 'library.edit', 'library.delete',
        'settings.view', 'settings.edit',
        'conversations.view', 'conversations.create', 'conversations.edit', 'conversations.delete',
        'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    ],
    'ADMIN': [
        'cases.view', 'cases.create', 'cases.edit', 'cases.delete',
        'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
        'team.view', 'team.create', 'team.edit', 'team.delete', 'team.manage_roles',
        'library.view', 'library.create', 'library.edit', 'library.delete',
        'settings.view', 'settings.edit',
        'conversations.view', 'conversations.create', 'conversations.edit', 'conversations.delete',
        'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    ],
    'MANAGER': [
        'cases.view', 'cases.create', 'cases.edit',
        'clients.view', 'clients.create', 'clients.edit',
        'team.view', 'team.create', 'team.edit',
        'library.view', 'library.create', 'library.edit',
        'settings.view',
        'conversations.view', 'conversations.create', 'conversations.edit',
        'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    ],
    'LAWYER': [
        'cases.view', 'cases.create', 'cases.edit',
        'clients.view', 'clients.create', 'clients.edit',
        'team.view',
        'library.view', 'library.create', 'library.edit',
        'conversations.view', 'conversations.create', 'conversations.edit',
        'tasks.view', 'tasks.create', 'tasks.edit',
    ],
    'ASSISTANT': [
        'cases.view', 'cases.edit',
        'clients.view', 'clients.edit',
        'team.view',
        'library.view',
        'conversations.view', 'conversations.create', 'conversations.edit',
        'tasks.view', 'tasks.create', 'tasks.edit',
    ],
    'VIEWER': [
        'cases.view',
        'clients.view',
        'team.view',
        'library.view',
        'conversations.view',
        'tasks.view',
    ],
}

def get_role_permissions(role):
    """Get list of permissions for a given role"""
    if not role:
        return []
    return DEFAULT_ROLE_PERMISSIONS.get(role, [])

def has_permission(user, permission_code):
    """
    Check if a user has a specific permission
    """
    # Get user's cabinet member record
    try:
        member = CabinetMember.objects.get(user=user)
    except CabinetMember.DoesNotExist:
        return False
    
    # Check custom permissions first
    if member.custom_permissions and permission_code in member.custom_permissions:
        return True
    
    # Check role-based permissions
    role_permissions = get_role_permissions(member.role)
    return permission_code in role_permissions

def require_permission(permission_code):
    """
    Decorator to require a specific permission
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not has_permission(request.user, permission_code):
                return Response(
                    {'error': f'Permission required: {permission_code}'},
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator
```

### 4. Apply Permissions to Existing Views

#### Example: Protect Case Views
```python
# In case views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_permission('cases.view')
def list_cases(request):
    # ... existing code ...

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission('cases.create')
def create_case(request):
    # ... existing code ...

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@require_permission('cases.edit')
def update_case(request, case_id):
    # ... existing code ...

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@require_permission('cases.delete')
def delete_case(request, case_id):
    # ... existing code ...
```

### 5. Migration

```python
# Create migration file
python manage.py makemigrations

# Migration should look like:
class Migration(migrations.Migration):
    dependencies = [
        ('cabinet', '0001_initial'),  # Your existing migration
    ]

    operations = [
        migrations.AddField(
            model_name='cabinetmember',
            name='role',
            field=models.CharField(
                blank=True,
                choices=[
                    ('OWNER', 'Owner'),
                    ('ADMIN', 'Administrator'),
                    ('MANAGER', 'Manager'),
                    ('LAWYER', 'Lawyer'),
                    ('ASSISTANT', 'Assistant'),
                    ('VIEWER', 'Viewer'),
                ],
                default='VIEWER',
                max_length=20,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='cabinetmember',
            name='custom_permissions',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
```

### 6. URL Configuration

```python
# In urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ... existing patterns ...
    path('cabinets/members/<int:member_id>/role/', views.update_cabinet_member_role, name='update-member-role'),
    path('cabinets/roles/permissions/', views.get_role_permissions, name='role-permissions'),
]
```

### 7. Testing

Create tests for:
- Role assignment
- Permission checking
- Protected endpoints
- Default role permissions

```python
# tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import CabinetMember
from .utils import has_permission, get_role_permissions

class RolePermissionTestCase(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.member = CabinetMember.objects.create(
            user=self.user,
            first_name='Test',
            last_name='User',
            role='LAWYER'
        )
    
    def test_role_permissions(self):
        permissions = get_role_permissions('LAWYER')
        self.assertIn('cases.view', permissions)
        self.assertIn('cases.create', permissions)
        self.assertNotIn('cases.delete', permissions)
    
    def test_has_permission(self):
        self.assertTrue(has_permission(self.user, 'cases.view'))
        self.assertFalse(has_permission(self.user, 'cases.delete'))
```

## Implementation Checklist

- [ ] Add `role` field to CabinetMember model
- [ ] Add `custom_permissions` field (optional)
- [ ] Create migration and run it
- [ ] Update CabinetMember serializer to include role and permissions
- [ ] Create `update_cabinet_member_role` endpoint
- [ ] Create `get_role_permissions` endpoint
- [ ] Implement permission utility functions
- [ ] Add permission decorators to existing views
- [ ] Update URL configuration
- [ ] Write tests
- [ ] Update API documentation
- [ ] Set default roles for existing members (migration script)

## Security Considerations

1. **Only OWNER and ADMIN can manage roles**: Add checks to prevent unauthorized role changes
2. **Prevent privilege escalation**: Don't allow users to assign roles higher than their own
3. **Audit logging**: Log all role changes for security auditing
4. **Default to least privilege**: New members should default to VIEWER role

## Additional Features (Optional)

1. **Permission Groups**: Create reusable permission groups
2. **Time-based Permissions**: Temporary elevated permissions
3. **Resource-level Permissions**: Permissions specific to certain cases/clients
4. **Permission Inheritance**: Roles can inherit from other roles

## Notes

- The frontend expects these endpoints:
  - `PATCH /api/v1/cabinets/members/{id}/role/` - Update member role
  - `GET /api/v1/cabinets/roles/permissions/` - Get all role permissions
- The frontend sends role as one of: 'OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER'
- Permissions are returned as an array of strings like: ['cases.view', 'cases.create', ...]







