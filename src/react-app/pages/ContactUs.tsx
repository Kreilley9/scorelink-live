import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Label } from '@/react-app/components/ui/label';
import { Textarea } from '@/react-app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/react-app/components/ui/radio-group';
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import Footer from '@/react-app/components/Footer';

export default function ContactUs() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_contact: 'email',
    organization: '',
    existing_customer: 'no',
    topic: 'general',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          preferred_contact: 'email',
          organization: '',
          existing_customer: 'no',
          topic: 'general',
          message: ''
        });
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Navigation */}
      <nav className="bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png" 
                alt="ScoreLink LIVE"
                className="h-12 md:h-14 cursor-pointer"
                onClick={() => navigate('/')}
              />
            </div>
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Get in Touch
            </h1>
            <p className="text-slate-400 text-lg">
              Have a question or need help? We're here for you.
            </p>
          </div>

          {/* Success Message */}
          {submitted && (
            <div className="mb-8 p-6 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-semibold mb-1">Message sent successfully!</p>
                <p className="text-slate-300 text-sm">We'll get back to you as soon as possible.</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-white mb-2 block">
                Name *
              </Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Your full name"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-white mb-2 block">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-white mb-2 block">
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Preferred Contact Method */}
            <div>
              <Label className="text-white mb-3 block">
                Preferred Contact Method *
              </Label>
              <RadioGroup 
                value={formData.preferred_contact} 
                onValueChange={(value) => updateField('preferred_contact', value)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="contact-email" className="border-slate-700" />
                  <Label htmlFor="contact-email" className="text-slate-300 cursor-pointer">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phone" id="contact-phone" className="border-slate-700" />
                  <Label htmlFor="contact-phone" className="text-slate-300 cursor-pointer">Phone</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Organization (optional) */}
            <div>
              <Label htmlFor="organization" className="text-white mb-2 block">
                Organization <span className="text-slate-500">(optional)</span>
              </Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => updateField('organization', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Your league or organization name"
              />
            </div>

            {/* Existing Customer */}
            <div>
              <Label className="text-white mb-3 block">
                Are you an existing customer? *
              </Label>
              <RadioGroup 
                value={formData.existing_customer} 
                onValueChange={(value) => updateField('existing_customer', value)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="customer-yes" className="border-slate-700" />
                  <Label htmlFor="customer-yes" className="text-slate-300 cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="customer-no" className="border-slate-700" />
                  <Label htmlFor="customer-no" className="text-slate-300 cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Topic */}
            <div>
              <Label htmlFor="topic" className="text-white mb-2 block">
                Topic *
              </Label>
              <Select value={formData.topic} onValueChange={(value) => updateField('topic', value)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
                  <SelectItem value="general">General Questions</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message" className="text-white mb-2 block">
                Message *
              </Label>
              <Textarea
                id="message"
                required
                value={formData.message}
                onChange={(e) => updateField('message', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[150px]"
                placeholder="Tell us how we can help..."
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
