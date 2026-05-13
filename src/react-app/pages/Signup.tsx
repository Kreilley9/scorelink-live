import { useState, useEffect } from "react";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { ArrowLeft, Flag, Check, Zap, Trophy, Crown, TrendingDown, Megaphone } from "lucide-react";
import { useNavigate } from "react-router";
import { getAvailableSports, getSportById, SportType } from "@/data/sports";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";

export default function Signup() {
  const navigate = useNavigate();
  const { user, redirectToLogin } = useAuth();
  const { sportAccounts, refetch: refetchSportAccounts } = useSportAccount();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Determine if this is an existing user adding another sport
  const isAddingSport = sportAccounts.length > 0;

  // Get params from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const tierParam = urlParams.get('tier');
  const billingParam = urlParams.get('billing');

  // Available sports
  const availableSports = getAvailableSports();

  // Form data
  const [sportType, setSportType] = useState<SportType>("flag_football");
  const [tier, setTier] = useState(tierParam || "standard");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    (billingParam as "monthly" | "annual") || "monthly"
  );
  const [fieldDays, setFieldDays] = useState(10);
  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Get selected sport config
  const selectedSport = getSportById(sportType);

  // Pre-fill contact information from Google OAuth data
  useEffect(() => {
    if (user?.google_user_data) {
      const googleData = user.google_user_data;
      if (!email && googleData.email) setEmail(googleData.email);
      if (!firstName && googleData.given_name) setFirstName(googleData.given_name);
      if (!lastName && googleData.family_name) setLastName(googleData.family_name);
    }
  }, [user]);

  const subscriptionTiers = [
    {
      id: "free",
      name: "Free",
      monthlyPrice: 0,
      annualPrice: 0,
      icon: Zap,
      color: "slate",
      features: ["Live scoreboard", "QR code access", "Mobile viewing"],
    },
    {
      id: "standard",
      name: "Standard",
      monthlyPrice: 99,
      annualPrice: 79,
      icon: Trophy,
      color: "blue",
      popular: true,
      features: ["Everything in Free", "Multi-field view", "Bulk scheduling", "Custom branding"],
    },
    {
      id: "premium",
      name: "Premium",
      monthlyPrice: 349,
      annualPrice: 299,
      icon: Crown,
      color: "amber",
      features: ["Everything in Standard", "Sponsorship tools → Generate revenue!", "Referee management", "Large display mode"],
    },
  ];

  const selectedTierData = subscriptionTiers.find(t => t.id === tier);
  const subscriptionPrice = billingPeriod === "monthly" 
    ? (selectedTierData?.monthlyPrice || 0)
    : (selectedTierData?.annualPrice || 0);
  
  // Board pricing - same for everyone
  const baseBoardPrice = 20;
  let volumeDiscount = 0;
  let discountedPrice = baseBoardPrice;
  if (fieldDays >= 100) {
    volumeDiscount = 0.30;
    discountedPrice = 14;
  } else if (fieldDays >= 50) {
    volumeDiscount = 0.20;
    discountedPrice = 16;
  } else if (fieldDays >= 20) {
    volumeDiscount = 0.10;
    discountedPrice = 18;
  }
  
  const boardsSubtotal = baseBoardPrice * fieldDays;
  const boardsDiscount = boardsSubtotal * volumeDiscount;
  const boardsTotal = boardsSubtotal - boardsDiscount;
  
  // Total includes subscription (if not free) and boards
  const subscriptionTotal = billingPeriod === "annual" ? subscriptionPrice * 12 : subscriptionPrice;

  // For existing users, we skip step 4 (contact info)
  const totalSteps = isAddingSport ? 3 : 4;

  const handleContinue = () => {
    if (step === 1 && !sportType) return;
    if (step === 2 && !tier) return;
    if (step === 3 && fieldDays < 1) return;
    if (!isAddingSport && step === 4 && (!firstName || !lastName || !email || !phoneNumber || !street1 || !city || !stateProvince || !country || !zipCode)) return;
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleCheckout();
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      sessionStorage.setItem('signup_data', JSON.stringify({
        sportType, tier, billingPeriod, fieldDays, organizationName,
        firstName, lastName, email, phoneNumber, street1, street2, city, stateProvince, country, zipCode
      }));
      redirectToLogin();
      return;
    }

    setLoading(true);
    try {
      // Create sport account
      const sportAccountResponse = await fetch("/api/sport-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sport_type: sportType,
          organization_name: organizationName || null,
          subscription_tier: tier,
          billing_period: billingPeriod,
          fields_allowed: fieldDays,
          template_config: JSON.stringify(selectedSport?.defaultTemplate || {
            game_length_minutes: 20,
            clock_direction: "down",
            period_count: 2,
            period_label: "Half",
            timeouts_per_period: 2,
            blitzes_per_period: 2,
            track_blitzes: true,
          }),
        }),
      });

      if (!sportAccountResponse.ok) {
        const errorData = await sportAccountResponse.json();
        console.error("Failed to create sport account:", errorData);
        setLoading(false);
        return;
      }

      const sportAccount = await sportAccountResponse.json();

      // Save contact details for new users
      if (!isAddingSport) {
        await fetch("/api/users/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone_number: phoneNumber,
            organization_name: organizationName,
            street_1: street1,
            street_2: street2,
            city: city,
            state_province: stateProvince,
            country: country,
            zip_code: zipCode,
            sport_type: sportType,
            template_config: selectedSport?.defaultTemplate || {},
          }),
        });
      }

      await refetchSportAccounts();

      // Create Stripe checkout session
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tier.toLowerCase(),
          billing_period: billingPeriod,
          field_days: fieldDays,
          sport_account_id: sportAccount.id,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Failed to create checkout session");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => step === 1 ? navigate(isAddingSport ? "/dashboard" : "/pricing") : setStep(step - 1)}
            variant="ghost"
            className="mb-6 gap-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? (isAddingSport ? "Back to Dashboard" : "Back to Pricing") : "Back"}
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {isAddingSport ? "Add Another Sport" : "Create Your Account"}
            </h1>
            <p className="text-slate-400">
              {isAddingSport ? "Set up a new sport for your organization" : "Get started in just a few steps"}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  step >= s ? "bg-primary text-white" : "bg-slate-700 text-slate-400"
                }`}>
                  {step > s ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : s}
                </div>
                {s < totalSteps && <div className={`w-8 sm:w-12 h-1 rounded transition-all ${step > s ? "bg-primary" : "bg-slate-700"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-slate-900/60 backdrop-blur-sm border-2 border-slate-700 rounded-2xl p-6 sm:p-8">
          {/* Step 1: Sport Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                  <Flag className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Sport</h2>
                <p className="text-slate-400">What sport will you be tracking?</p>
              </div>

              <div>
                <Label htmlFor="sport" className="text-white text-lg mb-3 block">Sport Type</Label>
                <Select value={sportType} onValueChange={(v) => setSportType(v as SportType)}>
                  <SelectTrigger className="h-14 text-lg bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-slate-800 border-slate-600 z-[100]"
                    position="popper"
                    sideOffset={5}
                  >
                    {availableSports.map((sport) => (
                      <SelectItem 
                        key={sport.id} 
                        value={sport.id}
                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                      >
                        {sport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Subscription Tier Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Select Your Plan</h2>
                <p className="text-slate-400 mb-4">Choose the features you need</p>
                
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

              <div className="grid gap-4">
                {subscriptionTiers.map((t) => {
                  const Icon = t.icon;
                  const price = billingPeriod === "monthly" ? t.monthlyPrice : t.annualPrice;
                  const colorClass = t.color === "blue" ? "text-primary" : t.color === "amber" ? "text-amber-400" : "text-slate-300";
                  const bgClass = t.color === "blue" ? "bg-primary/30" : t.color === "amber" ? "bg-amber-500/30" : "bg-slate-700";
                  
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTier(t.id)}
                      className={`relative p-6 rounded-xl text-left transition-all ${
                        tier === t.id
                          ? "bg-primary/20 border-2 border-primary"
                          : "bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {t.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-gradient-to-r from-primary to-primary/90 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                            Most Popular
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-xl ${tier === t.id ? bgClass : "bg-slate-700"} flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${tier === t.id ? colorClass : "text-slate-400"}`} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1">{t.name}</h3>
                          {price === 0 ? (
                            <p className="text-2xl font-bold text-green-400 mb-3">Free</p>
                          ) : (
                            <p className="text-2xl font-bold text-primary mb-3">
                              ${price}<span className="text-sm text-slate-500">/month</span>
                            </p>
                          )}
                          <ul className="space-y-2">
                            {t.features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {tier === t.id && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Premium Revenue Callout */}
              {tier === "premium" && (
                <div className="mt-6 bg-gradient-to-r from-green-500/10 via-slate-800/50 to-green-500/10 border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Generate Revenue with Sponsorships</h4>
                      <p className="text-slate-300 text-sm mb-3">
                        Premium lets you sell sponsorships to local businesses and display their logos on your scoreboards. 
                        Many leagues charge $500-$2,000+ per field sponsor per season.
                      </p>
                      <p className="text-green-400 text-sm font-semibold">
                        💰 Potential to offset costs and generate profit for your league
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Field-Days */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">How Many Scoreboards?</h2>
                <p className="text-slate-400">Purchase field-days in bulk and save. Same price for all plans.</p>
              </div>

              {/* Quick select buttons */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[10, 20, 50, 100].map((qty) => (
                  <button
                    key={qty}
                    onClick={() => setFieldDays(qty)}
                    className={`p-4 rounded-xl text-center transition-all ${
                      fieldDays === qty
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-2xl font-bold text-white">{qty}</div>
                    <div className="text-xs text-slate-400">field-days</div>
                  </button>
                ))}
              </div>

              <div>
                <Label htmlFor="fieldDays" className="text-white text-lg mb-3 block">Or enter custom amount</Label>
                <Input
                  id="fieldDays"
                  type="number"
                  min="1"
                  value={fieldDays}
                  onChange={(e) => setFieldDays(parseInt(e.target.value) || 1)}
                  className="h-14 text-lg bg-slate-800 border-slate-600 text-white"
                />
              </div>

              {/* Volume discount indicator */}
              {volumeDiscount > 0 && (
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-white font-semibold">Volume Discount Applied!</p>
                      <p className="text-sm text-slate-400">
                        You're getting {(volumeDiscount * 100).toFixed(0)}% off — ${discountedPrice} per field-day instead of $20
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Price breakdown */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
                <div className="text-sm text-slate-400 mb-2">Scoreboards</div>
                <div className="flex justify-between text-slate-300">
                  <span>{fieldDays} field-days × ${baseBoardPrice}</span>
                  <span>${boardsSubtotal.toFixed(2)}</span>
                </div>
                {volumeDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Volume discount ({(volumeDiscount * 100).toFixed(0)}%)</span>
                    <span>-${boardsDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-medium">
                  <span>Boards subtotal</span>
                  <span>${boardsTotal.toFixed(2)}</span>
                </div>
                
                {subscriptionPrice > 0 && (
                  <>
                    <div className="h-px bg-slate-700 my-2" />
                    <div className="text-sm text-slate-400 mb-2">Subscription ({selectedTierData?.name})</div>
                    <div className="flex justify-between text-slate-300">
                      <span>${subscriptionPrice}/month {billingPeriod === "annual" ? "× 12" : ""}</span>
                      <span>${subscriptionTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
                
                <div className="h-px bg-slate-700 my-2" />
                <div className="flex justify-between text-xl font-bold text-white">
                  <span>Total due today</span>
                  <span className="text-primary">${(boardsTotal + subscriptionTotal).toFixed(2)}</span>
                </div>
                {subscriptionPrice > 0 && (
                  <p className="text-xs text-slate-500">
                    {billingPeriod === "annual" 
                      ? `Then $${subscriptionPrice * 12}/year for subscription`
                      : `Then $${subscriptionPrice}/month for subscription`
                    }
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Contact Information (only for new users) */}
          {step === 4 && !isAddingSport && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Contact Information</h2>
                <p className="text-slate-400">We'll need your details to complete the purchase</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName" className="text-white text-lg mb-3 block">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-white text-lg mb-3 block">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-white text-lg mb-3 block">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white text-lg mb-3 block">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <Label className="text-white text-lg mb-3 block">League Address *</Label>
                <div className="space-y-3">
                  <Input
                    id="street1"
                    type="text"
                    placeholder="Street Address"
                    value={street1}
                    onChange={(e) => setStreet1(e.target.value)}
                    className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                  <Input
                    id="street2"
                    type="text"
                    placeholder="Apt, Suite, etc. (optional)"
                    value={street2}
                    onChange={(e) => setStreet2(e.target.value)}
                    className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      id="city"
                      type="text"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                    <Input
                      id="stateProvince"
                      type="text"
                      placeholder="State/Province"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      id="country"
                      type="text"
                      placeholder="Country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                    <Input
                      id="zipCode"
                      type="text"
                      placeholder="ZIP/Postal Code"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="org" className="text-white text-lg mb-3 block">Organization Name</Label>
                <Input
                  id="org"
                  placeholder="e.g., Westside Youth Sports League"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
                <p className="text-sm text-slate-500 mt-2">Optional - this will appear on your scoreboards</p>
              </div>

              {/* Order summary */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-white text-lg">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Sport:</span>
                    <span className="font-medium text-white">{selectedSport?.name || 'Flag Football'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Plan:</span>
                    <span className="font-medium text-white">
                      {selectedTierData?.name} {subscriptionPrice > 0 ? `($${subscriptionPrice}/mo)` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Field-Days:</span>
                    <span className="font-medium text-white">{fieldDays} (${boardsTotal.toFixed(2)})</span>
                  </div>
                  <div className="h-px bg-slate-700 my-3" />
                  <div className="flex justify-between text-lg font-bold text-white">
                    <span>Total due today:</span>
                    <span className="text-primary">${(boardsTotal + subscriptionTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {!user && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-300">
                    You'll be asked to sign in or create an account before completing your purchase
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              onClick={handleContinue}
              disabled={loading || (!isAddingSport && step === 4 && (!firstName || !lastName || !email || !phoneNumber || !street1 || !city || !stateProvince || !country || !zipCode))}
              className="flex-1 h-14 text-lg bg-primary hover:bg-primary/90 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : step === totalSteps ? (user ? "Complete Purchase" : "Sign In & Continue") : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
