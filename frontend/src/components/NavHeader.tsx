// frontend/src/components/NavHeader.tsx
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  name: string;
  href: string;
}

export default function NavHeader() {
  const pathname = usePathname();
  
  const links: NavLink[] = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Content Ideation', href: '/ideation' },
    { name: 'Saved Ideas', href: '/saved-ideas' }
  ];

  return (
    <div className="bg-white shadow mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              {/* Logo could go here */}
              <span className="text-lg font-bold text-indigo-600">CreatorGenius AI</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.name}
                    href={link.href}
                    className={`${
                      isActive
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu - visible only on small screens */}
      <div className="sm:hidden border-t border-gray-200">
        <div className="px-2 py-3 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`${
                  isActive
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}