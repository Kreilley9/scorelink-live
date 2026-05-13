import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/react-app/components/Footer';

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
              <p className="leading-relaxed">
                Scorelink Live ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains 
                how we collect, use, disclose, and safeguard your information when you use our live scoreboard service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Information We Collect</h2>
              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Personal Information</h3>
              <p className="leading-relaxed mb-4">
                When you create an account, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Email address (via Google OAuth authentication)</li>
                <li>Organization name</li>
                <li>User role and permissions</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Game and Event Data</h3>
              <p className="leading-relaxed mb-4">
                When you use our service, we store:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Game scores and statistics</li>
                <li>Team names and game schedules</li>
                <li>Field information</li>
                <li>Referee assignments</li>
                <li>Sponsor information (if applicable)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">Usage Information</h3>
              <p className="leading-relaxed mb-4">
                We automatically collect certain information about your device and usage patterns, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Browser type and version</li>
                <li>Device type</li>
                <li>Pages viewed and features used</li>
                <li>Time and date of access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">How We Use Your Information</h2>
              <p className="leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide and maintain our scoreboard service</li>
                <li>Process your subscription and payments</li>
                <li>Send you important service updates and notifications</li>
                <li>Respond to your questions and support requests</li>
                <li>Improve our service and develop new features</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Data Sharing and Disclosure</h2>
              <p className="leading-relaxed mb-4">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Service Providers:</strong> Third-party vendors who help us operate our service (payment processing, hosting, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition of our company</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Public Information</h2>
              <p className="leading-relaxed">
                Game scores, team names, and other game-related information displayed on public scoreboards are visible to 
                anyone who accesses the scoreboard via QR code or direct link. Do not include sensitive personal information 
                in publicly visible fields.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Data Security</h2>
              <p className="leading-relaxed">
                We implement appropriate technical and organizational measures to protect your information against unauthorized 
                access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we 
                cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Data Retention</h2>
              <p className="leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide our services. 
                Completed game data is retained for record-keeping purposes. You may request deletion of your account and 
                associated data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
              <p className="leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access to your personal information</li>
                <li>Correction of inaccurate information</li>
                <li>Deletion of your information</li>
                <li>Objection to processing of your information</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Children's Privacy</h2>
              <p className="leading-relaxed">
                Our service is designed for event coordinators and referees who are 18 years or older. We do not knowingly 
                collect personal information from children under 13. Game participants' names and scores may be displayed on 
                scoreboards, but we do not collect additional personal information about players.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Cookies and Tracking</h2>
              <p className="leading-relaxed">
                We use cookies and similar tracking technologies to maintain your session and improve your experience. 
                You can control cookies through your browser settings, but disabling them may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by updating 
                the "Last updated" date and, if appropriate, sending you an email notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
              <p className="leading-relaxed">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <p className="mt-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
                <strong className="text-white">Email:</strong> privacy@scorelinklive.com<br />
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
