# Live Chat System

A complete real-time chat system built with Django Channels, WebSockets, and Django REST Framework.

## Features

- **Real-time messaging** with WebSocket connections
- **Direct and group conversations**
- **Read receipts** and delivery status
- **Typing indicators**
- **User online/offline status**
- **Message history** with pagination
- **JWT authentication** for both REST API and WebSocket connections
- **Cabinet-scoped conversations** (for multi-tenant support)
- **File attachments** support (images, videos, audio, documents)
- **Message reactions** and replies
- **Voice and video call signaling** (basic structure)

## Architecture

### Backend Components

1. **Models** (`chat/models.py`):
   - `Conversation`: Direct and group conversations
   - `ConversationMembership`: User participation in conversations
   - `Message`: Chat messages with metadata
   - `Attachment`: File attachments for messages
   - `Reaction`: Message reactions (emojis)
   - `ReadReceipt`: Message read status
   - `DeliveryReceipt`: Message delivery status
   - `Call` & `CallParticipant`: Voice/video call support

2. **WebSocket Consumer** (`chat/consumers.py`):
   - Real-time message broadcasting
   - Typing indicators
   - Read receipts
   - User status updates

3. **REST API** (`chat/views.py`):
   - Conversation management
   - Message CRUD operations
   - User authentication

4. **Authentication** (`chat/ws_auth.py`):
   - JWT token validation for WebSocket connections

### Frontend

The frontend lives in a **separate project/folder**. Use the prompt in `docs/FRONTEND_CHAT_PROMPT.md` to implement the chat UI in the frontend codebase.

## API Endpoints

### Conversations

- `GET /api/chat/conversations/` - List user's conversations
- `POST /api/chat/conversations/` - Create new conversation
- `GET /api/chat/conversations/{id}/` - Get conversation details
- `GET /api/chat/conversations/{id}/messages/` - Get conversation messages
- `POST /api/chat/conversations/{id}/mark_read/` - Mark conversation as read

### Messages

- `GET /api/chat/messages/` - List messages (with conversation_id filter)
- `POST /api/chat/messages/` - Send new message
- `GET /api/chat/messages/{id}/` - Get message details
- `PUT /api/chat/messages/{id}/` - Edit message
- `DELETE /api/chat/messages/{id}/` - Delete message

## WebSocket Events

### Client to Server

- `conversation.subscribe` - Subscribe to conversation updates
- `conversation.unsubscribe` - Unsubscribe from conversation
- `message.send` - Send a message
- `message.typing` - Send typing indicator
- `receipt.read` - Mark message as read
- `user.status` - Update user status

### Server to Client

- `connection.established` - Connection confirmed; payload includes `notifications` and `online_user_ids` (presence)
- `subscribed` - Successfully subscribed to conversation
- `message.new` - New message received
- `message.ack` - Message sent successfully
- `user.typing` - User typing indicator
- `receipt.read` - Message read receipt
- `user.status` - User status update
- `presence.update` - Online users changed; payload: `online_user_ids`, `online_member_ids`, `online`
- `error` - Error message

## Setup Instructions

### 1. Install Dependencies

The required packages are already in `pyproject.toml`:
- `channels` - WebSocket support
- `channels-redis` - Redis backend for channels
- `redis` - Redis client
- `daphne` - ASGI server

### 2. Configure Redis

Add to your `.env` file:
```
REDIS_URL=redis://127.0.0.1:6379/0
```

### 3. Run Migrations

```bash
python manage.py makemigrations chat
python manage.py migrate
```

### 4. Start Redis Server

```bash
# On Windows (if using WSL or Docker)
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 5. Run the Development Server

```bash
# For WebSocket support, use Daphne
daphne core.asgi:application

# Or use the standard Django server (limited WebSocket support)
python manage.py runserver
```

## Usage Examples

### REST API Examples

```bash
# Get conversations
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/chat/conversations/

# Create direct conversation
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"type": "direct", "peerId": 2}' \
     http://localhost:8000/api/chat/conversations/

# Send message
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"conversationId": 1, "content": "Hello!"}' \
     http://localhost:8000/api/chat/messages/
```

## WebSocket Connection

Connect to WebSocket with JWT token:

```javascript
// Method 1: Query parameter
const ws = new WebSocket('ws://localhost:8000/ws/chat/?token=YOUR_JWT_TOKEN');

// Method 2: Authorization header
const ws = new WebSocket('ws://localhost:8000/ws/chat/');
ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'YOUR_JWT_TOKEN'
    }));
};
```

## Testing

Use the frontend project with the backend. See `docs/FRONTEND_CHAT_PROMPT.md` for frontend implementation details.

## Security Features

- JWT authentication for all connections
- User permission checks for conversation access
- Input validation and sanitization
- Rate limiting (can be added via Django REST Framework)

## Performance Considerations

- Messages are paginated (default 50 per request)
- WebSocket connections are managed efficiently
- Redis backend for scalable channel layers
- Database indexes on frequently queried fields

## Future Enhancements

- Message encryption
- Push notifications
- Message search
- File upload progress
- Message threading
- Advanced call features
- Message translation
- Bot integration

## Troubleshooting

### Common Issues

1. **WebSocket connection fails**: Check Redis server is running
2. **Authentication errors**: Verify JWT token is valid and not expired
3. **Messages not appearing**: Check user has permission to access conversation
4. **Redis connection errors**: Verify REDIS_URL in settings

### Debug Mode

Enable debug logging in Django settings:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'channels': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

