"use client";

import { useState } from "react";
import { Camera, Github, Menu, X, ArrowUpRight, Terminal, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/30 to-secondary/30 border border-primary/50 flex items-center justify-center text-primary group-hover:shadow-glow-cyan transition-all">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-primary transition-colors">
                StreamLab
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-semibold">
                v1.0.1
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline-block">
              Virtual IP Camera & ONVIF Lab
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground" aria-label="Main Navigation">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#protocols" className="hover:text-white transition-colors">
            Protocols
          </a>
          <a href="#architecture" className="hover:text-white transition-colors">
            Architecture
          </a>
          <a href="#sdks" className="hover:text-white transition-colors">
            Client SDKs
          </a>
          <a href="#use-cases" className="hover:text-white transition-colors">
            Use Cases
          </a>
          <a href="#quickstart" className="hover:text-white transition-colors">
            Quickstart
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right CTA / GitHub button */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="https://github.com/nomi181472/lab-stream-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-surface-100 hover:bg-surface-50 border border-border transition-all hover:border-slate-600"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">MIT</span>
          </a>

          <a
            href="#quickstart"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-background bg-primary hover:bg-primary-hover shadow-glow-cyan transition-all"
          >
            <Terminal className="w-4 h-4" />
            <span>Get Started</span>
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-surface-100 focus:outline-none"
          aria-label="Toggle Mobile Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-border px-4 py-6 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-3 text-base font-medium text-slate-200">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#protocols"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-primary transition-colors"
            >
              Protocols & Specs
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-primary transition-colors"
            >
              Architecture Deep Dive
            </a>
            <a
              href="#sdks"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-primary transition-colors"
            >
              6-Language Verification SDKs
            </a>
            <a
              href="#use-cases"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-primary transition-colors"
            >
              Use Cases (AI, NVR, CI/CD)
            </a>
            <a
              href="#quickstart"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-primary transition-colors"
            >
              Quickstart Deployment
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-primary transition-colors"
            >
              FAQ
            </a>
          </nav>
          <div className="pt-4 border-t border-border flex flex-col gap-2.5">
            <a
              href="https://github.com/nomi181472/lab-stream-simulator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold bg-surface-100 border border-border text-white"
            >
              <Github className="w-4 h-4" />
              <span>Star on GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </a>
            <a
              href="#quickstart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold bg-primary text-background"
            >
              <Terminal className="w-4 h-4" />
              <span>Launch Simulator</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
