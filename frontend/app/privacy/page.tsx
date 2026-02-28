'use client';

import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <div className="min-h-screen bg-brand-gradient selection:bg-white/30 selection:text-white pb-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 border-b-4 border-white pt-12 sm:pt-20">
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8 lg:p-12">
            <p className="text-neutral-600 text-sm sm:text-base mb-4">
              Last updated: February 23, 2026
            </p>
            <div className="prose prose-sm sm:prose max-w-none text-neutral-700">
              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  1. Introduction
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  At Chioma Properties, we take your privacy seriously. This
                  Privacy Policy describes how we collect, use, disclose, and
                  safeguard your information when you visit our website, use our
                  mobile application, or engage with our property listing and
                  leasing services.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  Please read this privacy policy carefully. If you do not agree
                  with the terms of this privacy policy, please do not access
                  the Platform. We reserve the right to make changes to this
                  Privacy Policy at any time and for any reason. We will alert
                  you about any changes by updating the &quot;Last Updated&quot;
                  date of this Privacy Policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  2. Collection of Personal Information
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We may collect personal information that you voluntarily
                  provide to us when you register on the Platform, express an
                  interest in obtaining information about us or our products and
                  services, when you participate in activities on the Platform,
                  or otherwise when you contact us. This personal information
                  may include:
                </p>
                <ul className="list-disc pl-6 mb-4 text-sm sm:text-base leading-relaxed space-y-2">
                  <li>Name, phone number, and email address</li>
                  <li>Physical address and property preferences</li>
                  <li>Payment information and billing details</li>
                  <li>Identity verification documents</li>
                  <li>Communication history and preferences</li>
                  <li>Location data and device information</li>
                </ul>
                <p className="text-sm sm:text-base leading-relaxed">
                  Additionally, we may collect information automatically when
                  you visit, navigate, or use the Platform through cookies, web
                  beacons, and other tracking technologies. This may include
                  browser type, operating system, access times, and pages
                  viewed.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  3. Use of Your Information
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  Having accurate information about you permits us to provide
                  you with a smooth, efficient, and customized experience.
                  Specifically, we may use information collected about you via
                  the Platform to:
                </p>
                <ul className="list-disc pl-6 mb-4 text-sm sm:text-base leading-relaxed space-y-2">
                  <li>Create and manage your account</li>
                  <li>
                    Process transactions and send related information including
                    purchase confirmations and invoices
                  </li>
                  <li>
                    Provide property listings and connect you with landlords and
                    agents
                  </li>
                  <li>Facilitate property viewings and lease negotiations</li>
                  <li>Verify your identity and conduct background checks</li>
                  <li>
                    Send you technical notices, updates, security alerts, and
                    support and administrative messages
                  </li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>
                    Communicate with you about products, services, offers,
                    promotions, rewards, and events offered by Chioma Properties
                  </li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                  <li>
                    Detect, investigate, and prevent fraudulent transactions and
                    other illegal activities
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  4. Disclosure of Your Information
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We may share information we have collected about you in
                  certain situations. Your information may be disclosed as
                  follows:
                </p>

                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  4.1 By Law or to Protect Rights
                </h3>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  If we believe the release of information about you is
                  necessary to respond to legal process, to investigate or
                  remedy potential violations of our policies, or to protect the
                  rights, property, and safety of others, we may share your
                  information as permitted or required by any applicable law,
                  rule, or regulation.
                </p>

                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  4.2 Third-Party Service Providers
                </h3>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We may share your information with third parties that perform
                  services for us or on our behalf, including payment
                  processing, data analysis, email delivery, hosting services,
                  customer service, and marketing assistance. These third
                  parties are contractually obligated to maintain the
                  confidentiality of your information.
                </p>

                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  4.3 Property Landlords and Agents
                </h3>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  When you express interest in a property, we may share your
                  contact information and preferences with the respective
                  property landlord or agent to facilitate property viewings,
                  lease negotiations, and related communications.
                </p>

                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  4.4 Business Transfers
                </h3>
                <p className="text-sm sm:text-base leading-relaxed">
                  We may share or transfer your information in connection with,
                  or during negotiations of, any merger, sale of company assets,
                  financing, or acquisition of all or a portion of our business
                  to another company. You will be notified via email and/or a
                  prominent notice on the Platform of any change in ownership or
                  uses of your personal information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  5. Tracking Technologies and Cookies
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We may use Cookies, Web Beacons, and other tracking
                  technologies on the Platform to help customize the Platform
                  and improve your experience. When you access the Platform,
                  your personal information is not collected through the use of
                  tracking technology. Most browsers are set to accept cookies
                  by default. You can remove or reject cookies, but be aware
                  that such action could affect the availability and
                  functionality of the Platform.
                </p>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We may use third-party analytics tools to help us understand
                  how the Platform is being used. These tools collect
                  information sent by your browser as part of a web page
                  request, including cookies and your IP address. This
                  information is transmitted to the analytics tool, which uses
                  it to evaluate visitors&apos; use of the Platform.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  You may opt-out of the collection of information for analytics
                  purposes by visiting tools such as Google Analytics Opt-out
                  Browser Add-on.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  6. Data Security
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We use administrative, technical, and physical security
                  measures to help protect your personal information. While we
                  have taken reasonable steps to secure the personal information
                  you provide to us, please be aware that despite our efforts,
                  no security measures are perfect or impenetrable, and no
                  method of data transmission can be guaranteed against any
                  interception or other type of misuse.
                </p>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We implement a variety of security measures when a user places
                  an order, enters, submits, or accesses their information to
                  maintain the safety of your personal information. All
                  sensitive information you supply is encrypted via our Secure
                  Socket Layer (SSL) technology. Additionally, we follow
                  generally accepted industry standards to protect the personal
                  information submitted to us, both during transmission and once
                  we receive it.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  However, you should also take appropriate measures to protect
                  your information, including using strong passwords, not
                  sharing your login credentials, and logging out of your
                  account after each session.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  7. Your Rights and Choices
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  You have the right to access, update, or delete the personal
                  information we collect about you. You may also have the
                  following rights:
                </p>
                <ul className="list-disc pl-6 mb-4 text-sm sm:text-base leading-relaxed space-y-2">
                  <li>
                    <strong>Access:</strong> You may request a copy of the
                    personal information we hold about you.
                  </li>
                  <li>
                    <strong>Rectification:</strong> You may request that we
                    correct or update any inaccurate personal information.
                  </li>
                  <li>
                    <strong>Erasure:</strong> You may request that we delete
                    your personal information, subject to certain exceptions.
                  </li>
                  <li>
                    <strong>Restriction:</strong> You may request that we
                    restrict the processing of your personal information.
                  </li>
                  <li>
                    <strong>Portability:</strong> You may request a copy of your
                    personal information in a structured, commonly used,
                    machine-readable format.
                  </li>
                  <li>
                    <strong>Objection:</strong> You may object to the processing
                    of your personal information for certain purposes.
                  </li>
                </ul>
                <p className="text-sm sm:text-base leading-relaxed">
                  To exercise any of these rights, please contact us at
                  privacy@chiomaproperties.com. We will respond to your request
                  within 30 days.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  8. Data Retention
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We will only keep your personal information for as long as it
                  is necessary for the purposes set out in this Privacy Policy.
                  Specifically, we will retain your personal information as long
                  as your account is active, or as needed to provide you
                  services.
                </p>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  When we no longer need to use your personal information and
                  there is no need for us to retain it to comply with our legal
                  or regulatory obligations, we will either remove it from our
                  systems or anonymize it so that it can no longer be associated
                  with you.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  Please note that even after you delete information from your
                  account, we may retain certain information in anonymized form
                  for analytical purposes and to comply with our legal
                  obligations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  9. Third-Party Websites
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  The Platform may contain links to third-party websites and
                  applications of interest, including advertisements and
                  external services, that are not affiliated with us. Once you
                  have used these links to leave the Platform, any information
                  you provide to these third parties is not covered by this
                  Privacy Policy, and we cannot guarantee the safety and privacy
                  of your information.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  Before visiting and providing any information to any
                  third-party websites, you should inform yourself of the
                  privacy policies and practices of the third party responsible
                  for that website, and should take those steps necessary to, in
                  your discretion, protect the privacy of your information. We
                  are not responsible for the content or privacy and security
                  practices and policies of any third parties, including other
                  sites, services, or applications that may be linked to or from
                  the Platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  10. Children&apos;s Privacy
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We do not knowingly solicit information from or market to
                  children under the age of 18. If you become aware of any data
                  we have collected from children under age 18, please contact
                  us immediately using the contact information provided below,
                  and we will take immediate steps to delete such information.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  The Platform is not intended for use by individuals under the
                  age of 18. By using the Platform, you represent and warrant
                  that you are at least 18 years old and have the legal capacity
                  to enter into this agreement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  11. International Data Transfers
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  Your information, including personal information, may be
                  transferred to — and maintained on — computers located outside
                  of your state, province, country, or other governmental
                  jurisdiction where the data protection laws may differ from
                  those from your jurisdiction.
                </p>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  If you are located outside Nigeria and choose to provide
                  information to us, please note that we transfer the
                  information, including personal information, to Nigeria and
                  process it there. Your consent to this Privacy Policy followed
                  by your submission of such information represents your
                  agreement to that transfer.
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  We will take all steps reasonably necessary to ensure that
                  your data is treated securely and in accordance with this
                  Privacy Policy and no transfer of your personal information
                  will take place to an organization or a country unless there
                  are adequate controls in place including the security of your
                  data and other personal information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  12. Changes to This Policy
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  We may update this privacy policy from time to time. We will
                  notify you of any changes by posting the new privacy policy on
                  this page and updating the &quot;Last Updated&quot; date at
                  the top of this policy.
                </p>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  You are advised to review this privacy policy periodically for
                  any changes. Changes to this privacy policy are effective when
                  they are posted on this page. Your continued use of the
                  Platform following the posting of changes constitutes your
                  acceptance of such changes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4">
                  13. Contact Us
                </h2>
                <p className="mb-4 text-sm sm:text-base leading-relaxed">
                  If you have questions or comments about this policy, you may
                  email us at privacy@chiomaproperties.com, call our customer
                  service line at +234 800 CHIOMA (244662), or mail us at:
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  Chioma Properties
                  <br />
                  Data Protection Officer
                  <br />
                  123 Victoria Island Way
                  <br />
                  Lagos, Nigeria
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
