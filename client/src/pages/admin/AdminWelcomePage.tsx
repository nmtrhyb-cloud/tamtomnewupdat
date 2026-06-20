import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { 
  Phone, 
  MessageCircle, 
  ChevronLeft, 
  BarChart3,
  CheckCircle2,
  Zap,
  Shield,
  Globe,
  Star
} from 'lucide-react';

const FEATURES = [
  { icon: BarChart3, text: 'لوحة تحكم شاملة ومتكاملة' },
  { icon: Zap,       text: 'أداء عالي وسرعة استجابة فائقة' },
  { icon: Shield,    text: 'حماية متقدمة للبيانات والأمان' },
  { icon: Globe,     text: 'دعم متعدد اللغات والمناطق' },
  { icon: Star,      text: 'تجربة مستخدم احترافية متميزة' },
];

export default function AdminWelcomePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleEnterDashboard = () => {
    setLocation('/admin/dashboard');
  };

  return (
    <div
      dir="rtl"
      className={`min-h-screen flex transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #fff 40%, #fef2f2 100%)' }}
    >
      {/* Left column — promo panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col bg-gradient-to-br from-[#E53225] via-[#c42b1f] to-[#a01e15] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/3 -left-10 w-48 h-48 rounded-full bg-[#5BB827]/20 pointer-events-none" />

        <div className="flex-1 flex flex-col justify-center items-center px-12 relative z-10">
          {/* Logo image with glow */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-2xl blur-3xl bg-white/20 scale-110" />
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
              <img
                src="/itqansoft-promo.png"
                alt="itQANSoft - لنظم المعلومات والحلول البرمجية"
                className="w-full max-w-sm object-contain"
                style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.3))' }}
              />
            </div>
          </div>

          {/* Features list */}
          <div className="w-full max-w-sm space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90 text-sm font-medium">{text}</span>
                <CheckCircle2 className="h-4 w-4 text-[#5BB827] mr-auto flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-white/60 text-xs font-medium tracking-widest uppercase">للتواصل والدعم الفني</p>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
              <Phone className="h-5 w-5 text-[#5BB827]" />
              <a
                href="tel:777146387"
                className="text-white font-black text-xl tracking-widest hover:text-[#5BB827] transition-colors"
                dir="ltr"
              >
                777 146 387
              </a>
            </div>
            <a
              href="https://wa.me/777146387"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              تواصل عبر واتساب
            </a>
          </div>
        </div>

        {/* Bottom brand strip */}
        <div className="px-12 py-5 border-t border-white/10 flex items-center justify-between">
          <span className="text-white/40 text-xs">© 2026 itQANSoft</span>
          <span className="text-white/40 text-xs">جميع الحقوق محفوظة</span>
        </div>
      </div>

      {/* Right column — welcome panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100 max-w-[260px]">
              <img
                src="/itqansoft-promo.png"
                alt="itQANSoft"
                className="w-full object-contain"
              />
            </div>
          </div>

          {/* Welcome heading */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 bg-[#E53225]/10 text-[#E53225] rounded-full px-4 py-1.5 mb-4 text-sm font-bold">
              <BarChart3 className="h-4 w-4" />
              نظام الإدارة المتكامل
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 leading-tight">
              مرحباً بك
              {user?.name ? (
                <span className="text-[#E53225]"> {user.name}</span>
              ) : null}
            </h1>
            <p className="text-gray-500 text-base leading-relaxed">
              في لوحة تحكم طمطوم المتطورة.<br />
              اضغط على الزر أدناه للدخول إلى نظرة عامة على النظام.
            </p>
          </div>

          {/* Enter button */}
          <button
            onClick={handleEnterDashboard}
            className="w-full h-16 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#E53225]/30 transition-all duration-200 active:scale-95 hover:shadow-xl hover:shadow-[#E53225]/40 relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #E53225 0%, #c42b1f 100%)' }}
          >
            <span className="relative z-10">الدخول إلى لوحة التحكم</span>
            <ChevronLeft className="h-6 w-6 relative z-10 group-hover:-translate-x-1 transition-transform" />
            {/* shimmer */}
            <span className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-700" />
          </button>

          {/* Mobile contact */}
          <div className="lg:hidden mt-8 flex flex-col items-center gap-3">
            <p className="text-gray-400 text-xs font-medium tracking-widest uppercase">للتواصل والدعم الفني</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-6 py-3 border border-gray-100">
              <Phone className="h-5 w-5 text-[#E53225]" />
              <a
                href="tel:777146387"
                className="text-gray-900 font-black text-xl tracking-widest"
                dir="ltr"
              >
                777 146 387
              </a>
            </div>
          </div>

          {/* Powered by */}
          <div className="mt-10 text-center">
            <p className="text-gray-300 text-xs font-medium">
              مدعوم بتقنيات{' '}
              <span className="font-black text-[#E53225]">itQANSoft</span>
              {' '}· لنظم المعلومات والحلول البرمجية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
