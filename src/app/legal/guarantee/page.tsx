import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resolution Guarantee | Trovaar",
  description: "Trovaar Resolution Guarantee — we guarantee every dispute gets resolved fairly. No one gets stuck.",
};

export default function GuaranteePage() {
  return (
    <div className="space-y-10">

      {/* Hero badge */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <svg className="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <div>
          <h2 className="text-lg font-bold text-blue-800">Trovaar Resolution Guarantee</h2>
          <p className="text-sm text-blue-700 mt-0.5">
            We guarantee every issue gets resolved. Not refunds — real solutions.
          </p>
        </div>
      </div>

      {/* Philosophy */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">Our Approach</h2>
        <p className="text-muted leading-relaxed">
          Trovaar is a marketplace that connects clients with independent contractors. We don&apos;t perform the work —
          skilled professionals do. That&apos;s why instead of a money-back guarantee (which invites abuse and
          hurts honest contractors), we guarantee something better: <strong className="text-secondary">every problem gets a real resolution.</strong>
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Our model protects both sides. Clients get their issues fixed. Contractors don&apos;t lose money
          to bad-faith claims. The platform stays sustainable so we can keep serving everyone.
        </p>
      </section>

      {/* Mandatory Completion Flow */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-4">How Payment Gets Released</h2>
        <p className="text-muted leading-relaxed mb-4">
          Payment is never released automatically. It follows a strict process that protects everyone:
        </p>
        <div className="space-y-3">
          {[
            { step: "1", icon: "📸", title: "Contractor Uploads Before & After Photos", desc: "The contractor must document their work with photos showing the job site before and after. No photos = no payment release. This creates an evidence trail." },
            { step: "2", icon: "⭐", title: "Client Leaves a Mandatory Review", desc: "The client must leave a star rating and written review. Reviews are mandatory — they cannot be skipped. This ensures every job has documented feedback." },
            { step: "3", icon: "💵", title: "Client Selects a Tip (Optional)", desc: "After reviewing, the client can optionally tip the contractor. Tips are voluntary but are the truest signal of satisfaction. High tip rates earn contractors \"Top Rated\" badges." },
            { step: "4", icon: "✅", title: "Escrow Released", desc: "Once the review and tip selection are complete, the contractor's full bid amount (plus any tip) is released. The 20% platform fee is retained by Trovaar." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">{item.step}</span>
              <div>
                <h3 className="font-semibold text-secondary">{item.icon} {item.title}</h3>
                <p className="text-sm text-muted mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How Protection Works */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-4">How You&apos;re Protected</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-semibold text-secondary mb-1">Escrow Holds Until You Review</h3>
            <p className="text-sm text-muted">
              Your payment stays locked in escrow until you&apos;ve reviewed the work. You control when payment releases
              by completing the mandatory review process.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold text-secondary mb-1">Re-Service Matching</h3>
            <p className="text-sm text-muted">
              If there&apos;s a legitimate issue with the work, Trovaar will match you with a different verified
              contractor to fix it. The repair cost comes from the original contractor&apos;s payout — not you, and not the platform.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="text-2xl mb-2">📸</div>
            <h3 className="font-semibold text-secondary mb-1">Photo Verification</h3>
            <p className="text-sm text-muted">
              Contractors are required to upload before &amp; after photos on jobs over $200.
              This creates a visual record that protects both parties in case of a dispute.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="text-2xl mb-2">⚖️</div>
            <h3 className="font-semibold text-secondary mb-1">Fair Mediation</h3>
            <p className="text-sm text-muted">
              Our admin team reviews every dispute within 24 hours, examining messages, photos, job history,
              and both parties&apos; track records before making a fair resolution.
            </p>
          </div>
        </div>
      </section>

      {/* What Happens When There's a Problem */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-4">What Happens If You&apos;re Not Satisfied</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
          <p className="text-amber-800 text-sm font-medium">
            Important: Dissatisfaction claims are evaluated strictly against the original job posting.
            If you add new requirements after accepting a bid, the original contractor is considered to have
            fulfilled their agreement. Be specific in your job posting — that&apos;s your contract.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">1</span>
            <div>
              <p className="font-medium text-secondary">File a Dispute</p>
              <p className="text-sm text-muted">Before releasing payment, go to the job and tap &ldquo;File a Dispute.&rdquo; Describe exactly what doesn&apos;t match the original job posting. Attach photos.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="mt-0.5 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">2</span>
            <div>
              <p className="font-medium text-secondary">Payment Frozen</p>
              <p className="text-sm text-muted">The contractor&apos;s payout is frozen in escrow while under review. No money moves until it&apos;s resolved.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="mt-0.5 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">3</span>
            <div>
              <p className="font-medium text-secondary">Admin Reviews Against Original Posting</p>
              <p className="text-sm text-muted">Our team compares the before/after photos and completed work against the original job posting (your video, photos, and description). The original posting is the contract — not anything added afterwards.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="mt-0.5 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">4</span>
            <div>
              <p className="font-medium text-secondary">Resolution: Partial Payment + Re-Service</p>
              <p className="text-sm text-muted">If the dispute is legitimate:</p>
              <ul className="text-sm text-muted mt-2 space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5 font-bold">→</span>
                  <span>The <strong>original contractor gets the first chance to fix it</strong> at no extra cost. They have 3 business days to respond and schedule the fix. The original job posting is the guide.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5 font-bold">→</span>
                  <span>If the original contractor can&apos;t or won&apos;t fix it, they receive a <strong>partial payment</strong> for work satisfactorily completed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5 font-bold">→</span>
                  <span>The <strong>remaining funds</strong> are used to hire a different verified contractor through Trovaar to complete the job to your standards (as defined in the original posting).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5 font-bold">→</span>
                  <span><strong>Trovaar does not absorb any cost.</strong> The re-service comes from the original escrowed amount. The platform is the middleman, not the insurer.</span>
                </li>
              </ul>
              <p className="text-sm text-muted mt-3">If the dispute is not legitimate (work matches the original posting):</p>
              <ul className="text-sm text-muted mt-2 space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 font-bold">→</span>
                  <span>The contractor receives <strong>full payment</strong>. The dispute is dismissed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 font-bold">→</span>
                  <span>The client may receive a <strong>bad-faith dispute warning</strong> if the claim was unreasonable.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Scope Protection */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">Scope Protection — Be Specific Upfront</h2>
        <p className="text-muted leading-relaxed">
          Your job posting is your contract. When you post a job — whether through video, photos, or text —
          that&apos;s the scope of work the contractor agrees to. Here&apos;s how we handle scope disputes:
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <span className="text-green-600 mt-0.5">✓</span>
            <div>
              <p className="text-sm font-medium text-green-800">Valid dispute</p>
              <p className="text-xs text-green-700 mt-0.5">&ldquo;I posted a video showing a leaking faucet and asked for it to be fixed. The contractor replaced the washer but the faucet still leaks.&rdquo;</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <span className="text-red-600 mt-0.5">✕</span>
            <div>
              <p className="text-sm font-medium text-red-800">Invalid dispute — add-on after the fact</p>
              <p className="text-xs text-red-700 mt-0.5">&ldquo;I posted about a leaking faucet but then also wanted the contractor to replace the garbage disposal. They only fixed the faucet.&rdquo;</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <span className="text-red-600 mt-0.5">✕</span>
            <div>
              <p className="text-sm font-medium text-red-800">Invalid dispute — subjective preference</p>
              <p className="text-xs text-red-700 mt-0.5">&ldquo;The paint color matches what I requested but I changed my mind and don&apos;t like it anymore.&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      {/* Job Change Orders */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">Job Change Orders — The Right Way to Add Work</h2>
        <p className="text-muted leading-relaxed">
          Need something extra done beyond what you originally posted? That&apos;s fine — but it has to go
          through a <strong className="text-secondary">Job Change Order</strong>. Here&apos;s how it works:
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">1</span>
            <p className="text-sm text-muted">The contractor submits a Job Change Order through the app describing the additional work, whether it&apos;s free or has a cost, and any materials needed.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">2</span>
            <p className="text-sm text-muted">You approve or reject the change order. The contractor does not proceed until you approve.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">3</span>
            <p className="text-sm text-muted">Approved change orders become part of the agreed scope. If there&apos;s a dispute later, the change order is included in the evaluation.</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <p className="text-amber-800 text-sm font-medium">
            ⚠️ Work requested verbally or through messages — without a formal Job Change Order — is not
            covered by the dispute process. Always use the change order system so everyone is protected.
          </p>
        </div>
      </section>

      {/* Contractor Accountability */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">Contractor Accountability</h2>
        <p className="text-muted leading-relaxed mb-4">
          Our system keeps contractors honest without punishing good ones:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <div className="text-3xl mb-1">⚠️</div>
            <p className="font-semibold text-amber-800 text-sm">Strike 1</p>
            <p className="text-xs text-amber-700 mt-1">Warning issued. Dispute noted on record.</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-3xl mb-1">🚨</div>
            <p className="font-semibold text-orange-800 text-sm">Strike 2</p>
            <p className="text-xs text-orange-700 mt-1">Profile deprioritized in search. New bids restricted.</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-3xl mb-1">🚫</div>
            <p className="font-semibold text-red-800 text-sm">Strike 3</p>
            <p className="text-xs text-red-700 mt-1">Account deactivated. Removed from platform.</p>
          </div>
        </div>
      </section>

      {/* Tips Signal */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">Tips Tell the Real Story</h2>
        <p className="text-muted leading-relaxed">
          After every completed job, clients have the option to tip their contractor. Tips are the truest
          signal of satisfaction — no one tips for bad work. Contractors with high tip rates are
          highlighted with a &ldquo;Top Rated&rdquo; badge, helping them win more jobs.
        </p>
      </section>

      {/* For Contractors */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">Protection for Contractors</h2>
        <p className="text-muted leading-relaxed">
          This system protects you too. Unlike money-back guarantees that let bad-faith clients get free work:
        </p>
        <ul className="space-y-2 text-muted mt-3">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Disputes are reviewed by a real person — not auto-refunded.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Before/after photos protect you from false claims.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Your message history is reviewed as evidence.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Clients who file bad-faith disputes repeatedly get flagged and warned.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Two-way reviews mean clients have reputations too — you can see their track record before bidding.</span>
          </li>
        </ul>
      </section>

      {/* What We Don't Do */}
      <section>
        <h2 className="text-xl font-semibold text-secondary mb-3">What We Don&apos;t Do</h2>
        <ul className="space-y-2 text-muted">
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span>We don&apos;t offer automatic refunds. Refunds invite abuse and hurt honest contractors.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span>We don&apos;t take sides without reviewing evidence from both parties.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span>We don&apos;t guarantee work quality — independent contractors own their work. We guarantee a fair process when things go wrong.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span>We don&apos;t cover issues reported more than 7 days after job completion.</span>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Questions?</h2>
        <p className="text-sm text-blue-700">
          If you have questions about our Resolution Guarantee or need help with an ongoing dispute,
          contact our support team at <a href="mailto:support@trovaar.com" className="underline font-medium">support@trovaar.com</a>.
          We&apos;re here to make sure every situation gets a fair outcome.
        </p>
      </section>
    </div>
  );
}
