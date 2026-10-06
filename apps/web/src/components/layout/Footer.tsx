import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200/90 bg-slate-50 mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-700 text-white text-xs font-bold">
                🌱
              </span>
              <span className="text-lg font-bold text-slate-900">RythuConnect</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              A multilingual farmer-to-buyer marketplace helping Indian farmers sell crops directly,
              minimize middleman dependency, and achieve fair, transparent pricing.
            </p>
          </div>

          <div className="space-y-1 text-sm text-slate-500">
            <div className="font-medium text-slate-700">Supported Languages</div>
            <div>English (en) • తెలుగు (te) • हिन्दी (hi)</div>
            <div className="pt-2 text-xs text-slate-400">
              © {new Date().getFullYear()} RythuConnect. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
