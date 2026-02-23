'use client';

import React from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Instagram } from 'lucide-react';

/**
 * Footer Component
 * Comprehensive footer with company information, navigation links, and social media
 * Features a dark theme with organized link sections
 */
const Mainfooter = () => {
  return (
    <footer className="bg-slate-950 text-white py-16 md:py-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          {/* Company Info Column */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-4">Chioma</h3>
              <p className="text-slate-400 leading-relaxed text-sm max-w-xs">
                Reimagining the rental experience with transparency, speed, and
                trust. Powered by next-generation blockchain technology.
              </p>
            </div>
            <p className="text-slate-500 text-xs">
              © 2026 Chioma. All rights reserved.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">
              Platform
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Browse Homes
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  List Property
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  For Agents
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Mainfooter Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Press
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Social Links and Status */}
        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Social Media Icons */}
          <div className="flex items-center space-x-6">
            <Link
              href="#"
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={20} />
            </Link>
            <Link
              href="#"
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={20} />
            </Link>
            <Link
              href="#"
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={20} />
            </Link>
          </div>

          {/* System Status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-slate-400">System Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Mainfooter;
