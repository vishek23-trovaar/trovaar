import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Trovaar",
  description: "Trovaar Terms of Service — rules and guidelines governing use of our marketplace platform connecting consumers with independent contractors.",
};

export default function TermsOfServicePage() {
  return (
    <div className="space-y-10">

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">1. Acceptance of Terms</h2>
        <p className="text-muted leading-relaxed">
          By accessing or using the Trovaar platform, website, or any associated mobile applications
          (collectively, the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service
          (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you may not use the Service. These
          Terms constitute a legally binding agreement between you and Trovaar, Inc.
          (&ldquo;Trovaar,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
        </p>
        <p className="text-muted leading-relaxed mt-3">
          We reserve the right to update or modify these Terms at any time. Continued use of the Service
          after changes constitutes acceptance of the revised Terms. We will notify registered users of
          material changes via email or an in-app notification at least thirty (30) days before the
          changes take effect.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">2. Description of Service</h2>
        <p className="text-muted leading-relaxed">
          Trovaar is an online marketplace that connects consumers seeking home, automotive, and
          commercial services (&ldquo;Consumers&rdquo; or &ldquo;Clients&rdquo;) with independent
          contractors and service providers (&ldquo;Contractors&rdquo;). Our platform allows Consumers
          to post job requests&mdash;including via photo, video, and AI-assisted analysis&mdash;receive
          competitive bids, and engage Contractors to perform work.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Trovaar is a technology platform and intermediary only. We do not employ Contractors,
          perform services, or guarantee the quality, safety, legality, or timeliness of any work
          performed through the platform. All contracts for services are entered into directly between
          Consumers and Contractors. Trovaar is not a party to those agreements.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">3. User Accounts and Responsibilities</h2>
        <p className="text-muted leading-relaxed">
          To access certain features of the Service, you must create an account. You agree to:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li>Provide accurate, complete, and current information during registration.</li>
          <li>Maintain the security of your password and accept responsibility for all activity under your account.</li>
          <li>Notify us immediately of any unauthorized use of your account.</li>
          <li>Be at least 18 years of age to use the Service.</li>
          <li>Not create more than one personal account or create an account on behalf of another person without authorization.</li>
          <li>Comply with all applicable federal, state, and local laws and regulations.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Consumer responsibilities:</strong> Consumers are responsible
          for providing accurate job descriptions, granting safe and lawful access to work sites, and
          confirming job completion honestly and in a timely manner.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Contractor responsibilities:</strong> Contractors are
          responsible for maintaining all required licenses, permits, and insurance for the services
          they offer; performing work in a professional and workmanlike manner; and complying with all
          applicable trade regulations.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          We reserve the right to suspend or terminate accounts that violate these Terms or that we believe
          pose a risk to the safety or integrity of the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">4. Independent Contractor Status</h2>
        <p className="text-muted leading-relaxed">
          Contractors who use the Trovaar platform are independent contractors and are
          <strong className="text-secondary"> not employees, agents, joint venturers, or partners of Trovaar</strong>.
          Trovaar does not control the manner or method by which Contractors perform services. Contractors
          are solely responsible for determining the means and methods of completing any job.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Trovaar does not provide Contractors with tools, equipment, or supplies. Contractors set
          their own schedules, choose which jobs to bid on, and may decline any job at their discretion.
          Trovaar does not withhold taxes or provide employment benefits, workers&apos; compensation,
          or insurance to Contractors.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Contractors are responsible for reporting and paying all applicable federal, state, and local
          taxes on income earned through the platform. Trovaar will issue applicable tax forms (such
          as IRS Form 1099) as required by law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">5. Job Posting, Scope Definition, and Bidding</h2>
        <p className="text-muted leading-relaxed">
          Consumers may post job requests by uploading photos, videos, or text descriptions. Our
          AI-assisted tools may analyze media to help categorize and describe the scope of work, but
          Consumers remain responsible for the accuracy of their job postings.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Scope specificity requirement:</strong> Consumers are
          required to provide clear, specific details about the work they need performed at the time
          of posting&mdash;either through their video/photo submission or through the written description
          and AI-reviewed fields. The job posting as submitted and accepted by the Contractor constitutes
          the agreed-upon scope of work.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Scope protection for Contractors:</strong> Any additional
          requirements, modifications, or &ldquo;add-ons&rdquo; introduced by the Consumer after a bid
          has been accepted are considered outside the original scope. If a Consumer adds new requirements
          after accepting a bid and later claims dissatisfaction based on those additions, the original
          Contractor&apos;s work will be evaluated solely against the original job posting. The Contractor
          is not obligated to perform work beyond the agreed scope without a formal change order.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Contractors may browse available jobs and submit bids. Bids are non-binding offers until
          accepted by the Consumer. Once a Consumer accepts a bid, a binding agreement is formed
          directly between the Consumer and the Contractor for the scope and price stated in the
          original job posting.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Trovaar reserves the right to remove job postings or bids that violate these Terms, contain
          prohibited content, or appear fraudulent. We may also limit the number of active job postings
          or bids per user at our discretion.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">6. Escrow Payments, Completion Flow, and Platform Fee</h2>
        <p className="text-muted leading-relaxed">
          When a Consumer accepts a Contractor&apos;s bid, the total amount due from the Consumer
          includes the Contractor&apos;s bid price plus a 20% platform service fee. This platform
          fee covers the cost of secure payment processing, escrow services, verification programs,
          dispute resolution, and platform operations.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Escrow:</strong> Upon bid acceptance, the full payment
          amount (bid price plus platform fee) is collected from the Consumer and held in escrow by
          Trovaar or its designated payment processor. Funds are held securely until the completion
          process described below is fulfilled.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Job completion and escrow release process:</strong> Escrow
          funds are released only after the following mandatory steps are completed in order:
        </p>
        <ol className="list-decimal ml-6 mt-2 space-y-2 text-muted">
          <li>
            <strong className="text-secondary">Contractor uploads before &amp; after photos</strong> &mdash;
            The Contractor must document the completed work by uploading photos showing the state of the
            work area before the job began and after it was completed. This visual record serves as evidence
            for both parties.
          </li>
          <li>
            <strong className="text-secondary">Consumer leaves a mandatory review</strong> &mdash;
            The Consumer must submit a review (star rating and written feedback) of the completed work.
            Reviews are mandatory and cannot be skipped. This ensures every job has documented feedback
            and builds accountability on both sides.
          </li>
          <li>
            <strong className="text-secondary">Consumer selects a tip (optional)</strong> &mdash;
            After reviewing, the Consumer is presented with the option to tip the Contractor. Tips are
            entirely voluntary but serve as the truest signal of satisfaction. Contractors with high tip
            rates earn &ldquo;Top Rated&rdquo; badges.
          </li>
          <li>
            <strong className="text-secondary">Escrow released</strong> &mdash;
            Once the review and optional tip selection are complete, the Contractor&apos;s bid amount
            (100% of their stated bid) plus any tip is released to the Contractor. The 20% platform fee
            is retained by Trovaar. Contractors keep the full amount of their bid&mdash;the platform fee
            is charged to the Consumer, not deducted from the Contractor&apos;s payment.
          </li>
        </ol>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Confirmation timeline:</strong> If the Consumer does not
          complete the review within five (5) business days of the Contractor uploading completion photos,
          the escrow funds will be automatically released to the Contractor. Trovaar will attempt to
          contact the Consumer before auto-release.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Cancellations:</strong> If a job is cancelled before
          work begins, the Consumer will receive a full refund. Cancellations after work has commenced
          are handled through the dispute resolution process described below.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">7. Dispute Resolution and Re-Service</h2>
        <p className="text-muted leading-relaxed">
          If a dispute arises between a Consumer and a Contractor regarding job quality, scope,
          completion, or payment, the parties are encouraged to resolve it directly using the
          in-app messaging tools.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          If the parties cannot reach agreement, either party may file a dispute through the platform.
          Our team will review the relevant information&mdash;including the original job posting
          (video, photos, and/or description), accepted bid, in-app communications, before &amp; after
          photos, and completion evidence&mdash;and issue a determination within five (5) business days.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Dissatisfaction and resolution process:</strong> If a Consumer
          is legitimately dissatisfied with the quality of completed work (as evaluated against the
          original job posting specifications), the following process applies:
        </p>
        <ol className="list-decimal ml-6 mt-2 space-y-2 text-muted">
          <li>
            <strong className="text-secondary">Original Contractor has the right to rectify:</strong> The
            original Contractor will be given the first opportunity to correct the issue at no additional
            cost to the Consumer. The original job posting and details serve as the guide for what the
            completed work should look like. The Contractor has three (3) business days to respond and
            schedule the rectification.
          </li>
          <li>
            If the original Contractor is unable or unwilling to rectify the issue, or if the rectification
            is unsatisfactory, the Contractor receives a <strong className="text-secondary">partial payment</strong> for
            work satisfactorily completed, as determined by Trovaar based on the proportion of the job scope
            that was properly performed.
          </li>
          <li>
            The remaining escrowed funds are used to engage a <strong className="text-secondary">different
            verified Contractor</strong> through the Trovaar platform to complete or correct the work to
            the Consumer&apos;s standards as defined in the original job posting.
          </li>
          <li>
            Trovaar facilitates the re-service matching but does not absorb any costs. The cost of the
            re-service comes entirely from the original escrowed payment amount.
          </li>
        </ol>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Scope-based evaluation:</strong> All disputes are evaluated
          strictly against the original job posting as submitted by the Consumer and accepted by the
          Contractor. If the Consumer introduces requirements, specifications, or expectations that were
          not included in the original job posting, those additional items are considered outside the
          agreed scope and will not be grounds for a dispute against the original Contractor. Adding
          requirements after-the-fact is treated as a new scope of work and does not constitute evidence
          of contractor negligence or poor workmanship.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Job Change Orders:</strong> If the Consumer requests additional
          work, modifications, or changes beyond the original job posting scope during the course of the job,
          the Contractor must submit a formal Job Change Order through the platform. A Job Change Order
          documents the additional work requested, whether it carries an additional cost or is provided at
          no charge, and any required materials. The Consumer must approve the Job Change Order before the
          Contractor proceeds with the additional work. Work performed under an approved Job Change Order
          is treated as part of the agreed scope for dispute evaluation purposes. Work requested but not
          documented through a Job Change Order is not covered by the dispute resolution process.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Contractor accountability:</strong> Contractors who receive
          multiple legitimate disputes are subject to the platform&apos;s strike system: first offense
          results in a warning, second offense results in profile deprioritization and bid restrictions,
          and third offense results in permanent account deactivation.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Consumer accountability:</strong> Consumers who file
          bad-faith disputes&mdash;including disputes based on requirements not present in the original
          job posting, or disputes filed to avoid paying for satisfactorily completed work&mdash;will
          receive warnings and may have their accounts restricted or terminated.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          During the dispute resolution process, escrowed funds will remain held until a resolution
          is reached or a final determination is made. Trovaar&apos; determination regarding escrowed
          funds is final. This process does not prevent either party from pursuing other legal remedies
          available under applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">8. Contractor Verification</h2>
        <p className="text-muted leading-relaxed">
          Trovaar offers voluntary and required verification programs for Contractors, which may
          include identity verification, background checks, license verification, and certification
          review. Verification badges displayed on Contractor profiles indicate only that we have
          reviewed submitted documentation&mdash;they do not constitute an endorsement of any
          Contractor&apos;s character, capabilities, or fitness for a particular job.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          We do not guarantee the accuracy, completeness, or currency of any verification result.
          Consumers are encouraged to independently verify Contractor credentials and exercise their
          own judgment when selecting a service provider. Trovaar is not liable for damages arising
          from reliance on platform verification status.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">9. In-App Communication</h2>
        <p className="text-muted leading-relaxed">
          The Service provides in-app messaging and calling features to facilitate communication
          between Consumers and Contractors. All communications through these channels may be
          monitored and recorded for quality assurance, fraud prevention, and dispute resolution
          purposes.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Users agree not to use platform communication tools to share personal contact information
          for the purpose of circumventing the platform, send unsolicited commercial messages, or
          engage in harassing or threatening behavior.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">10. Content and Intellectual Property</h2>
        <p className="text-muted leading-relaxed">
          <strong className="text-secondary">Your content:</strong> You retain ownership of content
          you upload to the Service, including photos, videos, descriptions, and reviews
          (&ldquo;User Content&rdquo;). By posting User Content, you grant Trovaar a worldwide,
          non-exclusive, royalty-free, transferable license to use, reproduce, modify, display, and
          distribute your User Content in connection with operating and promoting the Service.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong className="text-secondary">Our content:</strong> The Service and its original
          content (excluding User Content), features, and functionality are owned by Trovaar and
          are protected by copyright, trademark, and other intellectual property laws. The Trovaar
          name, logo, and all related marks are trademarks of Trovaar, Inc.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          You agree not to copy, modify, distribute, sell, or lease any part of the Service or its
          content, and not to reverse-engineer or attempt to extract the source code of the software.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">11. Limitation of Liability</h2>
        <p className="text-muted leading-relaxed">
          Trovaar is a marketplace platform. We are not a service provider, general contractor,
          or employer. We do not perform, supervise, or control any work performed by Contractors.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          To the fullest extent permitted by applicable law, Trovaar, its officers, directors,
          employees, and agents shall not be liable for any indirect, incidental, special, consequential,
          or punitive damages arising out of or related to your use of the Service, including but not
          limited to: damages for loss of profits, data, goodwill, property damage, personal injury,
          or other intangible losses, even if Trovaar has been advised of the possibility of such damages.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Without limiting the foregoing, Trovaar is not liable for: (a) the conduct, whether online
          or offline, of any user; (b) the quality, safety, or legality of any services performed;
          (c) any disputes between Consumers and Contractors; or (d) the accuracy of any AI-generated
          analysis or recommendations.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Trovaar&apos; total liability to you for any claim arising from or related to the Service
          shall not exceed the greater of (a) the total fees paid by you to Trovaar in the twelve
          months preceding the claim, or (b) one hundred dollars ($100.00).
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability.
          In such jurisdictions, our liability is limited to the greatest extent permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">12. Prohibited Uses</h2>
        <p className="text-muted leading-relaxed">
          You agree not to use the Service to:
        </p>
        <ul className="list-disc list-inside text-muted space-y-1.5 mt-3 leading-relaxed">
          <li>Post fraudulent, misleading, or illegal job listings or bids.</li>
          <li>Harass, threaten, or discriminate against any other user.</li>
          <li>Circumvent the platform to transact with a matched user outside of Trovaar.</li>
          <li>Share personal contact information with other users prior to bid acceptance, except through designated platform channels.</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with a person or entity.</li>
          <li>Use automated tools, bots, or scrapers to access or collect data from the platform.</li>
          <li>Engage in price gouging, deceptive pricing, or predatory practices.</li>
          <li>Upload content that is defamatory, obscene, or infringes on the rights of others.</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or connected systems.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Violations may result in immediate account suspension, forfeiture of funds held in escrow, and
          referral to law enforcement where appropriate.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">13. Privacy</h2>
        <p className="text-muted leading-relaxed">
          Your use of the Service is also governed by our{" "}
          <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>,
          which describes how we collect, use, and share your personal information. By using the
          Service, you consent to the collection and use of your information as described in the
          Privacy Policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">14. Termination</h2>
        <p className="text-muted leading-relaxed">
          You may deactivate your account at any time through your account settings or by contacting
          support. Trovaar may suspend or terminate your account at any time, with or without cause,
          and with or without notice.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Upon termination: (a) your right to access the Service will immediately cease; (b) any
          pending escrow funds will be handled in accordance with the escrow and dispute resolution
          provisions of these Terms; (c) provisions that by their nature should survive termination
          will remain in effect, including but not limited to: intellectual property, limitation of
          liability, indemnification, and governing law provisions.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Trovaar may retain certain information as required by law or for legitimate business
          purposes after account termination.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">15. Indemnification</h2>
        <p className="text-muted leading-relaxed">
          You agree to indemnify, defend, and hold harmless Trovaar and its officers, directors,
          employees, agents, and affiliates from and against any claims, liabilities, damages, losses,
          costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to:
          (a) your use of or conduct on the Service; (b) your violation of these Terms; (c) your
          violation of any rights of a third party; or (d) any work performed or services provided
          by you through the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">16. Governing Law and Arbitration</h2>
        <p className="text-muted leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of the State of
          Delaware, without regard to its conflict of law provisions. Any dispute arising from or relating
          to these Terms or the Service shall be subject to the exclusive jurisdiction of the state and
          federal courts located in New Castle County, Delaware.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          You agree to waive any right to a jury trial in connection with any claim arising under or
          related to these Terms, and to submit to binding individual arbitration for any such claims,
          to the extent permitted by applicable law. Class action lawsuits and class-wide arbitration
          are not permitted.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in
          any court of competent jurisdiction to prevent the actual or threatened infringement or
          misappropriation of intellectual property rights.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">17. Severability</h2>
        <p className="text-muted leading-relaxed">
          If any provision of these Terms is found to be invalid or unenforceable by a court of
          competent jurisdiction, the remaining provisions shall remain in full force and effect. The
          invalid or unenforceable provision shall be modified to the minimum extent necessary to make
          it valid and enforceable.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">18. Contact Information</h2>
        <p className="text-muted leading-relaxed">
          If you have any questions about these Terms of Service, please contact us:
        </p>
        <div className="mt-3 p-4 bg-slate-50 rounded-lg text-muted text-sm space-y-1">
          <p><strong className="text-secondary">Trovaar, Inc.</strong></p>
          <p>Legal Department</p>
          <p>Email: <a href="mailto:legal@trovaar.com" className="text-primary hover:underline">legal@trovaar.com</a></p>
          <p>Support: <a href="mailto:support@trovaar.com" className="text-primary hover:underline">support@trovaar.com</a></p>
        </div>
      </section>

    </div>
  );
}
