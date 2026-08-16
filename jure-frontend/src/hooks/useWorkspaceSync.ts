import { useEffect } from 'react';
import { eventBus } from '@/utils/eventBus';

export const WORKSPACE_SYNC_EVENTS = [
  'task-created',
  'task-updated',
  'task-deleted',
  'appointment-created',
  'appointment-updated',
] as const;

/** Refetch when tasks or appointments change anywhere in the app. */
export function useWorkspaceSync(onChange: () => void) {
  useEffect(() => {
    const handler = () => onChange();
    WORKSPACE_SYNC_EVENTS.forEach((event) => eventBus.on(event, handler));
    return () => {
      WORKSPACE_SYNC_EVENTS.forEach((event) => eventBus.off(event, handler));
    };
  }, [onChange]);
}
