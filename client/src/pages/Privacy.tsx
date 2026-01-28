import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
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
              <CardTitle className="text-3xl">Privacy Policy</CardTitle>
              <p className="text-muted-foreground">Last updated: January 28, 2026</p>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                <p className="text-muted-foreground">
                  Welcome to Podlogix. We respect your privacy and are committed to protecting your personal data. 
                  This privacy policy explains how we collect, use, and safeguard your information when you use our 
                  podcast automation platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
                <p className="text-muted-foreground mb-2">We collect and process the following types of information:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li><strong>Account Information:</strong> Name, email address, and profile information when you sign up</li>
                  <li><strong>Podcast Content:</strong> Audio files, transcriptions, and metadata you upload</li>
                  <li><strong>Social Media Data:</strong> Profile information from connected platforms (YouTube, Instagram, Spotify)</li>
                  <li><strong>Voice Identity Data:</strong> Voice samples for certification purposes, stored securely</li>
                  <li><strong>Usage Data:</strong> How you interact with our platform to improve our services</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-2">We use your information to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Provide and maintain our podcast automation services</li>
                  <li>Generate AI-powered transcriptions, show notes, and briefings</li>
                  <li>Create and manage your voice identity certification on the blockchain</li>
                  <li>Connect and display your social media profiles</li>
                  <li>Send notifications about new episodes and briefings</li>
                  <li>Improve and personalize your experience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
                <p className="text-muted-foreground">
                  We do not sell your personal data. We may share information with:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                  <li><strong>Service Providers:</strong> Third-party services that help us operate (OpenAI for transcription, blockchain networks)</li>
                  <li><strong>Connected Platforms:</strong> When you authorize connections to YouTube, Instagram, or Spotify</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Blockchain Data</h2>
                <p className="text-muted-foreground">
                  Voice identity certifications are stored on the Polygon blockchain. Once recorded, blockchain 
                  transactions are permanent and publicly visible. We do not store actual voice recordings on 
                  the blockchain—only verification hashes and metadata.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
                <p className="text-muted-foreground">
                  We implement industry-standard security measures to protect your data, including encryption 
                  in transit and at rest, secure authentication, and regular security audits. However, no 
                  method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
                <p className="text-muted-foreground mb-2">You have the right to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data (except blockchain records)</li>
                  <li>Disconnect social media accounts</li>
                  <li>Export your data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
                <p className="text-muted-foreground">
                  We use essential cookies to maintain your session and preferences. We do not use 
                  third-party tracking cookies for advertising purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
                <p className="text-muted-foreground">
                  Our service is not intended for users under 13 years of age. We do not knowingly 
                  collect data from children.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this privacy policy from time to time. We will notify you of any 
                  significant changes by posting the new policy on this page and updating the 
                  "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about this privacy policy or your data, please contact us at{" "}
                  <a href="mailto:privacy@podlogix.io" className="text-primary hover:underline">
                    privacy@podlogix.io
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
