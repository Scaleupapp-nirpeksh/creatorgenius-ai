// frontend/src/components/NavHeader.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

// Icon components
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

interface NavLink {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

export default function NavHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const links: NavLink[] = [
    { 
      name: 'Dashboard', 
      href: '/dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    { 
      name: 'Content Ideation', 
      href: '/ideation',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      )
    },
    { 
      name: 'Saved Ideas', 
      href: '/saved-ideas',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    }
  ];

  return (
    <nav 
      className={`sticky top-0 z-40 w-full backdrop-blur transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 dark:bg-neutral-900/90 shadow-md' 
          : 'bg-white dark:bg-neutral-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Menu */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {/* Replace with your actual logo */}
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-2">
                CG
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-500">
                CreatorGenius
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-6">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.name}
                    href={link.href}
                    className={`
                      flex items-center px-2 py-1 text-sm font-medium transition-all duration-200 ease-out rounded-md group
                      ${isActive 
                        ? 'text-primary-600 dark:text-primary-400' 
                        : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white'
                      }
                    `}
                  >
                    <span className={`
                      relative inline-flex items-center gap-1.5 py-1.5
                      ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary-500 dark:after:bg-primary-400' : ''}
                    `}>
                      {link.icon}
                      {link.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* User menu and mobile menu button */}
          <div className="flex items-center space-x-4">
            {/* User menu/avatar */}
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                {user && (
                  <div className="hidden md:flex flex-col items-end">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {user.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user.subscriptionTier || 'Free Tier'}
                    </p>
                  </div>
                )}
                
                <div className="relative">
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-colors duration-200 ease-out rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <LogoutIcon />
                    <span className="hidden md:inline">Logout</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on state */}
      <div 
        className={`md:hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen 
            ? 'max-h-[400px] opacity-100 visible' 
            : 'max-h-0 opacity-0 invisible'
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-neutral-200 dark:border-neutral-700">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ease-out
                  ${isActive 
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' 
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                  }
                `}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
          
          {/* Show user info in mobile menu */}
          {user && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2">
              <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                Signed in as <span className="font-semibold text-neutral-800 dark:text-neutral-200">{user.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}