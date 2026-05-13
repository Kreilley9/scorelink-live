import { useState } from "react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Calculator, TrendingDown, Sparkles } from "lucide-react";

const DAILY_RATES = {
  basic: 20,
  standard: 30,
  premium: 50,
};

const TIER_NAMES = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

const getVolumeDiscount = (fieldDays: number): number => {
  if (fieldDays >= 100) return 0.30;
  if (fieldDays >= 50) return 0.20;
  if (fieldDays >= 20) return 0.10;
  return 0;
};

interface CalculationResult {
  totalFieldDays: number;
  basePrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  pricePerFieldDay: number;
}

export function PricingCalculator() {
  const [fields, setFields] = useState<number>(4);
  const [days, setDays] = useState<number>(5);
  const [tier, setTier] = useState<'basic' | 'standard' | 'premium'>('standard');
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculate = () => {
    const dailyRate = DAILY_RATES[tier];
    const totalFieldDays = fields * days;
    const basePrice = dailyRate * totalFieldDays;
    const discountPercent = getVolumeDiscount(totalFieldDays);
    const discountAmount = basePrice * discountPercent;
    const finalPrice = basePrice - discountAmount;
    const pricePerFieldDay = finalPrice / totalFieldDays;

    setResult({
      totalFieldDays,
      basePrice,
      discountPercent,
      discountAmount,
      finalPrice,
      pricePerFieldDay,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/60 border-2 border-amber-500/30 rounded-2xl p-8 shadow-2xl shadow-amber-500/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Calculator className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">
            Pricing Calculator
          </h3>
          <p className="text-slate-400 text-sm">Find your best plan based on usage</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="fields" className="text-slate-300 mb-2 block">Number of Fields</Label>
            <Input
              id="fields"
              type="number"
              min="1"
              value={fields}
              onChange={(e) => setFields(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-slate-950/50 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="days" className="text-slate-300 mb-2 block">Number of Days</Label>
            <Input
              id="days"
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-slate-950/50 border-slate-700 text-white"
            />
            <p className="text-slate-500 text-xs mt-1">
              Total: {fields * days} field-days
            </p>
            {getVolumeDiscount(fields * days) > 0 && (
              <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                {getVolumeDiscount(fields * days) * 100}% volume discount applies
              </p>
            )}
          </div>

          <div>
            <Label className="text-slate-300 mb-3 block">Select Tier</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['basic', 'standard', 'premium'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all font-semibold text-sm ${
                    tier === t
                      ? t === 'basic'
                        ? 'border-sky-500 bg-sky-500/20 text-sky-400'
                        : t === 'standard'
                        ? 'border-slate-300 bg-slate-300/20 text-slate-300'
                        : 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {TIER_NAMES[t]}
                  <div className="text-xs opacity-75">${DAILY_RATES[t]}/day</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col justify-center">
          {result ? (
            <div className="bg-slate-950/50 border border-amber-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 font-semibold text-sm uppercase tracking-wide">
                  Your Price
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400 text-sm">Base Price</span>
                  <span className="text-slate-300 font-semibold">{formatCurrency(result.basePrice)}</span>
                </div>
                
                {result.discountPercent > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-amber-400 text-sm">Volume Discount ({result.discountPercent * 100}%)</span>
                    <span className="text-amber-400 font-semibold">-{formatCurrency(result.discountAmount)}</span>
                  </div>
                )}
                
                <div className="border-t border-slate-800 pt-3">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-white font-semibold">Total Price</span>
                    <span className="text-3xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
                      {formatCurrency(result.finalPrice)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs text-right">
                    {formatCurrency(result.pricePerFieldDay)} per field-day
                  </p>
                </div>
              </div>

              <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3">
                <p className="text-sky-400 text-sm font-semibold mb-1">
                  {result.totalFieldDays} field-days total
                </p>
                <p className="text-slate-400 text-xs">
                  {fields} field{fields > 1 ? 's' : ''} × {days} day{days > 1 ? 's' : ''}
                </p>
              </div>

              {result.discountPercent === 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-slate-500 text-xs">
                    💡 Get {getVolumeDiscount(20) > result.discountPercent ? '10% off' : '20% off'} at {getVolumeDiscount(20) > result.discountPercent ? '20' : '50'}+ field-days
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm mb-4">
                Enter your details and click calculate to see your best pricing option
              </p>
              <Button
                onClick={calculate}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Calculate Best Plan
              </Button>
            </div>
          )}

          {result && (
            <Button
              onClick={calculate}
              className="mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold w-full"
            >
              Recalculate
            </Button>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="border-t border-slate-800 pt-4">
        <p className="text-slate-500 text-xs text-center">
          Pricing shown for the <span className="text-slate-400 font-semibold">{TIER_NAMES[tier]}</span> tier. 
          Volume discounts: 10% at 20+ • 20% at 50+ • 30% at 100+ field-days.
        </p>
      </div>
    </div>
  );
}
