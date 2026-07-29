# Backend: Include User Profile Image in All Chat & Team Member Responses

## Problem
The frontend shows only initials (abbreviations) instead of profile images in chat and team member UIs because the API does not include the `image` field in several responses.

## Required Changes

Ensure the **`image`** (or `avatar`) field is included in **all** serializers that return user or cabinet member data used for display.

### 1. User Serializer (for chat/conversations)

When returning users in **conversation memberships** (list conversations, get conversation detail), include `image`:

```python
# Example: User serializer used in conversation membership
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'image', ...]  # MUST include image
```

### 2. Conversation Membership Serializer

Ensure the nested `user` (or `cabinet_member`) in each membership includes `image`:

```python
# When serializing ConversationMembership, the user/cabinet_member must have image
class ConversationMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)  # UserSerializer must include 'image'
    # OR if using cabinet_member:
    cabinet_member = CabinetMemberSerializer(read_only=True)  # must include image
```

### 3. Cabinet Member Serializer

When listing cabinet members (`/cabinets/members/all/`) with `expand=user`, include `image` on both:

```python
# CabinetMember serializer – include image (from linked User if cabinet_member has no direct image)
class CabinetMemberSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    
    def get_image(self, obj):
        return getattr(obj.user, 'image', None) or getattr(obj, 'image', None)
    
    class Meta:
        model = CabinetMember
        fields = [..., 'image', 'first_name', 'last_name', 'email', ...]
```

Or if `User` has `image` and you nest it:

```python
class CabinetMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)  # UserSerializer includes image
```

### 4. Message Sender

When returning messages, the sender info must include `image`:

- Either the `sender` field is an object (nested serializer) that includes `image`
- Or the frontend resolves sender from `memberships` – in that case, ensure each membership’s `user`/`cabinet_member` includes `image`

### 5. Field Names

The frontend checks these field names (in order): `image`, `avatar`, `profile_image`, `avatar_url`, `photo`, `picture`, `profile_picture`. Prefer `image` for consistency.

### 6. Image URL Format

Return either:

- **Full URL**: `https://your-domain.com/media/profile/abc.jpg`
- **Relative path**: `/media/profile/abc.jpg` (frontend will prepend backend base URL)

Avoid returning `null` or omitting the field when the user has uploaded a profile image.

---

## Summary Checklist

- [ ] User serializer used in chat includes `image`
- [ ] Conversation membership serializer nests user/cabinet_member with `image`
- [ ] Cabinet member list (`/cabinets/members/all/`) returns `image` (from user or cabinet_member)
- [ ] Message sender or membership user includes `image` when available

---

## Copy-Paste Prompt (for AI/Backend Developer)

```
Add the user profile image field to all API responses that include user or cabinet member data for display.

1. Include `image` in the User serializer used for conversation memberships, so conversation list and chat show profile photos instead of initials.

2. Include `image` in the CabinetMember serializer (or nested User when expand=user) for GET /cabinets/members/all/ and GET /cabinets/members/{id}/.

3. Ensure conversation membership responses (list conversations, get conversation) include `image` in the nested user or cabinet_member object.

4. Ensure message sender info (or membership user used to resolve sender) includes `image`.

The image field can be a relative path (e.g. /media/profile/xyz.jpg) or full URL. The frontend will resolve relative paths.
```
