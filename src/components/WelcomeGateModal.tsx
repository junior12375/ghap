import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  Building2,
  HardHat,
  Flame,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Phone,
  ArrowRight,
  X,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';
import plantHeroImage from '../assets/images/ghacem_plant_hero.jpg';

interface WelcomeGateModalProps {
  isOpen: boolean;
  onAccept: (userName: string, workId: string) => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

export const WelcomeGateModal: React.FC<WelcomeGateModalProps> = ({
  isOpen,
  onAccept,
  canDismiss = false,
  onClose,
}) => {
  const [userName, setUserName] = useState('');
  const [workId, setWorkId] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'terms'>('overview');
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const acceptanceSectionRef = useRef<HTMLDivElement>(null);

  // Initialize from previous saved session if available
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('ghacperm_terms_user_name') || '';
      const savedId = localStorage.getItem('ghacperm_terms_work_id') || '';
      if (savedName) setUserName(savedName);
      if (savedId) setWorkId(savedId);
    } catch {}
  }, []);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!hasAgreed) return;
    try {
      localStorage.setItem('ghacperm_terms_accepted', 'true');
      localStorage.setItem('ghacperm_terms_accepted_at', new Date().toISOString());
      if (userName.trim()) localStorage.setItem('ghacperm_terms_user_name', userName.trim());
      if (workId.trim()) localStorage.setItem('ghacperm_terms_work_id', workId.trim());
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
    onAccept(userName, workId);
  };

  const handleHeroCtaClick = () => {
    if (hasAgreed) {
      handleConfirm();
    } else {
      acceptanceSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const termsSections = [
    {
      title: '1. Strict Operational Compliance & Statutory Scope',
      content:
        'Access to GHACPerm (GHACEM Permit-to-Work System) is restricted to certified plant personnel, authorized contractors, and vetted EHS safety engineers. All work conducted within GHACEM industrial manufacturing plants (Tema and Takoradi) must comply strictly with the Ghana Factories, Offices and Shops Act (Act 328), Environmental Protection Agency (EPA) standards, and ISO 45001 Occupational Health and Safety guidelines.',
    },
    {
      title: '2. Work Order (WO) Integrity & Digital Authorization',
      content:
        'Every permit must be directly cross-referenced against a verified enterprise Work Order Number. Digital signatures applied using an employee Work ID carry legal authorization and binding operational accountability. Proxy signatures, retroactive backdating, or unverified field code approvals are strictly prohibited and subject to disciplinary and regulatory sanctions.',
    },
    {
      title: '3. High-Risk Tasks, Lockout / Tagout (LOTO) & Atmospheric Testing',
      content:
        'All high-risk operations—including Hot Work (welding, cutting, grinding), Confined Space Entry, Silo Entry, and Working at Height—require mandatory multi-point physical Lockout/Tagout (LOTO) isolation, photographic evidence, and certified 4-gas pre-entry atmospheric clearance (Oxygen 19.5%–23.5%, LEL 0%, CO < 25 ppm, H2S < 10 ppm). Continuous standby sentry and calibrated monitors are mandatory throughout execution.',
    },
    {
      title: '4. Non-Negotiable Stop Work Authority (SWA) & SIMOPs Clearance',
      content:
        'Every worker, supervisor, and contractor possesses the absolute, unconditional authority and obligation to STOP WORK immediately without fear of reprisal if any unsafe condition, unexpected atmospheric shift, or Simultaneous Operations (SIMOPs) spatial conflict arises. The integrated AI Conflict Radar must be consulted for cross-work-order safety verification prior to commencement.',
    },
    {
      title: '5. Cryptographic Audit Trail & Data Protection',
      content:
        'All permits, atmospheric logs, photo uploads, and supervisory authorizations are cryptographically sealed with PBKDF2/AES-GCM-256 encryption and SHA-256 tamper-evident digital hashes. GHACEM maintains an immutable audit register accessible by EHS inspectors and corporate governance auditors.',
    },
  ];

  const goldenRules = [
    {
      icon: <HardHat className="h-5 w-5 text-[#F5B700]" />,
      title: '1. Mandatory PPE',
      desc: 'Certified hard hat, steel-toe boots, eye protection, high-visibility vest, and task-specific gear at all times.',
    },
    {
      icon: <Lock className="h-5 w-5 text-emerald-500" />,
      title: '2. Zero Energy Isolation (LOTO)',
      desc: 'Lockout, Tagout, Try-Out verified on all mechanical, electrical, and pneumatic feeds prior to intervention.',
    },
    {
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      title: '3. Atmospheric Clearance & Fire Watch',
      desc: 'Pre-entry calibrated 4-gas clearance and mandatory 30-minute post-welding fire sentry coverage.',
    },
    {
      icon: <ArrowUpRight className="h-5 w-5 text-sky-500" />,
      title: '4. 100% Tie-Off at Height',
      desc: 'Full-body harnesses, shock-absorbing lanyards, and barricaded 10-meter drop exclusion zones below.',
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-green-500" />,
      title: '5. Stop Work Authority (SWA)',
      desc: 'Unconditional obligation to halt any activity immediately if safety controls fail or SIMOPs conflicts emerge.',
    },
  ];

  const bottomFeatureCards = [
    {
      id: 'ptw',
      title: 'Permit-to-Work Clearance',
      tag: 'Digital Approval',
      desc: 'Multi-stage authorization for Hot Work, Confined Space, Silo Entry, and Height Work.',
      icon: <HardHat className="h-5 w-5 text-[#0A0A0A]" />,
      color: 'bg-[#F5B700]',
    },
    {
      id: 'simops',
      title: 'AI Spatial Conflict Radar',
      tag: 'SIMOPs Protection',
      desc: 'Automated cross-auditing between simultaneous Work Orders to detect overlapping hazards.',
      icon: <Sparkles className="h-5 w-5 text-white" />,
      color: 'bg-[#004A2F]',
    },
    {
      id: 'rules',
      title: '5 Golden Life-Saving Rules',
      tag: 'Zero-Harm Policy',
      desc: 'Heidelberg Materials global standards for Lockout/Tagout, PPE, and Stop Work Authority.',
      icon: <ShieldCheck className="h-5 w-5 text-white" />,
      color: 'bg-emerald-700',
    },
    {
      id: 'audit',
      title: 'AES-256 Cryptographic Vault',
      tag: 'Tamper-Evident',
      desc: 'Immutable digital logs, photo evidence, and SHA-256 seal complying with Act 328.',
      icon: <Lock className="h-5 w-5 text-white" />,
      color: 'bg-neutral-900',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl my-auto rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0E1713] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* ============================================================== */}
        {/* 1. TOP CORPORATE NAVBAR (Matches GHACEM official website) */}
        {/* ============================================================== */}
        <header className="bg-white dark:bg-[#0E1713] border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 select-none">
          {/* Left Brand Lockup */}
          <div className="flex items-center gap-3">
            {/* GHACEM Emblem */}
            <GhacemLogo className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 drop-shadow-sm" />

            <div className="flex flex-col">
              <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-neutral-900 dark:text-white leading-none">
                GHACEM
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                The Nation Builder
              </span>
            </div>

            {/* Vertical Hairline Separator */}
            <div className="h-7 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

            {/* Heidelberg Materials Co-Branding */}
            <div className="hidden sm:flex items-center gap-2">
              <HeidelbergMaterialsLogo className="h-6" showText={false} />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">
                  HEIDELBERG MATERIALS
                </span>
                <span className="text-[9px] text-neutral-400">
                  A Heidelberg Materials Company
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links (Corporate Website Mockup) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <button
              onClick={() => setActiveTab('overview')}
              className={`hover:text-[#D49E00] transition-colors pb-1 border-b-2 ${
                activeTab === 'overview'
                  ? 'border-[#F5B700] text-neutral-900 dark:text-white'
                  : 'border-transparent'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`hover:text-[#D49E00] transition-colors pb-1 border-b-2 ${
                activeTab === 'rules'
                  ? 'border-[#F5B700] text-neutral-900 dark:text-white'
                  : 'border-transparent'
              }`}
            >
              5 Life-Saving Rules
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`hover:text-[#D49E00] transition-colors pb-1 border-b-2 ${
                activeTab === 'terms'
                  ? 'border-[#F5B700] text-neutral-900 dark:text-white'
                  : 'border-transparent'
              }`}
            >
              Terms &amp; Policy
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              ISO 45001 EHS
            </span>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Icon */}
            <button
              type="button"
              onClick={() => setShowSearchModal(!showSearchModal)}
              title="Search Plant EHS Documents"
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Corporate Yellow CTA: Contact Us / Safety Desk */}
            <a
              href="tel:+233303204201"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-display font-bold text-xs bg-[#F5B700] hover:bg-[#E0A700] text-neutral-950 transition-colors shadow-sm"
            >
              <Phone className="h-3 w-3" />
              <span className="hidden sm:inline">Plant Safety Desk</span>
              <span className="sm:hidden">Help</span>
            </a>

            {/* Close button if user opened in review mode */}
            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-1"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {/* Optional Search Bar dropdown */}
        {showSearchModal && (
          <div className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-3 px-6 flex items-center gap-3">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search GHACEM EHS regulations, LOTO procedures, permit rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-neutral-800 dark:text-neutral-200 outline-none placeholder:text-neutral-400"
            />
            <button
              onClick={() => setShowSearchModal(false)}
              className="text-xs text-neutral-500 hover:underline"
            >
              Done
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCROLLABLE MAIN CONTENT AREA */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto">
          
          {/* ============================================================== */}
          {/* 2. HERO SECTION: "Building Ghana’s Future" */}
          {/* ============================================================== */}
          <div className="relative bg-neutral-950 text-white min-h-[300px] sm:min-h-[360px] md:min-h-[400px] flex flex-col justify-end overflow-hidden">
            {/* Background Image: Cement Plant & Silos */}
            <div
              className="absolute inset-0 bg-cover bg-center filter brightness-[0.88] contrast-[1.12]"
              style={{
                backgroundImage: `url(${plantHeroImage})`,
              }}
            />
            {/* Rich cinematic gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

            {/* Hero Copy Content */}
            <div className="relative z-10 p-5 sm:p-8 md:p-10 max-w-3xl space-y-3 sm:space-y-4">
              
              {/* Eyebrow Kicker */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F5B700]/20 border border-[#F5B700]/40 text-[#F5B700] text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                <span>GHACEM LIMITED · TEMA &amp; TAKORADI PLANTS</span>
              </div>

              {/* Exact Hero Headline from uploaded image */}
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-[1.1] drop-shadow-md">
                Building Ghana’s Future
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm md:text-base text-neutral-200 leading-relaxed font-normal max-w-2xl drop-shadow-sm">
                Welcome to <strong>GHACPerm</strong> — GHACEM’s official digital Permit-to-Work &amp; Operational Safety authorization system. Ensuring zero-incident manufacturing, verified supervisory sign-offs, and ISO 45001 EHS compliance.
              </p>

              {/* Yellow Hero Action Button */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleHeroCtaClick}
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-md font-display font-bold text-xs sm:text-sm bg-[#F5B700] hover:bg-[#E0A700] text-neutral-950 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {hasAgreed ? 'Access GHACPerm Portal' : 'Accept Terms & Access GHACPerm'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rules');
                    acceptanceSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md font-display font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20 transition-colors"
                >
                  <HardHat className="h-4 w-4 text-[#F5B700]" />
                  <span>View 5 Golden Rules</span>
                </button>
              </div>
            </div>

            {/* Subtle Plant Status Chip */}
            <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Plant EHS: ACTIVE &amp; SECURED</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 3. FOUR BOTTOM FEATURE CARDS (Matches official website grid) */}
          {/* ============================================================== */}
          <div className="bg-neutral-100 dark:bg-[#070D0A] p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {bottomFeatureCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => {
                    if (card.id === 'rules') setActiveTab('rules');
                    else if (card.id === 'ptw' || card.id === 'audit') setActiveTab('terms');
                    else setActiveTab('overview');
                  }}
                  className="p-4 rounded-xl bg-white dark:bg-[#121E18] border border-neutral-200 dark:border-neutral-800/80 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#F5B700]/50"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${card.color}`}
                    >
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 group-hover:text-[#F5B700] transition-colors">
                      {card.tag}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-[#D49E00] dark:group-hover:text-[#F5B700] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4. TAB NAVIGATION & TERMS CONTENT SECTION */}
          {/* ============================================================== */}
          <div className="p-4 sm:p-6 space-y-5" ref={acceptanceSectionRef}>
            
            {/* Interactive Tab Selectors */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'overview'
                      ? 'bg-[#F5B700] text-neutral-950 font-bold shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Plant EHS Overview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'rules'
                      ? 'bg-[#F5B700] text-neutral-950 font-bold shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  <HardHat className="h-3.5 w-3.5" />
                  <span>5 Golden Life-Saving Rules</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('terms')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'terms'
                      ? 'bg-[#F5B700] text-neutral-950 font-bold shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Terms &amp; Statutory Policy</span>
                </button>
              </div>

              {activeTab === 'terms' && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 font-medium"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Safety Charter</span>
                </button>
              )}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-neutral-800 dark:text-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-display font-bold text-sm text-amber-900 dark:text-[#F5B700]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Mandatory Operational Safety Clearance Notice</span>
                  </div>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                    Prior to obtaining digital permit authorization or executing any maintenance, engineering, or contractor work within GHACEM facilities (Tema and Takoradi), all individuals must accept and strictly comply with the <strong>GHACEM Corporate Safety Charter</strong> and <strong>Heidelberg Materials Life-Saving Rules</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121E18] space-y-1">
                    <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#F5B700]" />
                      <span>Work Order Accountability</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Every permit must be linked to a valid Work Order. Digital approvals carry legal accountability.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121E18] space-y-1">
                    <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      <span>SIMOPs Conflict Radar</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Cross-audits active permits in the same plant zone to eliminate co-located hazardous clashes.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121E18] space-y-1">
                    <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span>Stop Work Authority</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      You are empowered and obligated to STOP any unsafe work without fear of disciplinary reprisal.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: 5 Golden Rules */}
            {activeTab === 'rules' && (
              <div className="space-y-3">
                <div className="font-display font-bold text-sm text-neutral-900 dark:text-white mb-2">
                  Heidelberg Materials &amp; GHACEM 5 Golden Life-Saving Rules
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {goldenRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121E18] flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                        {rule.icon}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-neutral-900 dark:text-white">
                          {rule.title}
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {rule.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Detailed Terms & Statutory Sections */}
            {activeTab === 'terms' && (
              <div className="space-y-3">
                <div className="font-display font-bold text-sm text-neutral-900 dark:text-white mb-1">
                  Statutory Permit-to-Work Regulations &amp; Legal Framework
                </div>
                <div className="space-y-2">
                  {termsSections.map((sec, idx) => {
                    const isExpanded = expandedSection === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121E18] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedSection(isExpanded ? null : idx)}
                          className="w-full p-3 text-left font-semibold text-xs text-neutral-900 dark:text-white flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                          <span>{sec.title}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-neutral-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3.5 pb-3 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-2.5">
                            {sec.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 5. USER IDENTIFICATION & MANDATORY TERMS ACCEPTANCE */}
            {/* ============================================================== */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Your Full Name <span className="font-normal text-neutral-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kwame Osei / EHS Engineer"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0E1713] px-3 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-[#F5B700] focus:ring-1 focus:ring-[#F5B700] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Employee / Contractor Work ID <span className="font-normal text-neutral-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GH-10482"
                    value={workId}
                    onChange={(e) => setWorkId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0E1713] px-3 py-2 text-xs font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-[#F5B700] focus:ring-1 focus:ring-[#F5B700] outline-none"
                  />
                </div>
              </div>

              {/* Mandatory Checkbox Agreement Card */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${
                  hasAgreed
                    ? 'border-[#F5B700] bg-amber-500/10 dark:bg-amber-500/10'
                    : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 hover:bg-neutral-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#F5B700] focus:ring-[#F5B700] accent-[#F5B700] cursor-pointer shrink-0"
                />
                <div className="space-y-1">
                  <span className="text-xs text-neutral-900 dark:text-white leading-relaxed font-semibold block">
                    I declare that I have read, understood, and agree to abide by the GHACEM Corporate Permit-to-Work Terms and Conditions, the Heidelberg Materials Life-Saving Rules, and all ISO 45001 plant safety standards.
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                    Acknowledgment is digitally registered with your browser session and audit logs.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 6. MODAL FOOTER ACTIONS */}
        {/* ============================================================== */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3.5 bg-neutral-50 dark:bg-[#0E1713] shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>GHACEM LIMITED · THE NATION BUILDER · ISO 45001</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto">
            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Close
              </button>
            )}

            <button
              type="button"
              disabled={!hasAgreed}
              onClick={handleConfirm}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-display font-bold text-xs sm:text-sm transition-all shadow-md ${
                hasAgreed
                  ? 'bg-[#F5B700] hover:bg-[#E0A700] text-neutral-950 cursor-pointer hover:shadow-lg'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 border border-neutral-300 dark:border-neutral-700 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Accept Terms &amp; Access GHACPerm</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

