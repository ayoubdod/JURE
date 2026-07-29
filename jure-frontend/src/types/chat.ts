export type Presence = 'online' | 'offline' | 'away' | 'busy';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: Presence;
  lastSeen?: string; // ISO
  role?: string;
}

export type MessageKind = 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice_note';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string; // ISO
  type: MessageKind;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions: Array<{ userId: string; emoji: string }>;
  replies: ChatMessage[];
  isEdited?: boolean;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  replyTo?: string;
}

export interface Conversation {
  id: number;
  name: string;
  type: 'direct' | 'group';
  participants: ChatUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  avatar?: string;
  description?: string;
  createdAt: string; // ISO
}

export interface SendMessageDTO {
  chatId: string;
  content: string;
  type?: MessageKind;
  file?: File;
  replyTo?: string;
}
