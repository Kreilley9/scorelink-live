import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { 
  Clock, 
  Timer, 
  Shield, 
  Zap, 
  ChevronRight, 
  Check
} from "lucide-react";
import { getAvailableSports, getSportById, SportType, SportTemplateConfig } from "@/data/sports";
import { getSportIcon } from "@/react-app/utils/sportIcons";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState("");
  const [selectedSport, setSelectedSport] = useState<SportType>("flag_football");
  const [template, setTemplate] = useState<SportTemplateConfig>({
    game_length_minutes: 20,
    clock_direction: "down",
    period_count: 2,
    period_label: "Half",
    timeouts_per_period: 2,
    blitzes_per_period: 2,
    track_blitzes: true,
  });
  const [saving, setSaving] = useState(false);

  const availableSports = getAvailableSports();
  const currentSport = getSportById(selectedSport);

  // Update template when sport changes
  useEffect(() => {
    if (currentSport) {
      setTemplate({ ...currentSport.defaultTemplate });
    }
  }, [selectedSport]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/users/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organization_name: organizationName,
          sport_type: selectedSport,
          template_config: template,
        }),
      });

      if (response.ok) {
        navigate("/dashboard");
      } else {
        console.error("Failed to save onboarding");
      }
    } catch (error) {
      console.error("Error saving onboarding:", error);
    } finally {
      setSaving(false);
    }
  };

  // Determine if we need step 3 based on sport features
  const needsStep3 = currentSport?.hasTimeouts || currentSport?.features.hasBlitzes;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"}`}>
            {step > 1 ? <Check className="w-5 h-5" /> : "1"}
          </div>
          <div className={`w-16 h-1 rounded ${step >= 2 ? "bg-blue-500" : "bg-slate-700"}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"}`}>
            {step > 2 ? <Check className="w-5 h-5" /> : "2"}
          </div>
          {needsStep3 && (
            <>
              <div className={`w-16 h-1 rounded ${step >= 3 ? "bg-blue-500" : "bg-slate-700"}`} />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                3
              </div>
            </>
          )}
        </div>

        {/* Step 1: Welcome, Organization & Sport Selection */}
        {step === 1 && (
          <div className="text-center space-y-8">
            {(() => {
              const WelcomeIcon = getSportIcon(selectedSport);
              return (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-4">
                  <WelcomeIcon className="w-10 h-10 text-blue-500" />
                </div>
              );
            })()}
            <h1 className="text-4xl font-bold">Welcome to Scorelink Live!</h1>
            <p className="text-xl text-slate-300">
              Let's set up your scoreboard in just a few steps.
            </p>

            <div className="bg-slate-800/50 rounded-xl p-8 text-left space-y-6 border border-slate-700">
              {/* Sport Selection */}
              <div>
                <Label htmlFor="sport" className="text-lg font-medium text-white">
                  Select Your Sport
                </Label>
                <p className="text-sm text-slate-400 mt-1 mb-3">
                  Choose the sport you'll be tracking scores for
                </p>
                <Select value={selectedSport} onValueChange={(v) => setSelectedSport(v as SportType)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white text-lg py-6">
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-slate-800 border-slate-600 z-[100]"
                    position="popper"
                    sideOffset={5}
                  >
                    {availableSports.map((sport) => {
                      const SportIcon = getSportIcon(sport.id);
                      return (
                        <SelectItem 
                          key={sport.id} 
                          value={sport.id}
                          className="text-white hover:bg-slate-700 focus:bg-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <SportIcon className="w-5 h-5 text-blue-400" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{sport.name}</span>
                              <span className="text-xs text-slate-400">{sport.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Organization Name */}
              <div>
                <Label htmlFor="org" className="text-lg font-medium text-white">
                  Your Organization Name
                </Label>
                <p className="text-sm text-slate-400 mt-1 mb-3">
                  This will appear on your scoreboards (e.g., "Westside Youth Sports League")
                </p>
                <Input
                  id="org"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Enter your organization name"
                  className="bg-slate-900/50 border-slate-600 text-white text-lg py-6"
                />
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!organizationName.trim()}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg px-8 py-6"
            >
              Continue
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Step 2: Game Settings */}
        {step === 2 && currentSport && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-500/20 mb-4">
                <Clock className="w-8 h-8 text-sky-400" />
              </div>
              <h1 className="text-3xl font-bold">Game Settings</h1>
              <p className="text-slate-300 mt-2">
                Configure your standard {currentSport.name.toLowerCase()} game format
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-6">
              {/* Period/Inning Count */}
              {currentSport.periodOptions && currentSport.periodOptions.length > 1 && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Game Format
                  </Label>
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {currentSport.periodOptions.map((count) => {
                      const label = count === 2 ? "Halves" : 
                                   count === 3 ? "Periods" :
                                   count === 4 ? "Quarters" :
                                   currentSport.periodType === 'inning' ? "Innings" :
                                   currentSport.periodType === 'set' ? `Best of ${count}` :
                                   `${count} ${currentSport.defaultTemplate.period_label}s`;
                      return (
                        <button
                          key={count}
                          onClick={() => {
                            const periodLabel = count === 2 ? "Half" : 
                                               count === 3 ? "Period" :
                                               count === 4 ? "Quarter" : 
                                               currentSport.defaultTemplate.period_label;
                            setTemplate({ ...template, period_count: count, period_label: periodLabel });
                          }}
                          className={`flex-1 min-w-[100px] py-3 rounded-lg font-bold transition-all ${
                            template.period_count === count
                              ? "bg-blue-500 text-white"
                              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          }`}
                        >
                          {count} {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Game Length - only for sports with clocks */}
              {currentSport.hasClock && currentSport.clockOptions && currentSport.clockOptions.length > 0 && (
                <div>
                  <Label className="text-base font-medium text-white flex items-center gap-2">
                    <Timer className="w-4 h-4 text-blue-400" />
                    {currentSport.periodType === 'period' ? 'Minutes per period' : 
                     template.period_count === 2 ? 'Minutes per half' : 'Minutes per quarter'}
                  </Label>
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {currentSport.clockOptions.map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTemplate({ ...template, game_length_minutes: mins })}
                        className={`flex-1 min-w-[60px] py-3 rounded-lg font-bold transition-all ${
                          template.game_length_minutes === mins
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {mins}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clock Direction - only for sports with clock direction options */}
              {currentSport.hasClock && currentSport.clockDirectionOptions && currentSport.clockDirectionOptions.length > 1 && (
                <div>
                  <Label className="text-base font-medium text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    Clock Direction
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, clock_direction: "down" })}
                      className={`flex-1 py-4 rounded-lg font-bold transition-all ${
                        template.clock_direction === "down"
                          ? "bg-sky-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Count Down
                      <span className="block text-sm font-normal opacity-75 mt-1">
                        {template.game_length_minutes}:00 → 0:00
                      </span>
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, clock_direction: "up" })}
                      className={`flex-1 py-4 rounded-lg font-bold transition-all ${
                        template.clock_direction === "up"
                          ? "bg-sky-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Count Up
                      <span className="block text-sm font-normal opacity-75 mt-1">
                        0:00 → {template.game_length_minutes}:00
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sport-specific options */}
              
              {/* Basketball: Shot Clock */}
              {currentSport.features.hasShotClock && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Shot Clock
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, shot_clock_enabled: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.shot_clock_enabled
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      On
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, shot_clock_enabled: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.shot_clock_enabled
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Off
                    </button>
                  </div>
                </div>
              )}

              {/* Tackle Football: Simplified Mode */}
              {currentSport.features.hasSimplifiedMode && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Scoreboard Mode
                  </Label>
                  <p className="text-sm text-slate-400 mt-1 mb-3">
                    Simplified mode hides down, distance, and yard line for younger divisions
                  </p>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, simplified_mode: false, track_down_distance: true, track_yard_line: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.simplified_mode
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Full (with Down/Distance)
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, simplified_mode: true, track_down_distance: false, track_yard_line: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.simplified_mode
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Simplified
                    </button>
                  </div>
                </div>
              )}

              {/* Soccer: Stoppage Time */}
              {currentSport.features.hasStoppageTime && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Track Stoppage Time
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, track_stoppage_time: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.track_stoppage_time
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, track_stoppage_time: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.track_stoppage_time
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Baseball: Options */}
              {currentSport.features.hasPitchCount && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Show Pitch Count
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, track_pitch_count: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.track_pitch_count
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, track_pitch_count: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.track_pitch_count
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {currentSport.features.hasBaseRunners && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Show Base Runners
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, show_base_runners: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.show_base_runners
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, show_base_runners: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.show_base_runners
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Volleyball: Best of */}
              {currentSport.features.hasBestOf && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Match Format
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, best_of: 3, period_count: 3 })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.best_of === 3
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Best of 3
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, best_of: 5, period_count: 5 })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.best_of === 5
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Best of 5
                    </button>
                  </div>
                </div>
              )}

              {/* Tennis: Options */}
              {currentSport.features.hasTiebreak && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Tiebreak at 6-6
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, tiebreak_enabled: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.tiebreak_enabled
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, tiebreak_enabled: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.tiebreak_enabled
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {currentSport.features.hasNoAdScoring && (
                <div>
                  <Label className="text-base font-medium text-white">
                    No-Ad Scoring (Sudden death at deuce)
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, no_ad_scoring: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.no_ad_scoring
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, no_ad_scoring: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.no_ad_scoring
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Hockey/Lacrosse: Penalty Timer */}
              {currentSport.features.hasPenaltyTimer && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Penalty Timer
                  </Label>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setTemplate({ ...template, penalty_timer_enabled: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.penalty_timer_enabled
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      On
                    </button>
                    <button
                      onClick={() => setTemplate({ ...template, penalty_timer_enabled: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !template.penalty_timer_enabled
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Off
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                size="lg"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Back
              </Button>
              {needsStep3 ? (
                <Button
                  onClick={() => setStep(3)}
                  size="lg"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold"
                >
                  Continue
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold"
                >
                  {saving ? "Saving..." : "Finish Setup"}
                  <Check className="ml-2 w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Timeouts & Sport-Specific (only for applicable sports) */}
        {step === 3 && needsStep3 && currentSport && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold">
                {currentSport.features.hasBlitzes ? "Timeouts & Blitzes" : "Timeouts"}
              </h1>
              <p className="text-slate-300 mt-2">
                Set your league's timeout{currentSport.features.hasBlitzes ? " and blitz" : ""} rules
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-6">
              {/* Timeouts */}
              {currentSport.hasTimeouts && (
                <div>
                  <Label className="text-base font-medium text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Timeouts per {template.period_label.toLowerCase()}
                  </Label>
                  <div className="flex gap-3 mt-3">
                    {[0, 1, 2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() => setTemplate({ ...template, timeouts_per_period: num })}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                          template.timeouts_per_period === num
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Track Blitzes - Flag Football specific */}
              {currentSport.features.hasBlitzes && (
                <>
                  <div>
                    <Label className="text-base font-medium text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-sky-400" />
                      Track Blitzes?
                    </Label>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => setTemplate({ ...template, track_blitzes: true })}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                          template.track_blitzes
                            ? "bg-sky-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setTemplate({ ...template, track_blitzes: false, blitzes_per_period: 0 })}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                          !template.track_blitzes
                            ? "bg-sky-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Blitzes per period */}
                  {template.track_blitzes && (
                    <div>
                      <Label className="text-base font-medium text-white">
                        Blitzes per {template.period_label.toLowerCase()}
                      </Label>
                      <div className="flex gap-3 mt-3">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            onClick={() => setTemplate({ ...template, blitzes_per_period: num })}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                              template.blitzes_per_period === num
                                ? "bg-sky-500 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Preview */}
            <div className="bg-slate-900 rounded-xl p-6 border border-blue-500/30">
              <h3 className="text-lg font-bold text-blue-400 mb-4">Your Template Preview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800 rounded-lg p-3">
                  <span className="text-slate-400">Sport</span>
                  <p className="font-bold text-white">{currentSport.name}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <span className="text-slate-400">Organization</span>
                  <p className="font-bold text-white">{organizationName}</p>
                </div>
                {currentSport.hasClock && template.game_length_minutes > 0 && (
                  <>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <span className="text-slate-400">Game Length</span>
                      <p className="font-bold text-white">{template.game_length_minutes} min × {template.period_count} {template.period_label.toLowerCase()}s</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <span className="text-slate-400">Clock</span>
                      <p className="font-bold text-white">Count {template.clock_direction}</p>
                    </div>
                  </>
                )}
                {!currentSport.hasClock && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <span className="text-slate-400">Format</span>
                    <p className="font-bold text-white">{template.period_count} {template.period_label}s</p>
                  </div>
                )}
                {currentSport.hasTimeouts && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <span className="text-slate-400">Timeouts</span>
                    <p className="font-bold text-white">{template.timeouts_per_period} per {template.period_label.toLowerCase()}</p>
                  </div>
                )}
                {template.track_blitzes && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <span className="text-slate-400">Blitzes</span>
                    <p className="font-bold text-white">{template.blitzes_per_period} per {template.period_label.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                size="lg"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold"
              >
                {saving ? "Saving..." : "Finish Setup"}
                <Check className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
