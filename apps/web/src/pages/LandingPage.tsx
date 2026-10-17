import React, { useState, useCallback, useEffect, useId } from 'react';
import { ArrowRight, ArrowUpRight, Activity, Bell, History, Pause, Play, LockKeyhole, Zap } from 'lucide-react';
import { ElectricBrandMark } from '../components/ElectricBrandMark';
import { AuthModal } from '../components/Auth/AuthModal';
import { useReducedMotion } from '../motion/useReducedMotion';
import './LandingPage.css';

export interface LandingPageProps {
  onSignIn?: (prefillEmail?: string) => void;
  onSuccess?: () => void;
  initialAuthOpen?: boolean;
}

const inputPaths = [
  'M72 100H162Q202 100 202 140V220Q202 250 242 250H274',
  'M72 190H154Q182 190 182 218V252Q182 270 222 270H274',
  'M72 280H274',
  'M72 370H154Q182 370 182 342V308Q182 290 222 290H274',
  'M72 460H162Q202 460 202 420V340Q202 310 242 310H274',
];
const channelSlots = ['CH01', 'CH02', 'CH03', 'CH04', 'CH05'];

function EnergyDiagram({ selected }: { selected: number }) {
  const titleId = useId();
  return <svg className="energy-diagram" viewBox="0 0 680 560" role="img" aria-labelledby={titleId}>
    <title id={titleId}>Five physical channel inputs connected to one energy workspace. Illustrative architecture.</title>
    <defs>
      <radialGradient id={`${titleId}-wash`}><stop stopColor="#AAAAAA" stopOpacity=".1"/><stop offset="1" stopColor="#AAAAAA" stopOpacity="0"/></radialGradient>
    </defs>
    <circle cx="350" cy="280" r="240" fill={`url(#${titleId}-wash)`}/>
    <g fill="none" stroke="#303030" strokeWidth="1">
      <circle cx="350" cy="280" r="178" strokeDasharray="2 9"/>
      <circle cx="350" cy="280" r="126"/>
      <path d="M350 56V78M350 482V504M126 280H148M552 280H574"/>
      <path d="M232 79L242 96M458 464L468 481M126 154L143 164M557 398L574 408"/>
    </g>
    <text className="diagram-label" x="350" y="38" textAnchor="middle">A SINGLE POINT OF VIEW</text>
    {inputPaths.map((d, index) => <g key={d} data-selected={selected === index} className="diagram-input">
      <path d={d} className="diagram-route" fill="none"/>
      {selected === index && <path d={d} className="diagram-flow" pathLength="100" fill="none"/>}
      <circle cx="52" cy={100 + index * 90} r="21" className="diagram-node"/>
      <text x="52" y={104 + index * 90} textAnchor="middle" className="diagram-number">{String(index + 1).padStart(2, '0')}</text>
      <text x="94" y={85 + index * 90} className="diagram-label">{channelSlots[index]}</text>
    </g>)}
    <path d="M430 280H602" fill="none" stroke="#777777" strokeWidth="1.5"/>
    <circle cx="608" cy="280" r="5" fill="#EFEFEF"/>
    <text x="548" y="253" className="diagram-label" textAnchor="middle">WORKSPACE</text>
    <text x="548" y="309" className="diagram-label" textAnchor="middle">ONE CLEAR PICTURE</text>
    <circle cx="350" cy="280" r="86" fill="#171717" stroke="#858585"/>
    <circle cx="350" cy="280" r="76" fill="none" stroke="#3B3B3B"/>
    <text x="350" y="292" textAnchor="middle" className="diagram-core-number">05</text>
    <text x="350" y="318" textAnchor="middle" className="diagram-core-label">CHANNEL INPUTS</text>
    <path d="M338 223L350 204L347 218H362L350 237L353 223Z" fill="#EFEFEF"/>
    <text x="350" y="530" textAnchor="middle" className="diagram-label">ELECTRICAL SIGNAL → USEFUL INSIGHT</text>
  </svg>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onSuccess, initialAuthOpen = false }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(initialAuthOpen);
  const [prefillEmail, setPrefillEmail] = useState('admin@minsakthi.local');
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [selectedInput, setSelectedInput] = useState(0);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const { isReducedMotion } = useReducedMotion();
  const backgroundPaused = ambientPaused || isReducedMotion || !pageVisible || isAuthModalOpen;
  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);
  const handleCloseAuth = useCallback(() => setIsAuthModalOpen(false), []);
  const handleOpenAuth = (email = 'admin@minsakthi.local') => {
    setPrefillEmail(email); setIsAuthModalOpen(true); onSignIn?.(email);
  };

  return <div className="landing-container" data-ambient-paused={backgroundPaused}>
    <div className="home-dark-stage">
      <header className="landing-navbar home-wrap">
        <a href="/" className="landing-brand" aria-label="MIN-SAKTHI Home">
          <ElectricBrandMark size={32}/><span>MIN-SAKTHI<small>ENERGY INTELLIGENCE</small></span>
        </a>
        <nav className="home-nav" aria-label="Main Navigation"><a href="#benefits">The platform</a><a href="#preview">Inside the workspace</a></nav>
        <button type="button" onClick={() => handleOpenAuth()} className="landing-signin-btn">Sign In<ArrowUpRight size={15} aria-hidden="true"/></button>
      </header>

      <main>
        <section className="landing-hero home-wrap" id="overview" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="home-eyebrow"><span className="home-small-line"/>ENERGY INTELLIGENCE, MADE CLEAR</p>
            <h1 id="home-title">Power, seen<br/>with <em>clarity.</em></h1>
            <p className="home-hero-description">From the circuit to the complete picture. Understand your electrical loads, spot what needs attention, and make every reading count.</p>
            <div className="home-hero-actions">
              <button type="button" onClick={() => handleOpenAuth()} className="home-button home-button-primary">Open workspace<ArrowUpRight size={18} aria-hidden="true"/></button>
              <a href="#preview" className="home-quiet-link">Take a closer look<ArrowRight size={16} aria-hidden="true"/></a>
            </div>
            <p className="home-access-note"><LockKeyhole size={12} aria-hidden="true"/>Secure access · Your site. Your data.</p>
          </div>
          <figure className="home-instrument" aria-label="Interactive channel architecture">
            <div className="home-instrument-top"><span>MIN-SAKTHI / SIGNAL ARCHITECTURE</span><span>01—05</span></div>
            <EnergyDiagram selected={selectedInput}/>
            <figcaption className="home-instrument-caption">
              <span>Explore an input</span>
              <div className="home-input-controls" role="group" aria-label="Explore channel inputs">
                {channelSlots.map((slot, index) => <button key={slot} type="button" aria-label={`Explore ${slot}`} aria-pressed={selectedInput === index} onClick={() => setSelectedInput(index)}>{String(index + 1).padStart(2, '0')}</button>)}
              </div>
            </figcaption>
            <div className="home-diagram-foot"><span>Illustrative architecture · No live readings</span>{!isReducedMotion && <button type="button" className="landing-ambient-toggle" onClick={() => setAmbientPaused(paused => !paused)} aria-pressed={ambientPaused} aria-label={ambientPaused ? 'Resume background animation' : 'Pause background animation'}>{ambientPaused ? <Play size={11} aria-hidden="true"/> : <Pause size={11} aria-hidden="true"/>}<span>{ambientPaused ? 'Resume' : 'Pause'}</span></button>}</div>
          </figure>
          <div className="home-spec-strip"><span><strong>05</strong> Physical channels</span><span><Activity size={15} aria-hidden="true"/>Live electrical readings</span><span><History size={15} aria-hidden="true"/>A searchable history</span><a href="#benefits">Discover the platform<span aria-hidden="true">↓</span></a></div>
        </section>
      </main>
    </div>

    <section className="home-platform" id="benefits" aria-labelledby="platform-title">
      <div className="home-wrap">
        <div className="home-section-intro"><div><p className="home-eyebrow">BUILT AROUND WHAT MATTERS</p><h2 id="platform-title">A better view.<br/>A clearer decision.</h2></div><p>Bring the readings, the context, and the next step together. One focused workspace for the people who keep things running.</p></div>
        <div className="home-principles">
          {[{icon: Activity, no:'01', name:'See the present.', text:'Voltage, current, power and frequency, together. Know which channels are reporting and when the last reading arrived.'}, {icon: Bell, no:'02', name:'Find what needs you.', text:'Review recorded alerts and channel conditions without digging through a wall of numbers.'}, {icon: History, no:'03', name:'Understand the past.', text:'Explore previous readings, trace changes over time, and keep the context behind your energy use.'}].map(({icon: Icon, no, name, text}) => <article key={no} className="home-principle"><div><span>{no} /</span><Icon size={22} strokeWidth={1.5} aria-hidden="true"/></div><h3>{name}</h3><p>{text}</p></article>)}
        </div>
      </div>
    </section>

    <section className="home-preview-section home-wrap" id="preview" aria-labelledby="preview-title">
      <div className="home-preview-copy"><p className="home-eyebrow">INSIDE THE WORKSPACE</p><h2 id="preview-title">Less noise.<br/><em>More understanding.</em></h2><p>Five channels. A focused overview. The detail you need, exactly when you need it.</p><button type="button" className="home-quiet-link" onClick={() => handleOpenAuth()}>Step into your workspace<ArrowUpRight size={18} aria-hidden="true"/></button></div>
      <div className="home-product-preview">
        <div className="home-preview-bar"><span><Zap size={15} aria-hidden="true"/>Channel overview</span><span className="home-preview-badge">Preview</span></div>
        <div className="home-preview-columns"><span>CHANNEL</span><span>VOLTAGE</span><span>CURRENT</span></div>
        {channelSlots.map((slot, index) => <button type="button" className="home-preview-row" key={slot} onClick={() => handleOpenAuth()} aria-label={`Sign in to view ${slot}`}><span><span className="home-preview-slot">{String(index + 1).padStart(2, '0')}</span>{slot}</span><span>— V</span><span>— A</span></button>)}
        <div className="home-preview-note"><LockKeyhole size={12} aria-hidden="true"/><span>Sign in to view real-time site telemetry</span></div>
      </div>
    </section>

    <section className="home-bottom-cta home-wrap"><p>Your energy.<br/><em>In clear sight.</em></p><button type="button" onClick={() => handleOpenAuth()} aria-label="Open dashboard"><ArrowUpRight strokeWidth={1.2} aria-hidden="true"/></button></section>
    <footer className="landing-footer home-wrap"><span>MIN-SAKTHI <span> / Energy Intelligence V2</span></span><span>Secure access. Clear insight.</span></footer>
    <AuthModal isOpen={isAuthModalOpen} onClose={handleCloseAuth} onSuccess={onSuccess} initialEmail={prefillEmail}/>
  </div>;
};
export default LandingPage;
