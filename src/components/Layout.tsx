import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { LogOut, LayoutDashboard, FileSpreadsheet, User, School } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Công khai", path: "/", icon: LayoutDashboard },
    ...(user ? [{ name: "Điểm danh", path: "/teacher", icon: FileSpreadsheet }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-brand-600 p-2 rounded-xl shadow-lg shadow-brand-200"
            >
              <School className="h-5 w-5 text-white" />
            </motion.div>
            <div className="flex flex-col">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight uppercase font-display">
                  TRƯỜNG PTDTBT THCS THU CÚC
                </h1>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">Hệ thống Điểm Danh Bán Trú</span>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-900 leading-none">
                    {user.displayName || "Giáo viên"}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-none mt-1 font-medium">
                    {user.email}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={logout}
                  className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="h-5 w-5" />
                </motion.button>
              </div>
            ) : (
              <Link
                to="/login"
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-all duration-300 font-semibold text-sm shadow-md shadow-brand-200"
              >
                <User className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Đăng nhập GV</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        
        <footer className="mt-20 py-10 text-center border-t border-slate-200/60">
            <p className="text-xs text-slate-400 font-medium">
                Phát triển bởi <span className="font-bold text-brand-600">Duy Công Hạnh</span>
            </p>
            <p className="text-[10px] text-slate-300 mt-1 font-semibold tracking-wider uppercase">
                &copy; {new Date().getFullYear()} TRƯỜNG PTDTBT THCS THU CÚC
            </p>
        </footer>
      </main>

      <nav className="bg-white/80 backdrop-blur-xl border-t border-slate-200 fixed bottom-0 w-full pb-safe z-30 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <div className="max-w-md mx-auto px-6 flex justify-around h-16 items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300",
                  isActive ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {isActive && (
                  <motion.span 
                    layoutId="nav-indicator"
                    className="absolute -top-[1px] w-12 h-1 bg-brand-600 rounded-b-full shadow-[0_2px_10px_rgba(139,92,246,0.5)]" 
                  />
                )}
                <item.icon className={cn("h-6 w-6 transition-all duration-300", isActive && "scale-110 drop-shadow-sm")} />
                <span className={cn("text-[10px] font-bold tracking-wider uppercase", isActive ? "text-brand-600" : "text-slate-400")}>
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
