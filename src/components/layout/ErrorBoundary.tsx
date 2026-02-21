import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center p-6 bg-red-50"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 text-center shadow">
            <h2 className="text-lg font-semibold text-red-700 mb-2">אירעה שגיאה</h2>
            <p className="text-sm text-gray-600 mb-4">
              המערכת נתקלה בשגיאה בלתי צפויה. אנא רענן את הדף ונסה שוב.
            </p>
            <code className="block bg-red-50 rounded p-3 text-xs text-red-800 break-all text-right mb-4">
              {this.state.error.message}
            </code>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              רענן דף
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
