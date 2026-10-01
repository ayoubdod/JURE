import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { documentReadingEn } from '@/i18n/messages/documentReading';

type Props = {
  children: ReactNode;
  onClose?: () => void;
  title?: string;
  description?: string;
  reloadLabel?: string;
  closeLabel?: string;
};

type State = { error: Error | null };

/** Keeps Library / case routes alive if Reading Mode throws while rendering. */
export default class ReadingErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Reading Mode error:', error, info.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const title = this.props.title || documentReadingEn.readingMode;
    const description =
      this.props.description || 'This document could not be opened in Reading Mode.';
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#f5f4f8] px-6 text-center dark:bg-slate-950">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</p>
        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">{description}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => this.setState({ error: null })}
          >
            {this.props.reloadLabel || 'Try again'}
          </Button>
          {this.props.onClose ? (
            <Button type="button" className="bg-[#64499D] text-white hover:bg-[#543d86]" onClick={this.props.onClose}>
              {this.props.closeLabel || documentReadingEn.back}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
}
