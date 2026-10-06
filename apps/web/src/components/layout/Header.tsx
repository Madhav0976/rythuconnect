import React from 'react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo Area */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg"
          aria-label="RythuConnect Home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold shadow-xs group-hover:bg-emerald-800 transition-colors">
            🌱
          </span>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
              RythuConnect
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider -mt-1 hidden sm:block">
              Direct Agriculture Marketplace
            </span>
          </div>
        </Link>

        {/* Global Status / Tagline */}
        <div className="flex items-center gap-3">
          <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
            Farmer & Buyer Direct
          </Badge>
          <div className="text-xs font-medium text-slate-500 px-2 py-1 rounded-md bg-slate-100">
            India 🇮🇳
          </div>
        </div>
      </div>
    </header>
  );
};
