import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Give the webhook a moment to process
    const timer = setTimeout(() => {
      if (sessionId) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/50 border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Error</h1>
          <p className="text-slate-400 mb-6">
            We couldn't verify your payment. Please contact support if you were charged.
          </p>
          <Button onClick={() => navigate("/pricing")} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
            Back to Pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-slate-900/60 backdrop-blur-sm border-2 border-green-500/30 rounded-2xl p-8 md:p-12 text-center shadow-2xl shadow-green-500/10">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>

            {/* Success Message */}
            <h1 
              className="text-3xl md:text-4xl font-black text-white mb-4"
              style={{ fontFamily: "Orbitron, monospace" }}
            >
              Payment Successful!
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              Your subscription has been activated. You're all set to start creating amazing scoreboards!
            </p>

            {/* Session ID */}
            {sessionId && (
              <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4 mb-8">
                <p className="text-slate-500 text-xs mb-1">Transaction ID</p>
                <p className="text-slate-300 text-sm font-mono break-all">{sessionId}</p>
              </div>
            )}

            {/* What's Next */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-6 mb-8 text-left">
              <h2 className="text-lg font-bold text-white mb-3">What's Next?</h2>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">→</span>
                  <span>Head to your dashboard to start scheduling games</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">→</span>
                  <span>Set up your branding and customize your scoreboards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">→</span>
                  <span>Invite referees and assign them to games</span>
                </li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="border-slate-700 text-white hover:bg-slate-800"
                size="lg"
              >
                Back to Home
              </Button>
            </div>
          </div>

          {/* Support */}
          <p className="text-center text-slate-500 text-sm mt-6">
            Need help getting started? Contact us at{" "}
            <a href="mailto:support@scorelink.live" className="text-amber-400 hover:underline">
              support@scorelink.live
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
