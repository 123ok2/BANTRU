import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đã xảy ra lỗi hệ thống</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang hoặc liên hệ quản trị viên.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
              >
                <RefreshCcw className="h-5 w-5 mr-2" />
                Tải lại trang
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-200 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                Thử lại
              </button>
            </div>
            
            <details className="mt-8 text-left">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
                Xem chi tiết lỗi (dành cho kỹ thuật)
              </summary>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg overflow-auto max-h-40 border border-gray-200">
                <p className="text-[10px] font-mono text-red-700 whitespace-pre-wrap">
                  {this.state.error?.stack || this.state.error?.toString()}
                </p>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
