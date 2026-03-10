import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { Loader2, School, User, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await updateProfile(userCredential.user, {
                displayName: displayName
            });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/teacher");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Floating decorative elements */}
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[15%] text-brand-200 opacity-40 hidden lg:block"
        >
          <Sparkles size={64} />
        </motion.div>
        <motion.div 
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -10, 0]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-40 left-[10%] text-brand-200 opacity-40 hidden lg:block"
        >
          <School size={80} />
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-md w-full space-y-10 bg-white/70 backdrop-blur-2xl p-10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] relative z-10 border border-white/60"
      >
        <div className="flex flex-col items-center">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 12 }}
            whileTap={{ scale: 0.9 }}
            className="bg-brand-600 p-5 rounded-[1.5rem] shadow-2xl shadow-brand-200/50 mb-8"
          >
            <School className="h-10 w-10 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h1 className="text-xs font-black text-brand-600 mb-2 uppercase tracking-[0.3em] font-display">
              TRƯỜNG PTDTBT THCS THU CÚC
            </h1>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight font-display leading-tight">
              {isRegistering ? "Gia nhập hệ thống" : "Chào mừng trở lại"}
            </h2>
            <p className="mt-3 text-slate-500 font-bold text-sm uppercase tracking-widest opacity-60">
              Quản lý bán trú thông minh
            </p>
          </motion.div>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <AnimatePresence mode="wait">
              {isRegistering && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="relative group"
                  >
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        required
                        className="block w-full pl-14 pr-5 py-4.5 border border-slate-200 rounded-2xl leading-5 bg-slate-50/30 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-base font-bold text-slate-700 transition-all duration-300"
                        placeholder="Họ và tên giáo viên"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </motion.div>
              )}
            </AnimatePresence>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-14 pr-5 py-4.5 border border-slate-200 rounded-2xl leading-5 bg-slate-50/30 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-base font-bold text-slate-700 transition-all duration-300"
                placeholder="Email giáo viên"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-14 pr-5 py-4.5 border border-slate-200 rounded-2xl leading-5 bg-slate-50/30 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-base font-bold text-slate-700 transition-all duration-300"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-start gap-3"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-red-700 font-bold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-5 px-6 border border-transparent text-base font-black rounded-2xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50 transition-all duration-300 shadow-2xl shadow-brand-200 uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6" />
              ) : (
                <span className="flex items-center">
                  {isRegistering ? "Đăng ký ngay" : "Đăng nhập hệ thống"}
                  {!loading && <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />}
                </span>
              )}
            </motion.button>
          </div>
        </form>
        
        <div className="mt-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-6 bg-white/50 backdrop-blur-md text-slate-400 font-black uppercase tracking-[0.3em] rounded-full border border-slate-100">Hoặc</span>
            </div>
          </div>

          <div className="mt-10 text-center space-y-6">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-black text-brand-600 hover:text-brand-700 transition-all flex items-center justify-center gap-3 mx-auto group"
            >
              <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              <span className="border-b-2 border-transparent group-hover:border-brand-600 transition-all">
                {isRegistering
                  ? "Đã có tài khoản? Đăng nhập"
                  : "Chưa có tài khoản? Đăng ký"}
              </span>
            </button>
            
            <div className="block">
                <button
                    onClick={() => navigate("/")}
                    className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.2em] transition-all"
                >
                    Quay lại trang chủ
                </button>
            </div>
          </div>
        </div>
      </motion.div>
      
      <div className="absolute bottom-10 text-center w-full">
        <p className="text-[10px] text-slate-400 font-black tracking-[0.4em] uppercase">
            PHÁT TRIỂN BỞI <span className="text-brand-600">DUY CÔNG HẠNH</span>
        </p>
      </div>
    </div>
  );
}
