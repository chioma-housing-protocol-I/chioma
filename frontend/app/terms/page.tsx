'use client';

import { useState } from 'react';
import Footer from '@/components/Footer';

export default function TermsPage() {
  const [accepted, setAccepted] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-brand-gradient selection:bg-white/30 selection:text-white pb-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 border-b-4 border-white pt-12 sm:pt-20">
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4">
              Terms and Conditions
            </h1>
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8 lg:p-12">
            <p className="text-neutral-600 text-sm sm:text-base mb-3">
              Last updated: February 23, 2026
            </p>
            <div className="prose prose-sm sm:prose max-w-none text-neutral-700">
              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  1. Acceptance of Terms
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  By accessing and using Chioma Properties (hereinafter referred
                  to as &quot;the Platform&quot;), you accept and agree to be
                  bound by the terms and provision of this agreement.
                  Additionally, when using the Platform&apos;s services, you
                  shall be subject to any posted guidelines or rules applicable
                  to such services. All such guidelines or rules are hereby
                  incorporated by reference into the Terms of Service.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  This agreement constitutes the entire agreement between you
                  and the Platform and governs your use of the Platform,
                  superseding any prior agreements between you and the Platform.
                  You also may be subject to additional terms and conditions
                  that may apply when you use affiliate services, third-party
                  content, or third-party software.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  2. Description of Service
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  Chioma Properties provides users with access to a rich
                  collection of resources, including various communications
                  tools, forums, shopping services, personalized content, and
                  branded programming through its network of properties. You
                  also understand and agree that the Platform may include
                  advertisements and that these advertisements are necessary for
                  the Platform to provide the Service.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  Unless explicitly stated otherwise, any new features that
                  augment or enhance the current Service, including the release
                  of new Chioma Properties properties, shall be subject to the
                  Terms of Service. You understand and agree that the Service is
                  provided &quot;AS IS&quot; and that the Platform assumes no
                  responsibility for the timeliness, deletion, misdelivery, or
                  failure to store any user communications or personalization
                  settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  3. Registration Obligations
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  In consideration of your use of the Platform, you agree to:
                  (a) provide true, accurate, current, and complete information
                  about yourself as prompted by the Platform&apos;s registration
                  form (such information being the &quot;Registration
                  Data&quot;) and (b) maintain and promptly update the
                  Registration Data to keep it true, accurate, current, and
                  complete.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  If you provide any information that is untrue, inaccurate, not
                  current, or incomplete, or the Platform has reasonable grounds
                  to suspect that such information is untrue, inaccurate, not
                  current, or incomplete, the Platform has the right to suspend
                  or terminate your account and refuse any and all current or
                  future use of the Service (or any portion thereof). The
                  Platform is concerned about the safety and privacy of all its
                  users, particularly children.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  4. Privacy Policy
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  Registration Data and certain other information about you is
                  subject to our Privacy Policy. You understand that through
                  your use of the Platform, you consent to the collection and
                  use of this information, including the transfer of this
                  information to other countries for storage, processing, and
                  use. The Platform may disclose information about its users if
                  required to do so by law or in the good faith belief that such
                  disclosure is reasonably necessary to respond to subpoenas,
                  court orders, or other legal process.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  The Platform also may disclose user information when the
                  Platform has reason to believe that such disclosure is
                  necessary to identify, contact, or bring legal action against
                  someone who may be causing injury to or interference with
                  (either intentionally or unintentionally) the Platform&apos;s
                  rights or property, other Platform users, or anyone else that
                  could be harmed by such activities.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  5. User Conduct
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  You agree not to use the Service to: upload, post, email,
                  transmit, or otherwise make available any content that is
                  unlawful, harmful, threatening, abusive, harassing, tortious,
                  defamatory, vulgar, obscene, libelous, invasive of
                  another&apos;s privacy, hateful, or racially, ethnically, or
                  otherwise objectionable; harm minors in any way; impersonate
                  any person or entity, including, but not limited to, a Chioma
                  Properties official, forum leader, guide, or host, or falsely
                  state or otherwise misrepresent your affiliation with a person
                  or entity.
                </p>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  You agree not to upload, post, email, transmit, or otherwise
                  make available any content that you do not have a right to
                  make available under any law or under contractual or fiduciary
                  relationships; upload, post, email, transmit, or otherwise
                  make available any content that infringes any patent,
                  trademark, trade secret, copyright, or other proprietary
                  rights of any party.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  You agree not to upload, post, email, transmit, or otherwise
                  make available any unsolicited or unauthorized advertising,
                  promotional materials, &quot;junk mail,&quot;
                  &quot;spam,&quot; &quot;chain letters,&quot; &quot;pyramid
                  schemes,&quot; or any other form of solicitation.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  6. Special Admonitions for International Use
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  Recognizing the global nature of the Internet, you agree to
                  comply with all local rules and laws regarding online conduct
                  and acceptable Content. Specifically, you agree to comply with
                  all applicable laws regarding the transmission of technical
                  data exported from Nigeria or the country in which you reside.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  You agree to comply with all applicable export control laws
                  and regulations. You further agree not to upload, post, email,
                  transmit, or otherwise make available any content or
                  technology that may be subject to such export controls,
                  including but not limited to certain encryption items.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  7. Content Made Available for Reposting
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  For content that is covered by intellectual property rights,
                  like photos and videos (&quot;IP Content&quot;), you
                  specifically give us the following permission: you grant us a
                  non-exclusive, transferable, sub-licensable, royalty-free,
                  worldwide license to use any IP Content that you post on or in
                  connection with the Platform (&quot;IP License&quot;). This IP
                  License ends when you delete your IP Content or your account
                  unless your content has been shared with others, and they have
                  not deleted it.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  When you delete IP Content, it is deleted in a manner similar
                  to emptying the recycle bin on a computer. However, you
                  understand that removed content may persist in backup copies
                  for a reasonable period of time (but will not be available to
                  others).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  8. Modifications to Service
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  The Platform reserves the right at any time and from time to
                  time to modify or discontinue, temporarily or permanently, the
                  Service (or any part thereof) with or without notice. You
                  agree that the Platform shall not be liable to you or to any
                  third party for any modification, suspension, or
                  discontinuance of the Service.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  The Platform shall not be liable to you or to any third party
                  for any modification, suspension, or discontinuance of the
                  Service. You agree that the Platform may establish general
                  practices and limits concerning use of the Service, including
                  without limitation the maximum number of days that email
                  messages, message board postings, or other uploaded Content
                  will be retained by the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  9. Termination
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  You agree that the Platform may, under certain circumstances
                  and without prior notice, immediately terminate your account,
                  any associated email address, and access to the Service. Cause
                  for such termination shall include, but not be limited to: (a)
                  breaches or violations of the Terms of Service or other
                  incorporated agreements or guidelines; (b) requests by law
                  enforcement or other government agencies; (c) a request by you
                  (self-initiated account deletions); (d) discontinuance or
                  material modification to the Service (or any part thereof);
                  (e) unexpected technical or security issues or problems.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  You agree that all terminations for cause shall be made in the
                  Platform&apos;s sole discretion and that the Platform shall
                  not be liable to you or any third party for any termination of
                  your account, any associated email address, or access to the
                  Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  10. Limitation of Liability
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  YOU EXPRESSLY UNDERSTAND AND AGREE THAT THE PLATFORM AND ITS
                  SUBSIDIARIES, AFFILIATES, OFFICERS, EMPLOYEES, AGENTS,
                  PARTNERS, AND LICENSORS SHALL NOT BE LIABLE TO YOU FOR ANY
                  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                  EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO, DAMAGES FOR
                  LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE
                  LOSSES (EVEN IF THE PLATFORM HAS BEEN ADVISED OF THE
                  POSSIBILITY OF SUCH DAMAGES).
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  This limitation of liability shall apply regardless of the
                  theory of liability, whether based on warranty, contract, tort
                  (including negligence and gross negligence), or any other
                  legal theory. The foregoing limitation of liability shall
                  apply to the fullest extent permitted by law in the applicable
                  jurisdiction.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  11. Governing Law and Dispute Resolution
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  These Terms of Service shall be governed by and construed in
                  accordance with the laws of the Federal Republic of Nigeria,
                  without regard to its conflict of law provisions. Any dispute
                  arising out of or relating to these terms shall be subject to
                  the exclusive jurisdiction of the courts located in Lagos,
                  Nigeria.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  You and the Platform agree to submit to the personal
                  jurisdiction of the courts located within Lagos, Nigeria, and
                  waive any objection to the laying of venue in such courts and
                  any claim that such courts are an inconvenient forum.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  12. Contact Information
                </h2>
                <p className="text-sm sm:text-base leading-relaxed">
                  If you have any questions about these Terms and Conditions,
                  please contact us at: support@chiomaproperties.com or call our
                  customer service line at +234 800 CHIOMA (244662).
                </p>
              </section>
            </div>

            {/* Acceptance Section */}
            <div className="mt-12 pt-8 border-t border-neutral-200">
              <div className="bg-neutral-50 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="accept-terms"
                    name="terms-acceptance"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 cursor-pointer accent-blue-600"
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-sm sm:text-base text-neutral-700 cursor-pointer select-none"
                  >
                    I have read and understood the Terms and Conditions and I
                    agree to be bound by all of its provisions. I understand
                    that by checking this box, I am entering into a legally
                    binding agreement with Chioma Properties.
                  </label>
                </div>

                <div className="mt-6">
                  <button
                    disabled={!accepted}
                    className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold transition ${
                      accepted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
