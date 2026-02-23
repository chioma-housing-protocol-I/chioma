'use client';

import React from 'react';
import Link from 'next/link';

/**
 * CTA Component
 * Call-to-action section encouraging users to join the platform
 * Features a vibrant orange gradient background with dual action buttons
 */
const CTA = () => {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-700/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Ready to modernize your agency?
          </h2>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-white/95 font-medium max-w-2xl mx-auto">
            Join the open financial infrastructure for housing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="#"
              className="w-full sm:w-auto bg-white text-orange-600 hover:bg-white/95 px-8 py-4 rounded-lg text-base md:text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-200"
            >
              Join as Agent
            </Link>
            <Link
              href="#"
              className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-4 rounded-lg text-base md:text-lg font-bold transition-all duration-200"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
