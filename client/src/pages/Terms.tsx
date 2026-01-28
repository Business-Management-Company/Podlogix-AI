import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/">
            <Button variant="ghost" className="mb-6" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Terms & Conditions</CardTitle>
              <p className="text-muted-foreground">Last updated: January 28, 2026</p>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
                <p className="text-muted-foreground">
                  By accessing or using Podlogix, you agree to be bound by these Terms and Conditions. 
                  If you disagree with any part of these terms, you may not access the service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                <p className="text-muted-foreground">
                  Podlogix is a podcast automation platform that provides AI-powered transcription, 
                  show notes generation, content repurposing, voice identity protection, and podcast 
                  listener tools including personalized briefings and episode management.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>You must provide accurate and complete information when creating an account</li>
                  <li>You are responsible for maintaining the security of your account credentials</li>
                  <li>You must notify us immediately of any unauthorized access to your account</li>
                  <li>You may not use another person's account without permission</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Content Ownership</h2>
                <p className="text-muted-foreground mb-2">
                  <strong>Your Content:</strong> You retain ownership of all podcast content, audio files, 
                  and materials you upload to Podlogix. By uploading content, you grant us a license to 
                  process it for the purposes of providing our services.
                </p>
                <p className="text-muted-foreground">
                  <strong>Generated Content:</strong> AI-generated content (transcriptions, show notes, 
                  briefings) based on your uploads belongs to you. We do not claim ownership of 
                  generated outputs.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Voice Identity Certification</h2>
                <p className="text-muted-foreground mb-2">
                  Our voice identity protection feature uses blockchain technology. By using this feature:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>You certify that you have the right to register the voice sample</li>
                  <li>You understand that blockchain records are permanent and cannot be deleted</li>
                  <li>You acknowledge that we cannot guarantee prevention of all voice impersonation</li>
                  <li>Certification provides evidence of voice ownership, not legal protection</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Third-Party Integrations</h2>
                <p className="text-muted-foreground">
                  Our service integrates with third-party platforms including Spotify, YouTube, Instagram, 
                  and OpenAI. Your use of these integrations is subject to their respective terms of service. 
                  We are not responsible for third-party service availability or changes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Acceptable Use</h2>
                <p className="text-muted-foreground mb-2">You agree not to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Upload content that infringes on others' intellectual property rights</li>
                  <li>Use the service for illegal purposes</li>
                  <li>Attempt to circumvent security measures</li>
                  <li>Upload malicious content or files</li>
                  <li>Impersonate others or misrepresent your identity</li>
                  <li>Use the service to generate harmful or misleading content</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. AI-Generated Content Disclaimer</h2>
                <p className="text-muted-foreground">
                  AI-generated transcriptions, summaries, and briefings are provided for convenience and 
                  may contain errors. You are responsible for reviewing and verifying AI-generated content 
                  before publication or distribution. We do not guarantee the accuracy of AI outputs.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Service Availability</h2>
                <p className="text-muted-foreground">
                  We strive to maintain high availability but do not guarantee uninterrupted service. 
                  We may modify, suspend, or discontinue features with reasonable notice when possible.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, Podlogix shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages resulting from your use of the 
                  service, including but not limited to loss of data, revenue, or reputation.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
                <p className="text-muted-foreground">
                  You agree to indemnify and hold harmless Podlogix and its affiliates from any claims, 
                  damages, or expenses arising from your use of the service or violation of these terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
                <p className="text-muted-foreground">
                  We may terminate or suspend your account at any time for violations of these terms. 
                  You may delete your account at any time. Upon termination, your data will be deleted 
                  except for blockchain records which are permanent.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We reserve the right to modify these terms at any time. We will notify users of 
                  significant changes. Continued use of the service after changes constitutes 
                  acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">14. Governing Law</h2>
                <p className="text-muted-foreground">
                  These terms shall be governed by and construed in accordance with applicable laws. 
                  Any disputes shall be resolved through binding arbitration.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">15. Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these terms, please contact us at{" "}
                  <a href="mailto:legal@podlogix.io" className="text-primary hover:underline">
                    legal@podlogix.io
                  </a>
                </p>
              </section>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
