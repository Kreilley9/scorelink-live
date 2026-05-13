import { useNavigate } from 'react-router';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="py-4 px-6 border-t border-slate-800 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png" 
              alt="ScoreLink LIVE"
              className="h-12"
            />
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">
              Pricing
            </button>
            <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">
              Contact Us
            </button>
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">
              Terms of Service
            </button>
            <span>© {new Date().getFullYear()} Scorelink Live</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
