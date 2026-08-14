export type ShortcutActionId =
  | 'create-client'
  | 'create-case'
  | 'create-task'
  | 'create-appointment'
  | 'create-member'
  | 'create-document'
  | 'create-chat'
  | 'conflict-check'
  | 'clause-library'
  | 'close-matter'
  | 'search-records'
  | 'logout';

export type ShortcutHandler = () => void;
