'use client';

import React from 'react';

const ContactPage = () => {
  return (
    <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Contact Info */}
        <div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-6">
            Get in touch
          </h1>
          <p className="text-white/60 text-lg mb-12 max-w-md leading-relaxed">
            Whether you have questions about our AI models, enterprise licensing, or need support with your portfolio, our team is ready to assist.
          </p>

          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white shrink-0 pt-1">
                <iconify-icon icon="solar:letter-linear" width="24"></iconify-icon>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Email</h3>
                <p className="text-sm text-white/40 mb-1">Our friendly team is here to help.</p>
                <a href="mailto:hello@portai.finance" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">hello@portai.finance</a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white shrink-0 pt-1">
                <iconify-icon icon="solar:buildings-linear" width="24"></iconify-icon>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Office</h3>
                <p className="text-sm text-white/40 mb-1">Come say hello at our HQ.</p>
                <p className="text-sm text-white/60">100 Wall Street, Suite 400<br />New York, NY 10005</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white shrink-0 pt-1">
                <iconify-icon icon="solar:chat-round-dots-linear" width="24"></iconify-icon>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Social</h3>
                <p className="text-sm text-white/40 mb-3">Follow our market updates.</p>
                <div className="flex gap-3 text-white/60">
                    <a href="#" className="hover:text-white transition-colors"><iconify-icon icon="solar:brand-twitter-linear" width="20"></iconify-icon></a>
                    <a href="#" className="hover:text-white transition-colors"><iconify-icon icon="solar:brand-linkedin-linear" width="20"></iconify-icon></a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-panel p-8 md:p-10 rounded-3xl">
          <h2 className="text-2xl font-medium text-white mb-8">Send us a message</h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">First Name</label>
                <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="Jane" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Last Name</label>
                <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="Doe" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
              <input type="email" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="jane@example.com" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Subject</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                <option value="support">General Support</option>
                <option value="sales">Sales & Enterprise</option>
                <option value="api">API Access</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Message</label>
              <textarea rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none" placeholder="How can we help?"></textarea>
            </div>

            <button type="button" className="w-full py-4 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
