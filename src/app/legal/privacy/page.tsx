import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Trovaar",
  description: "Trovaar Privacy Policy — learn how we collect, use, and protect your personal information on our marketplace platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-10">

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">1. Information We Collect</h2>
        <p className="text-muted leading-relaxed">
          We collect information you provide directly to us, information collected automatically when you
          use the Service, and information from third-party sources.
        </p>

        <h3 className="text-base font-semibold text-secondary mt-4 mb-2">Information you provide</h3>
        <ul className="list-disc list-inside text-muted space-y-1.5 leading-relaxed">
          <li><strong className="text-secondary">Account information:</strong> Name, email address, password, phone number, and account type (Consumer or Contractor).</li>
          <li><strong className="text-secondary">Profile information:</strong> Location, service categories, years of experience, certifications, business name, and profile photo.</li>
          <li><strong className="text-secondary">Job details:</strong> Descriptions, photos, videos, addresses, and other information related to service requests, including AI-analyzed content from uploaded media.</li>
          <li><strong className="text-secondary">Payment information:</strong> Billing address, bank account details, and payment card information, processed and stored by our third-party payment processor (Stripe). Trovaar does not store full credit card numbers.</li>
          <li><strong className="text-secondary">Communications:</strong> Messages sent through our in-app messaging and calling systems, reviews, ratings, and support inquiries.</li>
          <li><strong className="text-secondary">Verification documents:</strong> Government-issued ID, trade licenses, certifications, and insurance documentation submitted for contractor verification.</li>
        </ul>

        <h3 className="text-base font-semibold text-secondary mt-4 mb-2">Information collected automatically</h3>
        <ul className="list-disc list-inside text-muted space-y-1.5 leading-relaxed">
          <li><strong className="text-secondary">Log data:</strong> IP address, browser type, operating system, referring URLs, pages visited, and timestamps.</li>
          <li><strong className="text-secondary">Device information:</strong> Device identifiers, device model, operating system version, and mobile network information.</li>
          <li><strong className="text-secondary">Location data:</strong> Approximate location based on IP address, and precise GPS location if you grant permission, used to match you with nearby service providers.</li>
          <li><strong className="text-secondary">Usage data:</strong> Features used, actions taken, time spent on pages, search queries, and interaction patterns.</li>
        </ul>

        <h3 className="text-base font-semibold text-secondary mt-4 mb-2">Information from third parties</h3>
        <ul className="list-disc list-inside text-muted space-y-1.5 leading-relaxed">
          <li><strong className="text-secondary">Authentication providers:</strong> If you sign in using Google, Apple, or Facebook, we receive your name, email address, and profile photo from these services.</li>
          <li><strong className="text-secondary">Background check providers:</strong> Verification results and status (pass/fail) for contractors who undergo background checks.</li>
          <li><strong className="text-secondary">Payment processors:</strong> Transaction status and limited payment details from Stripe.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">2. How We Use Your Information</h2>
        <p className="text-muted leading-relaxed">
          We use the information we collect to:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li>Provide, operate, and improve the Service.</li>
          <li>Match Consumers with qualified Contractors based on job requirements, location, and availability.</li>
          <li>Process payments, hold funds in escrow, and send transaction-related notifications.</li>
          <li>Verify Contractor identities, licenses, certifications, and background check status.</li>
          <li>Facilitate in-app messaging and calling between matched users via Twilio.</li>
          <li>Analyze uploaded photos and videos using AI to assist with job categorization and scope estimation.</li>
          <li>Send service updates, security alerts, and support messages.</li>
          <li>Detect and prevent fraud, abuse, and violations of our Terms of Service.</li>
          <li>Comply with legal obligations and respond to lawful requests from public authorities.</li>
          <li>Send promotional communications (you can opt out at any time).</li>
          <li>Analyze usage trends and conduct research to improve the platform experience.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">3. Information Sharing</h2>
        <p className="text-muted leading-relaxed">
          We do not sell your personal information. We may share your information in the following circumstances:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li>
            <strong className="text-secondary">Between users:</strong> Consumer name, general location, and job
            details are shared with Contractors when a job is posted. Contractor profile information,
            including ratings, credentials, and verification status, is visible to Consumers. Once a bid
            is accepted, additional contact information may be shared to facilitate the job.
          </li>
          <li>
            <strong className="text-secondary">Payment processing:</strong> We share transaction data with
            Stripe to process payments, manage escrow, and handle payouts to Contractors.
          </li>
          <li>
            <strong className="text-secondary">Communication services:</strong> We use Twilio to power
            in-app messaging and calling features. Message content and call metadata are processed by Twilio.
          </li>
          <li>
            <strong className="text-secondary">Verification services:</strong> Contractor identity documents
            and personal information are shared with our background check and verification partners to
            perform identity verification, criminal background checks, and license validation.
          </li>
          <li>
            <strong className="text-secondary">Authentication providers:</strong> We integrate with Google,
            Apple, and Facebook for account sign-in. These providers receive confirmation of authentication
            events.
          </li>
          <li>
            <strong className="text-secondary">Cloud and infrastructure:</strong> Data is stored and processed
            using cloud hosting providers bound by data processing agreements.
          </li>
          <li>
            <strong className="text-secondary">Analytics:</strong> We use analytics tools to understand
            usage patterns and improve the Service. Analytics data is aggregated and de-identified where possible.
          </li>
          <li>
            <strong className="text-secondary">Legal requirements:</strong> We may disclose information when
            required by law, subpoena, or court order, or when we believe disclosure is necessary to
            protect the rights, property, or safety of Trovaar, our users, or others.
          </li>
          <li>
            <strong className="text-secondary">Business transfers:</strong> In the event of a merger, acquisition,
            or sale of assets, user data may be transferred as part of that transaction. We will notify
            you via email and/or prominent notice on the Service.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">4. Data Security</h2>
        <p className="text-muted leading-relaxed">
          We implement technical and organizational measures designed to protect your personal information
          against unauthorized access, alteration, disclosure, or destruction. These measures include:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li>Encryption of data in transit using TLS/SSL.</li>
          <li>Encryption of sensitive data at rest.</li>
          <li>Hashed password storage using industry-standard algorithms.</li>
          <li>Access controls limiting employee access to personal data on a need-to-know basis.</li>
          <li>Regular security assessments and penetration testing.</li>
          <li>Secure handling and limited retention of verification documents.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          However, no method of transmission over the internet or method of electronic storage is 100%
          secure. We cannot guarantee absolute security. In the event of a data breach affecting your
          personal information, we will notify you in accordance with applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">5. Data Retention</h2>
        <p className="text-muted leading-relaxed">
          We retain your personal information for as long as your account is active or as needed to provide
          you with the Service. We may also retain certain information as required by law, to resolve
          disputes, enforce our agreements, or for legitimate business purposes.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          After account deletion, we may retain anonymized or aggregated data that does not identify you.
          Transaction records and communications related to completed jobs may be retained for up to seven
          (7) years for legal and regulatory compliance. Verification documents are deleted within ninety
          (90) days of account closure unless a legal hold applies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">6. Cookies and Tracking Technologies</h2>
        <p className="text-muted leading-relaxed">
          We use cookies and similar tracking technologies to operate and improve the Service. Cookies
          are small data files stored on your device. We use:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li><strong className="text-secondary">Essential cookies:</strong> Required for authentication, session management, and core platform functionality. These cannot be disabled without affecting your ability to use the Service.</li>
          <li><strong className="text-secondary">Analytics cookies:</strong> Help us understand how users interact with the Service so we can improve the experience.</li>
          <li><strong className="text-secondary">Preference cookies:</strong> Remember your settings and choices to personalize your experience.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          You can control non-essential cookies through your browser settings. Note that disabling certain
          cookies may affect the functionality of the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">7. Third-Party Services</h2>
        <p className="text-muted leading-relaxed">
          The Service integrates with the following third-party services, each governed by their own
          privacy policies:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li><strong className="text-secondary">Stripe:</strong> Payment processing, escrow management, and Contractor payouts.</li>
          <li><strong className="text-secondary">Twilio:</strong> In-app messaging and voice calling between users.</li>
          <li><strong className="text-secondary">Google Sign-In:</strong> Optional authentication via Google accounts.</li>
          <li><strong className="text-secondary">Apple Sign-In:</strong> Optional authentication via Apple accounts.</li>
          <li><strong className="text-secondary">Facebook Login:</strong> Optional authentication via Facebook accounts.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          We encourage you to review the privacy policies of these third-party services before using their
          features through our platform. Trovaar is not responsible for the privacy practices of these
          third-party providers.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">8. Your Rights</h2>
        <p className="text-muted leading-relaxed">
          Depending on your location, you may have certain rights regarding your personal information:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li><strong className="text-secondary">Access:</strong> Request a copy of the personal information we hold about you.</li>
          <li><strong className="text-secondary">Correction:</strong> Request correction of inaccurate or incomplete information.</li>
          <li><strong className="text-secondary">Deletion:</strong> Request deletion of your personal information, subject to certain exceptions (e.g., legal obligations, active disputes, pending escrow transactions).</li>
          <li><strong className="text-secondary">Portability:</strong> Request your data in a structured, machine-readable format.</li>
          <li><strong className="text-secondary">Opt-out:</strong> Unsubscribe from marketing communications at any time by clicking &ldquo;unsubscribe&rdquo; in any email or updating your account preferences.</li>
          <li><strong className="text-secondary">Restriction:</strong> Request that we limit how we process your personal information in certain circumstances.</li>
          <li><strong className="text-secondary">Do Not Sell:</strong> We do not sell personal information. California residents may exercise their rights under the CCPA by contacting us.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          To exercise any of these rights, please contact us at the address below. We will respond to
          all legitimate requests within 30 days. We may need to verify your identity before processing
          your request.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">9. Children&apos;s Privacy</h2>
        <p className="text-muted leading-relaxed">
          The Service is not intended for individuals under the age of 18. We do not knowingly collect
          personal information from children under 18. If we become aware that a child under 18 has
          provided us with personal information, we will take steps to delete such information promptly.
          If you believe that a child under 18 has provided us with personal information, please contact
          us immediately.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">10. Changes to This Policy</h2>
        <p className="text-muted leading-relaxed">
          We may update this Privacy Policy from time to time. When we make material changes, we will
          notify you by email (sent to the address associated with your account) and/or by posting a
          prominent notice on the Service at least thirty (30) days before the changes take effect.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Your continued use of the Service after the effective date of the revised Privacy Policy
          constitutes your acceptance of the changes. We encourage you to review this page periodically
          to stay informed about our data practices.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">11. Contact Us</h2>
        <p className="text-muted leading-relaxed">
          If you have questions or concerns about this Privacy Policy or how we handle your personal data,
          please reach out:
        </p>
        <div className="mt-3 p-4 bg-slate-50 rounded-lg text-muted text-sm space-y-1">
          <p><strong className="text-secondary">Trovaar, Inc.</strong></p>
          <p>Privacy Team</p>
          <p>Email: <a href="mailto:privacy@trovaar.com" className="text-primary hover:underline">privacy@trovaar.com</a></p>
          <p>Support: <a href="mailto:support@trovaar.com" className="text-primary hover:underline">support@trovaar.com</a></p>
        </div>
        <p className="text-muted leading-relaxed mt-3 text-sm">
          If you are located in the European Economic Area and believe we have not adequately addressed
          your privacy concerns, you have the right to lodge a complaint with your local data protection
          authority.
        </p>
      </section>

    </div>
  );
}
