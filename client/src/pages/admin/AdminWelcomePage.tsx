import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

const CONTACT = '777146387';
const WHATSAPP_URL = `https://wa.me/967${CONTACT}`;
const TEL_URL = `tel:${CONTACT}`;

export default function AdminWelcomePage() {
  return (
    <div
      className="flex flex-col md:flex-row-reverse min-h-[calc(100vh-64px)] bg-white"
      dir="rtl"
    >
      {/* ===== Left panel — itQANSoft logo (appears left due to flex-row-reverse) ===== */}
      <div className="flex-1 flex items-center justify-center bg-white border-b md:border-b-0 md:border-r border-gray-100 py-12 px-8">
        <div className="w-full max-w-md">
          <img
            src="/itqansoft-promo.png"
            alt="itQANSoft — لنظم المعلومات والحلول البرمجية"
            className="w-full object-contain"
            draggable={false}
          />
        </div>
      </div>

      {/* ===== Right panel — promotional ad ===== */}
      <div className="flex-1 flex items-center justify-center py-12 px-8 bg-gradient-to-br from-gray-50 via-white to-red-50">
        <div className="w-full max-w-md space-y-8 text-center">

          {/* Brand badge */}
          <div className="inline-flex items-center gap-2 bg-[#E53225] text-white rounded-full px-5 py-2 text-sm font-bold shadow-md shadow-[#E53225]/30">
            <span>itQANSoft</span>
            <span className="opacity-60">|</span>
            <span>حلول برمجية متكاملة</span>
          </div>

          {/* Headline */}
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-snug mb-3">
              شريكك الأمثل في
              <br />
              <span className="text-[#E53225]">التحول الرقمي</span>
            </h2>
            <p className="text-gray-500 text-base leading-relaxed">
              نقدم أنظمة إدارة متطورة ومخصصة تلبي احتياجات عملك وتساعدك على النمو والتوسع بكفاءة عالية.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['تطوير تطبيقات', 'أنظمة إدارة', 'حلول سحابية', 'دعم فني متواصل', 'تصميم واجهات'].map(f => (
              <span
                key={f}
                className="bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
              >
                {f}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs font-medium">تواصل معنا</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Contact buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Phone call */}
            <a
              href={TEL_URL}
              className="flex items-center justify-center gap-2.5 bg-[#E53225] hover:bg-[#c42b1f] text-white font-bold rounded-2xl px-6 py-4 transition-all duration-200 shadow-lg shadow-[#E53225]/30 hover:shadow-xl active:scale-95"
            >
              <Phone className="h-5 w-5 flex-shrink-0" />
              <span dir="ltr" className="text-lg tracking-widest font-black">
                {CONTACT.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
              </span>
            </a>

            {/* WhatsApp */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold rounded-2xl px-6 py-4 transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-xl active:scale-95"
            >
              <MessageCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-base font-bold">واتساب</span>
            </a>
          </div>

          {/* Footer note */}
          <p className="text-gray-300 text-xs">
            © 2026 itQANSoft — جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
