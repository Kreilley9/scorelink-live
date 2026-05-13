import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Button } from '@/react-app/components/ui/button';
import { 
  QrCode, 
  Smartphone, 
  Wifi, 
  Clock, 
  Users, 
  Trophy,
  ChevronRight,
  Check,
  ArrowRight
} from 'lucide-react';
import LoginButton from '@/react-app/components/LoginButton';
import { useCurrentUser } from '@/react-app/hooks/useCurrentUser';
import Footer from '@/react-app/components/Footer';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser, hasRole, isLoading } = useCurrentUser();

  // Redirect logged-in admins/coordinators to dashboard
  useEffect(() => {
    if (!isLoading && user && currentUser) {
      if (hasRole(['admin', 'coordinator'])) {
        navigate('/dashboard');
      }
    }
  }, [user, currentUser, isLoading, hasRole, navigate]);

  // Show loading while checking auth
  if (isLoading && user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png" 
                alt="ScoreLink LIVE"
                className="h-12 md:h-14"
              />
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                onClick={() => navigate('/pricing')}
                variant="ghost"
                className="text-slate-300 hover:text-white text-sm md:text-base px-3 md:px-4 min-h-[44px] hidden sm:flex"
              >
                Get Started
              </Button>
              <LoginButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        {/* App Logo Watermark */}
        <div className="absolute top-20 right-10 opacity-5">
          <img 
            src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/App-Logo-No-Background-Cropped.png" 
            alt=""
            className="w-[600px] h-[600px]"
          />
        </div>
        
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm font-medium mb-8">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/App-Logo-No-Background-Cropped2.png" 
                alt="ScoreLink"
                className="w-8 h-8"
              />
              Real-time scoreboards for youth sports
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              Keep Everyone in 
              <span className="text-primary"> the Game</span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              A simple game management platform with professional digital scoreboards that let coaches, parents, and fans follow every play in real time—from anywhere. Built for any sport.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-16 w-full sm:w-auto px-4 sm:px-0">
              <Button
                onClick={() => navigate('/pricing')}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 gap-2 min-h-[56px] w-full sm:w-auto"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg"
                variant="outline"
                className="border-slate-700 text-white hover:bg-slate-800 font-semibold text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 min-h-[56px] w-full sm:w-auto"
              >
                See How It Works
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div>
                <p className="text-3xl font-black text-primary">10+</p>
                <p className="text-sm text-slate-500">Sports Supported</p>
              </div>
              <div>
                <p className="text-3xl font-black text-primary">100%</p>
                <p className="text-sm text-slate-500">Real-time Updates</p>
              </div>
              <div>
                <p className="text-3xl font-black text-primary">∞</p>
                <p className="text-sm text-slate-500">Viewers per Game</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Scoreboard Preview */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary to-primary" />
            
            {/* Custom League Branding Header */}
            <div className="text-center mb-4 md:mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-lg md:text-2xl">YSL</span>
                </div>
                <div>
                  <h3 className="text-white font-black text-lg md:text-2xl tracking-tight">Youth Sports League</h3>
                  <p className="text-slate-400 text-xs md:text-sm">Championship Division</p>
                </div>
              </div>
              <span className="text-green-500 text-xs md:text-sm font-medium tracking-wider">● LIVE GAME</span>
            </div>
            
            {/* Mock Scoreboard */}
            <div className="flex items-center justify-between gap-3 md:gap-8 mb-4 md:mb-6">
              <div className="flex-1 text-center">
                <p className="text-slate-400 text-xs md:text-sm mb-1 md:mb-2">HOME</p>
                <p className="text-base md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2 truncate">TIGERS</p>
                <p className="text-4xl md:text-6xl lg:text-8xl font-black text-primary">24</p>
                {/* Timeouts */}
                <div className="flex justify-center gap-1 mt-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-700"></div>
                </div>
              </div>
              
              <div className="text-center flex-shrink-0">
                <div className="bg-slate-800/50 rounded-lg md:rounded-xl px-3 py-2 md:px-6 md:py-4 border border-slate-700">
                  <p className="text-slate-400 text-[10px] md:text-xs mb-1">TIME</p>
                  <p className="text-xl md:text-3xl lg:text-4xl font-bold text-white font-mono">12:45</p>
                  <p className="text-primary text-[10px] md:text-sm mt-1">2ND HALF</p>
                  <p className="text-slate-500 text-[8px] md:text-xs mt-1">2nd & 8 on Tigers 35</p>
                </div>
              </div>
              
              <div className="flex-1 text-center">
                <p className="text-slate-400 text-xs md:text-sm mb-1 md:mb-2">AWAY</p>
                <p className="text-base md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2 truncate">EAGLES</p>
                <p className="text-4xl md:text-6xl lg:text-8xl font-black text-slate-500">18</p>
                {/* Timeouts */}
                <div className="flex justify-center gap-1 mt-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary"></div>
                </div>
              </div>
            </div>

            {/* Sponsor Banner */}
            <div className="relative">
              <div className="bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border border-primary/30 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                <p className="text-xs md:text-sm text-slate-400 mb-1">Presented by</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded flex items-center justify-center">
                    <span className="text-primary font-black text-xs md:text-sm">SP</span>
                  </div>
                  <p className="text-lg md:text-2xl font-black text-white">SportsPro Equipment</p>
                </div>
                <p className="text-xs md:text-sm text-primary mt-1">www.sportspro.example.com</p>
              </div>
              
              {/* Feature callouts */}
              <div className="absolute -right-2 -top-2 bg-green-500 text-white text-[8px] md:text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                Revenue Generator
              </div>
            </div>

            {/* Powered by footer */}
            <div className="mt-4 md:mt-6 text-center flex items-center justify-center gap-2">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped.png" 
                alt="ScoreLink Live"
                className="h-10 md:h-16"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 relative overflow-hidden">
        {/* Background branding */}
        <div className="absolute bottom-10 left-10 opacity-5">
          <img 
            src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/App-Logo-No-Background-Cropped.png" 
            alt=""
            className="w-[500px] h-[500px]"
          />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-4">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/App-Logo-No-Background-Cropped2.png" 
                alt=""
                className="w-12 h-12 opacity-50"
              />
              <h2 className="text-4xl font-black text-white">
                Everything You Need
              </h2>
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/App-Logo-No-Background-Cropped2.png" 
                alt=""
                className="w-12 h-12 opacity-50"
              />
            </div>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From setup to final whistle, Scorelink Live handles it all
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<QrCode className="w-6 h-6" />}
              title="QR Code Access"
              description="Parents scan a QR code at the field and instantly see the live scoreboard on their phone."
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="Works on Any Device"
              description="Responsive design works perfectly on phones, tablets, and big screens for the scoreboard display."
            />
            <FeatureCard
              icon={<Wifi className="w-6 h-6" />}
              title="Offline Support"
              description="Weak cell signal? No problem. Referees can keep scoring and it syncs when connection returns."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Game Clock Control"
              description="Built-in game clock with start/stop, countdown or count-up modes, and automatic half tracking."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Multi-Field Events"
              description="Manage multiple games across different fields from a single dashboard. Perfect for tournaments."
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Multiple Sports"
              description="Flag football, basketball, soccer, baseball/softball, lacrosse, field hockey — all with sport-specific stats."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 text-lg">
              Get up and running in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Create Your Event"
              description="Set up your game schedule, assign referees, and customize your scoreboard branding."
            />
            <StepCard
              number="2"
              title="Share the QR Code"
              description="Print or display the QR code at the field. Parents scan it to access the live scoreboard."
            />
            <StepCard
              number="3"
              title="Keep Score"
              description="Referees update scores from their phone. Parents see changes instantly, wherever they are."
            />
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">
            Simple, Flexible Pricing
          </h2>
          <p className="text-slate-400 text-lg mb-6 max-w-2xl mx-auto">
            Scoreboards are $20/field-day for everyone. Choose a subscription for more features.
          </p>
          
          {/* Key Benefits */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">Field-days never expire</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">Volume discounts up to 30%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <PricingPreview
              tier="Free"
              price="$0"
              features={["Live scoreboard", "QR code access", "Mobile viewing"]}
              color="slate"
            />
            <PricingPreview
              tier="Standard"
              price="$99"
              features={["Multi-field view", "Custom branding", "Bulk scheduling"]}
              color="blue"
              popular
            />
            <PricingPreview
              tier="Premium"
              price="$349"
              features={["Sponsorship tools", "Referee management", "Large display mode"]}
              color="amber"
            />
          </div>

          <Button
            onClick={() => navigate('/pricing')}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white font-bold text-lg px-8 py-6 gap-2"
          >
            View Full Pricing
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-primary/30 transition-colors group">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl text-white text-2xl font-black mb-4">
        {number}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function PricingPreview({ 
  tier, 
  price, 
  features, 
  color,
  popular 
}: { 
  tier: string; 
  price: string; 
  features: string[]; 
  color: 'blue' | 'slate' | 'amber';
  popular?: boolean;
}) {
  const colors = {
    blue: 'from-blue-600 to-blue-700',
    slate: 'from-slate-500 to-slate-600',
    amber: 'from-blue-500 to-blue-600',
  };

  return (
    <div className={`relative bg-slate-900/50 border rounded-2xl p-6 ${popular ? 'border-primary/50' : 'border-slate-800'}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
          POPULAR
        </div>
      )}
      <div className={`inline-block px-3 py-1 bg-gradient-to-r ${colors[color]} text-white text-xs font-bold rounded-full mb-4`}>
        {tier.toUpperCase()}
      </div>
      <p className="text-3xl font-black text-white mb-1">{price}</p>
      <p className="text-slate-500 text-sm mb-4">{price === "$0" ? "forever" : "/month"}</p>
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-slate-400">
            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
