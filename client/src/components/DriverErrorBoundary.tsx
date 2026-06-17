import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

export class DriverErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('DriverErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-900" dir="rtl">
          <div className="max-w-sm w-full bg-gray-800 border border-red-500 rounded-2xl shadow-xl p-6 text-center">
            <div className="text-5xl mb-4">🚗</div>
            <h2 className="text-xl font-bold text-white mb-2">حدث خطأ في تطبيق السائق</h2>
            <p className="text-sm text-gray-400 mb-5">
              {this.state.error?.message || 'حدث خطأ غير متوقع. يمكنك المحاولة مرة أخرى.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
              >
                تحديث التطبيق
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DriverErrorBoundary;
