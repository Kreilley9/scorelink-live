import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Check, ArrowLeft, Zap, Trophy, Crown, QrCode, Layout, Users, Tv, Megaphone, Calendar, Smartphone, Palette } from "lucide-react";
import Footer from "@/react-app/components/Footer";

export default function Pricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleGetStarted = (tier: string) => {
    navigate(`/signup?tier=${tier.toLowerCase()}&billing=${billingPeriod}`);
  };

  const subscriptionTiers = [
    {
      id: "free",
      name: "Free",
      tagline: "Try It Out",
      monthlyPrice: 0,
      annualPrice: 0,
      icon: Zap,
      color: "slate",
      bestFor: ["Testing the platform", "Small one-time events", "Getting started"],
      features: [
        { text: "Live scoreboard", included: true },
        { text: "Real-time score updates", included: true },
        { text: "QR code access for viewers", included: true },
        { text: "Mobile-optimized viewing", included: true },
        { text: "Multi-field view", included: false },
        { text: "Bulk scheduling", included: false },
        { text: "Custom branding", included: false },
        { text: "Sponsorship capability", included: false },
        { text: "Referee management", included: false },
        { text: "Large display mode", included: false },
      ],
    },
    {
      id: "standard",
      name: "Standard",
      tagline: "Run Events",
      monthlyPrice: 99,
      annualPrice: 79,
      icon: Trophy,
      color: "blue",
      popular: true,
      bestFor: ["Multi-field leagues", "Tournaments", "Most customers"],
      features: [
        { text: "Live scoreboard", included: true },
        { text: "Real-time score updates", included: true },
        { text: "QR code access for viewers", included: true },
        { text: "Mobile-optimized viewing", included: true },
        { text: "Multi-field view", included: true },
        { text: "Bulk scheduling", included: true },
        { text: "Custom branding", included: true },
        { text: "Sponsorship capability", included: false },
        { text: "Referee management", included: false },
        { text: "Large display mode", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      tagline: "Run a Business",
      monthlyPrice: 349,
      annualPrice: 299,
      icon: Crown,
      color: "amber",
      bestFor: ["Large tournaments", "Facilities", "Revenue-generating operators"],
      features: [
        { text: "Live scoreboard", included: true },
        { text: "Real-time score updates", included: true },
        { text: "QR code access for viewers", included: true },
        { text: "Mobile-optimized viewing", included: true },
        { text: "Multi-field view", included: true },
        { text: "Bulk scheduling", included: true },
        { text: "Custom branding", included: true },
        { text: "Sponsorship capability → Generate Revenue!", included: true },
        { text: "Referee management", included: true },
        { text: "Large display mode - turn any screen into an elite scoreboard", included: true },
      ],
    },
  ];

  const featureHighlights = [
    // All Plans (Free tier)
    {
      icon: QrCode,
      title: "QR Code Access",
      description: "Instant access for parents and fans - just scan and watch",
      tier: "All Plans",
    },
    {
      icon: Smartphone,
      title: "Mobile Viewing",
      description: "Mobile-optimized scoreboard viewing for parents on the go",
      tier: "All Plans",
    },
    // Standard+ tier
    {
      icon: Layout,
      title: "Multi-Field View",
      description: "Monitor all your fields from a single dashboard",
      tier: "Standard+",
    },
    {
      icon: Calendar,
      title: "Bulk Scheduling",
      description: "Upload your entire schedule in one click",
      tier: "Standard+",
    },
    {
      icon: Palette,
      title: "Custom Branding",
      description: "Personalize your scoreboards with custom colors and logos",
      tier: "Standard+",
    },
    // Premium tier
    {
      icon: Megaphone,
      title: "Sponsorship Tools",
      description: "Sell sponsorships and display sponsor logos on your scoreboards to generate revenue for your league",
      tier: "Premium",
    },
    {
      icon: Users,
      title: "Referee Management",
      description: "Assign referees and send access codes automatically",
      tier: "Premium",
    },
    {
      icon: Tv,
      title: "Large Display Mode",
      description: "Turn any screen into an elite scoreboard - optimized for TVs and jumbotrons",
      tier: "Premium",
    },
  ];

  const getColorClasses = (color: string, isPopular?: boolean) => {
    const colors: Record<string, { border: string; bg: string; text: string; button: string; glow: string }> = {
      slate: {
        border: "border-slate-600/30",
        bg: "bg-slate-500/10",
        text: "text-slate-300",
        button: "bg-slate-600 hover:bg-slate-500 text-white",
        glow: "",
      },
      blue: {
        border: isPopular ? "border-primary/50" : "border-primary/30",
        bg: "bg-primary/10",
        text: "text-primary",
        button: "bg-primary hover:bg-primary/90 text-white",
        glow: isPopular ? "shadow-lg shadow-primary/20" : "",
      },
      amber: {
        border: "border-amber-500/30",
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        button: "bg-amber-600 hover:bg-amber-500 text-white font-semibold",
        glow: "shadow-lg shadow-amber-500/10",
      },
    };
    return colors[color] || colors.slate;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-12">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="mb-6 gap-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
              Simple, Flexible Pricing
            </h1>
            <p className="text-lg sm:text-xl text-slate-400">
              Choose your subscription for features, then buy boards as you need them
            </p>
          </div>
        </div>

        {/* Boards Pricing Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Scoreboards (Usage)</h2>
            <p className="text-slate-400">Same price for everyone. Volume discounts available.</p>
          </div>
          
          <div className="bg-gradient-to-r from-primary/10 via-slate-900/50 to-primary/10 border-2 border-primary/30 rounded-2xl p-8 shadow-xl shadow-primary/5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 text-center">
                <div className="text-3xl font-black text-white mb-1">$20</div>
                <div className="text-slate-400 text-sm mb-2">per field-day</div>
                <div className="text-xs text-slate-500">Base price</div>
              </div>
              <div className="bg-slate-900/80 border border-primary/30 rounded-xl p-6 text-center">
                <div className="text-3xl font-black text-primary mb-1">$18</div>
                <div className="text-slate-400 text-sm mb-2">per field-day</div>
                <div className="text-xs text-primary font-medium">20+ boards (10% off)</div>
              </div>
              <div className="bg-slate-900/80 border border-primary/30 rounded-xl p-6 text-center">
                <div className="text-3xl font-black text-primary mb-1">$16</div>
                <div className="text-slate-400 text-sm mb-2">per field-day</div>
                <div className="text-xs text-primary font-medium">50+ boards (20% off)</div>
              </div>
              <div className="bg-slate-900/80 border border-primary/30 rounded-xl p-6 text-center">
                <div className="text-3xl font-black text-primary mb-1">$14</div>
                <div className="text-slate-400 text-sm mb-2">per field-day</div>
                <div className="text-xs text-primary font-medium">100+ boards (30% off)</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-6 text-center italic">
              Field-days never expire. Buy in bulk and use them whenever you need them.
            </p>
          </div>
        </div>

        {/* Subscription Tiers Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Subscriptions (Features)</h2>
            <p className="text-slate-400 mb-6">Unlock more features with a subscription</p>
            
            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-full p-1">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === "annual"
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Annual
                <span className="ml-1 text-xs text-green-400">(Save 20%)</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {subscriptionTiers.map((tier) => {
              const colors = getColorClasses(tier.color, tier.popular);
              const Icon = tier.icon;
              const price = billingPeriod === "monthly" ? tier.monthlyPrice : tier.annualPrice;
              
              return (
                <div
                  key={tier.id}
                  className={`relative bg-slate-900/60 backdrop-blur-sm border-2 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:scale-[1.02] ${colors.border} ${colors.glow}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-primary to-primary/80 text-white px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Tier Header */}
                  <div className="text-center mb-6 pt-2">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${colors.bg} mb-4`}>
                      <Icon className={`w-7 h-7 ${colors.text}`} />
                    </div>
                    <h3 className={`text-2xl font-bold mb-1 ${colors.text}`}>
                      {tier.name}
                    </h3>
                    <p className="text-slate-400 text-sm font-medium">
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6 pb-6 border-b border-slate-800">
                    {price === 0 ? (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-black text-white">Free</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-black text-white">${price}</span>
                        <span className="text-slate-500 text-sm">/month</span>
                      </div>
                    )}
                    {billingPeriod === "annual" && price > 0 && (
                      <p className="text-xs text-slate-500 mt-1">Billed annually (${price * 12}/year)</p>
                    )}
                  </div>

                  {/* Best For */}
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Best for</p>
                    <ul className="space-y-1">
                      {tier.bestFor.map((item, i) => (
                        <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {tier.features.map((feature, i) => (
                      <div 
                        key={i} 
                        className={`flex items-start gap-3 ${feature.included ? '' : 'opacity-40'}`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${feature.included ? colors.bg : 'bg-slate-800'}`}>
                          {feature.included ? (
                            <Check className={`w-3 h-3 ${colors.text}`} />
                          ) : (
                            <span className="w-2 h-0.5 bg-slate-600 rounded" />
                          )}
                        </div>
                        <span className={`text-sm ${feature.included ? 'text-slate-300' : 'text-slate-600 line-through'}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button 
                    onClick={() => handleGetStarted(tier.name)}
                    className={`w-full h-12 text-base ${colors.button}`}
                  >
                    {tier.id === "free" ? "Get Started Free" : "Get Started"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sponsorship Revenue Callout - Premium Feature */}
        <div className="mb-16">
          <div className="relative overflow-hidden bg-gradient-to-br from-green-950/20 via-slate-900 to-slate-950 border-2 border-green-500/30 rounded-3xl p-8 sm:p-10">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  <Crown className="w-4 h-4" />
                  Premium Exclusive
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Generate Revenue with Sponsorships
                </h2>
                <p className="text-slate-300 text-lg max-w-3xl mx-auto">
                  Premium subscribers can sell sponsorships to local businesses and display their logos on every scoreboard. 
                  Turn your scoreboards into a revenue stream that pays for itself and more.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
                {/* Step 1 */}
                <div className="bg-slate-900/60 border border-green-500/20 rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-green-400">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Sell Sponsorships</h3>
                  <p className="text-slate-400">
                    Reach out to local businesses and sell sponsorship packages. Many leagues charge $500-$2,000+ per season.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-900/60 border border-green-500/20 rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-green-400">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Upload Their Logo</h3>
                  <p className="text-slate-400">
                    Add sponsor logos and website URLs directly in your dashboard. Each sponsor's logo becomes a clickable link. Assign them to specific fields or events.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-slate-900/60 border border-green-500/20 rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-green-400">3</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Automatic Display</h3>
                  <p className="text-slate-400">
                    Sponsor logos rotate every 5 seconds on every scoreboard, giving them maximum visibility to parents and fans.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/10 via-slate-800/50 to-green-500/10 border border-green-500/30 rounded-xl p-6 max-w-3xl mx-auto">
                <div className="text-center">
                  <p className="text-lg font-semibold text-white mb-2">Example Revenue Potential</p>
                  <p className="text-slate-300 mb-4">
                    If you sell 5 field sponsorships at $1,000 each per season, that's <span className="text-green-400 font-bold text-xl">$5,000 in revenue</span>. 
                    Your Premium subscription ($349/month or $299/month annual) pays for itself many times over.
                  </p>
                  <p className="text-sm text-slate-400 italic">
                    Many leagues use sponsorship revenue to offset field rental costs, purchase equipment, or fund scholarships.
                  </p>
                </div>
              </div>

              <div className="text-center mt-8">
                <Button 
                  onClick={() => handleGetStarted("Premium")}
                  className="bg-green-600 hover:bg-green-500 text-white font-semibold h-14 px-10 text-lg"
                >
                  Start Generating Revenue with Premium
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Large Display Mode Callout - Premium Feature */}
        <div className="mb-16">
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-3xl p-8 sm:p-10">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  <Crown className="w-4 h-4" />
                  Premium Exclusive
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Large Display Mode
                </h2>
                <p className="text-slate-300 text-lg mb-6">
                  Turn any screen into an elite scoreboard. Perfect for TVs, projectors, jumbotrons, concession areas, bleachers, and facility lobbies.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    Optimized for big screens (720p, 1080p, 4K)
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    Bold, high-contrast stadium aesthetic
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    QR code toggle for instant switching
                  </li>
                </ul>
                <Button 
                  onClick={() => handleGetStarted("Premium")}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold h-12 px-8"
                >
                  Get Premium
                </Button>
              </div>
              
              {/* Visual representation */}
              <div className="relative">
                <div className="bg-slate-950 border-4 border-slate-700 rounded-xl p-1 shadow-2xl shadow-black/50">
                  <div 
                    className="rounded-lg aspect-video flex items-center justify-center p-4 relative overflow-hidden"
                    style={{ backgroundColor: '#0f172a' }}
                  >
                    {/* Custom branding logo */}
                    <div className="absolute top-2 left-2">
                      <div className="bg-white rounded-lg px-3 py-1.5 text-center">
                        <div className="text-purple-600 font-black text-xs" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                          THUNDER
                        </div>
                        <div className="text-purple-400 font-bold text-[8px] -mt-0.5">LEAGUE</div>
                      </div>
                    </div>

                    <div className="w-full max-w-md space-y-2">
                      {/* Period indicator */}
                      <div className="text-center">
                        <div 
                          className="inline-block px-3 py-1 rounded-full border"
                          style={{ 
                            backgroundColor: '#a855f720',
                            borderColor: '#a855f7'
                          }}
                        >
                          <span className="text-[8px] font-bold text-purple-300 tracking-wide">2ND HALF</span>
                        </div>
                      </div>

                      {/* Main scoreboard */}
                      <div 
                        className="rounded-xl border-2 overflow-hidden"
                        style={{ 
                          backgroundColor: '#0f172a',
                          borderColor: '#a855f760'
                        }}
                      >
                        {/* Teams and scores */}
                        <div className="grid grid-cols-3 gap-2 p-3">
                          <div className="text-center">
                            <div className="text-[9px] text-purple-300 uppercase tracking-wide mb-1">Eagles</div>
                            <div className="text-2xl font-black text-white">24</div>
                          </div>
                          <div className="flex items-center justify-center">
                            <div 
                              className="text-xl font-black tracking-wider"
                              style={{ color: '#a78bfa' }}
                            >
                              12:45
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[9px] text-purple-300 uppercase tracking-wide mb-1">Hawks</div>
                            <div className="text-2xl font-black" style={{ color: '#c4b5fd' }}>17</div>
                          </div>
                        </div>
                      </div>

                      {/* Sponsor banner */}
                      <div 
                        className="rounded-lg border p-2"
                        style={{ 
                          backgroundColor: '#0f172a80',
                          borderColor: '#a855f740'
                        }}
                      >
                        <p className="text-center text-[7px] mb-1.5" style={{ color: '#a78bfa' }}>
                          Game brought to you by
                        </p>
                        <div className="bg-white rounded px-2 py-1.5 text-center mb-1">
                          <div className="text-purple-600 font-black text-[10px]" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                            MAIN STREET
                          </div>
                          <div className="text-purple-400 text-[7px] font-semibold -mt-0.5">PIZZA & SUBS</div>
                        </div>
                        <div className="text-[7px] text-purple-200 text-center">Best Pizza in Town!</div>
                      </div>

                      {/* ScoreLink footer */}
                      <div className="flex items-center justify-center gap-1.5 opacity-60">
                        <span className="text-[7px]" style={{ color: '#a78bfa' }}>Powered by</span>
                        <img 
                          src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png"
                          alt="ScoreLink"
                          className="h-2.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* TV stand decoration */}
                <div className="flex justify-center mt-2">
                  <div className="w-24 h-3 bg-slate-700 rounded-t-sm" />
                </div>
                <div className="flex justify-center">
                  <div className="w-16 h-1 bg-slate-600 rounded-b-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
            Feature Highlights
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureHighlights.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={i}
                  className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                      <p className="text-slate-400 text-sm mb-2">{feature.description}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        feature.tier === "All Plans" 
                          ? "bg-slate-500/20 text-slate-300"
                          : feature.tier === "Standard+"
                          ? "bg-primary/20 text-primary"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {feature.tier}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ / Contact */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-3">
              Running a large event?
            </h3>
            <p className="text-slate-400 mb-6">
              Need custom pricing for multi-day tournaments or seasonal packages? 
              We'll put together a quote that works for your organization.
            </p>
            <Button 
              variant="outline" 
              className="border-primary/50 text-primary hover:bg-primary/10"
              onClick={() => navigate("/contact")}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
