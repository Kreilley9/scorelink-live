import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/react-app/components/Footer';

export default function TermsOfService() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Agreement to Terms</h2>
              <p className="leading-relaxed">
                By accessing or using Scorelink Live ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you disagree with any part of these Terms, you may not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Description of Service</h2>
              <p className="leading-relaxed">
                Scorelink Live provides a real-time digital scoreboard platform for youth sports events. The Service allows 
                event coordinators to manage games, assign referees, and display live scores to spectators via QR codes and 
                web-based scoreboards.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">User Accounts</h2>
              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Account Creation</h3>
              <p className="leading-relaxed mb-4">
                You must create an account to use certain features of the Service. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Account Types</h3>
              <p className="leading-relaxed mb-4">
                The Service offers different user roles with varying levels of access:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Admin:</strong> Full system access and user management</li>
                <li><strong>Event Coordinator:</strong> Event and game management capabilities</li>
                <li><strong>Referee:</strong> Game scoring and clock control access</li>
                <li><strong>Viewer:</strong> Read-only access to assigned games</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Subscription and Payments</h2>
              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Pricing</h3>
              <p className="leading-relaxed mb-4">
                The Service operates on a field-day pricing model with three tiers: Basic, Standard, and Premium. Pricing is 
                subject to change with reasonable notice.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Payment Terms</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All fees are non-refundable unless otherwise specified</li>
                <li>Field-day credits never expire</li>
                <li>Volume discounts may be available for bulk purchases</li>
                <li>Payment processing is handled securely through Stripe</li>
                <li>You authorize us to charge your payment method for all fees</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Field Credits</h3>
              <p className="leading-relaxed">
                When a game on a field is activated for the first time, one field-day credit is consumed. The field remains 
                active for 24 hours from activation. Fields in "pending" status do not consume credits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Acceptable Use</h2>
              <p className="leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful, offensive, or inappropriate content</li>
                <li>Interfere with the Service's operation or security</li>
                <li>Attempt to gain unauthorized access to systems or data</li>
                <li>Use automated systems to access the Service excessively</li>
                <li>Resell or redistribute the Service without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Content and Data</h2>
              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Your Content</h3>
              <p className="leading-relaxed mb-4">
                You retain ownership of all content you submit to the Service (team names, game data, sponsor information, etc.). 
                By submitting content, you grant us a license to use, store, and display it as necessary to provide the Service.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Public Content</h3>
              <p className="leading-relaxed mb-4">
                Information displayed on public scoreboards (scores, team names, game times) is accessible to anyone with the 
                scoreboard link or QR code. Do not include sensitive or private information in these fields.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Data Backup</h3>
              <p className="leading-relaxed">
                While we implement reasonable backup procedures, you are responsible for maintaining your own backups of 
                important data. We are not liable for data loss.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Service Availability</h2>
              <p className="leading-relaxed mb-4">
                We strive to provide reliable service but cannot guarantee:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Uninterrupted or error-free operation</li>
                <li>Specific uptime percentages</li>
                <li>Immediate bug fixes or feature additions</li>
              </ul>
              <p className="leading-relaxed mt-4">
                We reserve the right to modify, suspend, or discontinue any part of the Service with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property</h2>
              <p className="leading-relaxed">
                The Service, including its design, code, features, and branding, is owned by Scorelink Live and protected by 
                intellectual property laws. You may not copy, modify, or reverse engineer any part of the Service without 
                our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Third-Party Services</h2>
              <p className="leading-relaxed">
                The Service may integrate with third-party services (Google OAuth, Stripe, etc.). Your use of these services 
                is subject to their respective terms and policies. We are not responsible for third-party service performance 
                or policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
              <p className="leading-relaxed mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The Service is provided "as is" without warranties of any kind</li>
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount you paid in the 12 months prior to the claim</li>
                <li>We are not responsible for scoreboard accuracy or game disputes</li>
                <li>You use the Service at your own risk</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify and hold harmless Scorelink Live from any claims, damages, or expenses arising from 
                your use of the Service, violation of these Terms, or infringement of any rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Termination</h2>
              <p className="leading-relaxed mb-4">
                We may terminate or suspend your account at any time for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violation of these Terms</li>
                <li>Non-payment of fees</li>
                <li>Fraudulent or abusive behavior</li>
                <li>Any other reason with reasonable notice</li>
              </ul>
              <p className="leading-relaxed mt-4">
                You may terminate your account at any time by contacting us. Termination does not entitle you to refunds 
                for unused field credits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Governing Law</h2>
              <p className="leading-relaxed">
                These Terms are governed by the laws of the jurisdiction in which Scorelink Live operates, without regard 
                to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Dispute Resolution</h2>
              <p className="leading-relaxed">
                Any disputes arising from these Terms or the Service will be resolved through good faith negotiation. 
                If negotiation fails, disputes may be resolved through binding arbitration in accordance with applicable 
                arbitration rules.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Changes to Terms</h2>
              <p className="leading-relaxed">
                We may modify these Terms at any time. Material changes will be communicated via email or Service 
                notification. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Severability</h2>
              <p className="leading-relaxed">
                If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in 
                full effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
              <p className="leading-relaxed">
                Questions about these Terms should be directed to:
              </p>
              <p className="mt-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
                <strong className="text-white">Email:</strong> legal@scorelinklive.com<br />
                <strong className="text-white">Support:</strong> support@scorelinklive.com
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
