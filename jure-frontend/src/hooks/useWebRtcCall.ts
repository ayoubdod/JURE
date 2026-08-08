/**
 * Thin re-export — call session lives in `callSessionStore` so media survives route changes.
 */
export {
  useWebRtcCall,
  useCallSessionStore,
  type CallStatus,
  type CallRemoteUser,
  type CallUiState,
} from '@/stores/callSessionStore';
