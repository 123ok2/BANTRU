import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { LogOut, LayoutDashboard, FileSpreadsheet, User, School } from "lucide-react";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Công khai", path: "/", icon: LayoutDashboard },
    ...(user ? [{ name: "Nhập liệu", path: "/teacher", icon: FileSpreadsheet }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
              <School className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
                <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent leading-tight uppercase">
                  TRƯỜNG PTDTBT THCS THU CÚC
                </h1>
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Hệ thống Điểm Danh Bán Trú</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900 leading-none">
                    {user.displayName || "Giáo viên"}
                  </span>
                  <span className="text-xs text-gray-500 leading-none mt-1">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
                  title="Đăng xuất"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all duration-200 font-medium text-sm"
              >
                <User className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Đăng nhập GV</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        <Outlet />
        
        <div className="mt-12 py-6 text-center border-t border-gray-200/60">
            <p className="text-xs text-gray-400">
                Phát triển bởi <span className="font-semibold text-indigo-500">Duy Công Hạnh</span>
            </p>
            <p className="text-[10px] text-gray-300 mt-1">
                &copy; {new Date().getFullYear()} TRƯỜNG PTDTBT THCS THU CÚC
            </p>
        </div>
      </main>

      <nav className="bg-white/90 backdrop-blur-lg border-t border-gray-200 fixed bottom-0 w-full pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto px-6 flex justify-around h-16 items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200",
                  isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {isActive && (
                  <span className="absolute -top-[1px] w-12 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(79,70,229,0.5)]" />
                )}
                <item.icon className={cn("h-6 w-6 transition-transform duration-200", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-semibold tracking-wide uppercase", isActive ? "text-indigo-600" : "text-gray-500")}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Spacer for bottom nav */}
      <div className="h-20" />
    </div>
  );
}
