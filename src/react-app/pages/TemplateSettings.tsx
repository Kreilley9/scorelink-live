import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Label } from "@/react-app/components/ui/label";
import { Input } from "@/react-app/components/ui/input";
import { ArrowLeft, Clock, Timer, Shield, Zap, Save, Loader2, Trophy } from "lucide-react";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";
import { getSportById } from "@/data/sports";
import type { SportTemplateConfig } from "@/data/sports";

interface TemplateConfig extends SportTemplateConfig {}

const defaultTemplate: TemplateConfig = {
  game_length_minutes: 20,
  clock_direction: "down",
  period_count: 2,
  period_label: "Half",
  timeouts_per_period: 2,
  blitzes_per_period: 2,
  track_blitzes: true,
};

export default function TemplateSettings() {
  const navigate = useNavigate();
  const { activeSportAccount } = useSportAccount();
  const sportConfig = activeSportAccount ? getSportById(activeSportAccount.sport_type as any) : null;
  
  const [template, setTemplate] = useState<TemplateConfig>(defaultTemplate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [activeSportAccount]);

  const fetchTemplate = async () => {
    if (!activeSportAccount) return;
    
    try {
      setLoading(true);
      if (activeSportAccount.template_config) {
        const parsedConfig = typeof activeSportAccount.template_config === 'string' 
          ? JSON.parse(activeSportAccount.template_config)
          : activeSportAccount.template_config;
        setTemplate({ ...defaultTemplate, ...parsedConfig });
        // Check if current length is a custom value
        const standardLengths = sportConfig?.clockOptions || [10, 12, 15, 20, 25];
        if (parsedConfig.game_length_minutes && 
            !standardLengths.includes(parsedConfig.game_length_minutes)) {
          setShowCustomInput(true);
          setCustomMinutes(parsedConfig.game_length_minutes.toString());
        }
      }
    } catch (error) {
      console.error("Failed to fetch template:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeSportAccount) return;
    
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch(`/api/sport-accounts/${activeSportAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ template_config: template }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Refresh sport account data
        window.location.reload();
      } else {
        console.error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !activeSportAccount || !sportConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  const clockOptions = sportConfig.clockOptions || [10, 15, 20, 25, 30];
  const periodOptions = sportConfig.periodOptions || [2, 4];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Game Template Settings</h1>
            <p className="text-slate-400 text-sm">Configure default settings for {sportConfig.name} games</p>
          </div>
        </div>

        {/* Game Settings Section */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-6 mb-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Clock className="w-5 h-5 text-sky-400" />
            Game Settings
          </div>

          {/* Game Length */}
          {sportConfig.hasClock && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-400" />
                Period Length (minutes)
              </Label>
              <div className="flex gap-3 mt-3">
                {clockOptions.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setTemplate({ ...template, game_length_minutes: mins });
                      setShowCustomInput(false);
                      setCustomMinutes("");
                    }}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      template.game_length_minutes === mins && !showCustomInput
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {mins}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowCustomInput(true);
                    if (customMinutes) {
                      setTemplate({ ...template, game_length_minutes: parseInt(customMinutes) || 20 });
                    }
                  }}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    showCustomInput
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Other
                </button>
              </div>
              {showCustomInput && (
                <div className="mt-3">
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={customMinutes}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomMinutes(value);
                      const num = parseInt(value);
                      if (num > 0 && num <= 60) {
                        setTemplate({ ...template, game_length_minutes: num });
                      }
                    }}
                    placeholder="Enter minutes (1-60)"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>
          )}

          {/* Clock Direction */}
          {sportConfig.hasClock && sportConfig.clockDirectionOptions && sportConfig.clockDirectionOptions.length > 1 && (
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

          {/* Period Count */}
          {periodOptions.length > 1 && (
            <div>
              <Label className="text-base font-medium text-white">Game Format</Label>
              <div className="flex gap-3 mt-3">
                {periodOptions.map((count) => {
                  const label = count === 2 ? '2 Halves' : 
                               count === 4 && sportConfig.periodType === 'quarter' ? '4 Quarters' :
                               count === 4 ? '4 Periods' :
                               `${count} ${sportConfig.periodType}s`;
                  const periodLabel = count === 2 ? 'Half' :
                                     sportConfig.periodType === 'quarter' ? 'Quarter' :
                                     sportConfig.periodType.charAt(0).toUpperCase() + sportConfig.periodType.slice(1);
                  
                  return (
                    <button
                      key={count}
                      onClick={() => setTemplate({ ...template, period_count: count, period_label: periodLabel })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        template.period_count === count
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sport-Specific Settings Section */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-6 mb-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Shield className="w-5 h-5 text-blue-400" />
            {sportConfig.hasTimeouts ? 'Timeouts' : 'Game Options'}
            {sportConfig.features.hasBlitzes && ' & Blitzes'}
          </div>

          {/* Timeouts */}
          {sportConfig.hasTimeouts && (
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

          {/* Track Blitzes - Flag Football */}
          {sportConfig.features.hasBlitzes && (
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
          
          {/* Stoppage Time - Soccer */}
          {sportConfig.features.hasStoppageTime && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Track Stoppage Time?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, track_stoppage_time: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.track_stoppage_time
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, track_stoppage_time: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.track_stoppage_time
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Shootout - Soccer */}
          {sportConfig.features.hasShootout && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Enable Penalty Shootout?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, shootout_enabled: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.shootout_enabled
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, shootout_enabled: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.shootout_enabled
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Shot Clock - Basketball & Lacrosse */}
          {sportConfig.features.hasShotClock && (
            <>
              <div>
                <Label className="text-base font-medium text-white flex items-center gap-2">
                  <Timer className="w-4 h-4 text-blue-400" />
                  Enable Shot Clock?
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
                    Yes
                  </button>
                  <button
                    onClick={() => setTemplate({ ...template, shot_clock_enabled: false })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      !template.shot_clock_enabled
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              
              {template.shot_clock_enabled && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Shot Clock Seconds
                  </Label>
                  <div className="flex gap-3 mt-3">
                    {[24, 30, 35, 60].map((secs) => (
                      <button
                        key={secs}
                        onClick={() => setTemplate({ ...template, shot_clock_seconds: secs })}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                          template.shot_clock_seconds === secs
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {secs}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Running Clock - Basketball */}
          {activeSportAccount?.sport_type === 'basketball' && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Running Clock?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, running_clock: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.running_clock
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, running_clock: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.running_clock
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Down & Distance - Tackle Football */}
          {sportConfig.features.hasDownDistance && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Track Down & Distance?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, track_down_distance: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.track_down_distance
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, track_down_distance: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.track_down_distance
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Yard Line - Tackle Football */}
          {sportConfig.features.hasYardLine && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Track Ball Position?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, track_yard_line: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.track_yard_line
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, track_yard_line: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.track_yard_line
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Play Clock - Tackle Football */}
          {sportConfig.features.hasPlayClock && (
            <>
              <div>
                <Label className="text-base font-medium text-white flex items-center gap-2">
                  <Timer className="w-4 h-4 text-blue-400" />
                  Enable Play Clock?
                </Label>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => setTemplate({ ...template, play_clock_enabled: true })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      template.play_clock_enabled
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setTemplate({ ...template, play_clock_enabled: false })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      !template.play_clock_enabled
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              
              {template.play_clock_enabled && (
                <div>
                  <Label className="text-base font-medium text-white">
                    Play Clock Seconds
                  </Label>
                  <div className="flex gap-3 mt-3">
                    {[25, 30, 40].map((secs) => (
                      <button
                        key={secs}
                        onClick={() => setTemplate({ ...template, play_clock_seconds: secs })}
                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                          template.play_clock_seconds === secs
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {secs}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Simplified Mode - Tackle Football */}
          {sportConfig.features.hasSimplifiedMode && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Simplified Mode?
              </Label>
              <p className="text-sm text-slate-400 mt-1 mb-3">Hides advanced stats for younger players</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTemplate({ ...template, simplified_mode: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.simplified_mode
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, simplified_mode: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.simplified_mode
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Pitch Count - Baseball/Softball */}
          {sportConfig.features.hasPitchCount && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-400" />
                Track Pitch Count?
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
          
          {/* Base Runners - Baseball/Softball */}
          {sportConfig.features.hasBaseRunners && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Show Base Runners?
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
          
          {/* Timer Mode - Baseball/Softball */}
          {sportConfig.features.hasTimerMode && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Timer-Based Game?
              </Label>
              <p className="text-sm text-slate-400 mt-1 mb-3">Use time limit instead of innings</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTemplate({ ...template, timer_based_game: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.timer_based_game
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, timer_based_game: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.timer_based_game
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Best Of - Volleyball */}
          {sportConfig.features.hasBestOf && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-400" />
                Match Format
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, best_of: 3 })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.best_of === 3
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Best of 3
                </button>
                <button
                  onClick={() => setTemplate({ ...template, best_of: 5 })}
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
          
          {/* Match Point - Volleyball */}
          {sportConfig.features.hasMatchPoint && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Show Match Point Indicator?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, show_match_point: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.show_match_point
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, show_match_point: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.show_match_point
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Tennis Settings */}
          {activeSportAccount?.sport_type === 'tennis' && (
            <>
              <div>
                <Label className="text-base font-medium text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Game Format
                </Label>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => setTemplate({ ...template, singles_mode: true })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      template.singles_mode
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    Singles
                  </button>
                  <button
                    onClick={() => setTemplate({ ...template, singles_mode: false })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      !template.singles_mode
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    Doubles
                  </button>
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-blue-400" />
                  Match Format
                </Label>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => setTemplate({ ...template, best_of_sets: 1 })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      template.best_of_sets === 1
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    1 Set
                  </button>
                  <button
                    onClick={() => setTemplate({ ...template, best_of_sets: 3 })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      template.best_of_sets === 3
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    Best of 3
                  </button>
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Enable Tiebreak?
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
              
              <div>
                <Label className="text-base font-medium text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  No-Ad Scoring?
                </Label>
                <p className="text-sm text-slate-400 mt-1 mb-3">Sudden death at deuce</p>
                <div className="flex gap-3">
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
              
              <div>
                <Label className="text-base font-medium text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Super Tiebreak?
                </Label>
                <p className="text-sm text-slate-400 mt-1 mb-3">10-point tiebreak in final set</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTemplate({ ...template, super_tiebreak: true })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      template.super_tiebreak
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setTemplate({ ...template, super_tiebreak: false })}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      !template.super_tiebreak
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </>
          )}
          
          {/* Penalty Timer - Hockey, Lacrosse, Field Hockey */}
          {sportConfig.features.hasPenaltyTimer && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-400" />
                Enable Penalty Timer?
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
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, penalty_timer_enabled: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.penalty_timer_enabled
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Overtime - Hockey */}
          {sportConfig.features.hasOvertime && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Enable Overtime?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, overtime_mode: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.overtime_mode
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, overtime_mode: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.overtime_mode
                      ? "bg-sky-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          
          {/* Shootout Mode - Hockey, Field Hockey */}
          {sportConfig.features.hasShootoutMode && (
            <div>
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Enable Shootout Mode?
              </Label>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setTemplate({ ...template, shootout_mode: true })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    template.shootout_mode
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTemplate({ ...template, shootout_mode: false })}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !template.shootout_mode
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className={`w-full font-bold text-lg py-6 transition-all ${
            saved
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Save className="mr-2 w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 w-5 h-5" />
              Save Changes
            </>
          )}
        </Button>

        <p className="text-center text-slate-500 text-sm mt-4">
          These settings will apply to all new games you create
        </p>
      </div>
    </div>
  );
}
