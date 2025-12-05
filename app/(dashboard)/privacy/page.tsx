export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Stylr ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our
            mobile application and web service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold mb-2 mt-4">2.1 Personal Information</h3>
          <p>We collect the following personal information:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Account Information:</strong> Email address, name (optional)</li>
            <li><strong>Clothing Items:</strong> Photos of your clothing items that you upload</li>
            <li><strong>Style Preferences:</strong> Your style profile, favorite colors, preferred styles</li>
            <li><strong>Usage Data:</strong> Items you track as worn, outfit recommendations you save</li>
          </ul>

          <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Automatically Collected Information</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Device information (device type, operating system)</li>
            <li>Usage patterns and app interactions</li>
            <li>Error logs and performance data</li>
          </ul>

          <h3 className="text-xl font-semibold mb-2 mt-4">2.3 Optional Information</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Gmail Integration:</strong> If you choose to connect your Gmail account, we access
              your emails to scan for purchase receipts. This is optional and requires your explicit consent.</li>
            <li><strong>Location Data:</strong> If you use weather-based outfit recommendations, we may
              request your location to provide weather-appropriate suggestions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>To provide and maintain our service</li>
            <li>To analyze your clothing items using AI-powered image recognition</li>
            <li>To generate personalized outfit recommendations</li>
            <li>To track your wardrobe usage and provide insights</li>
            <li>To improve our AI models and service quality</li>
            <li>To send you service-related notifications (if you opt in)</li>
            <li>To detect and prevent fraud or abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Data Storage and Security</h2>
          <p>
            Your data is stored securely using industry-standard practices:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Database:</strong> Your account and clothing data are stored in a secure PostgreSQL database</li>
            <li><strong>Images:</strong> Uploaded clothing photos are stored using Vercel Blob Storage with secure access controls</li>
            <li><strong>Encryption:</strong> Data is encrypted in transit using HTTPS/TLS</li>
            <li><strong>Authentication:</strong> Your account is protected with secure authentication</li>
          </ul>
          <p className="mt-3">
            While we implement security measures, no method of transmission over the internet is 100% secure.
            We cannot guarantee absolute security of your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. AI and Third-Party Services</h2>
          <p>We use the following third-party AI services to power our features:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Google Gemini:</strong> For image analysis and AI-powered recommendations</li>
            <li><strong>Open-Meteo:</strong> For weather data (no personal information shared)</li>
            <li><strong>Vercel:</strong> For hosting and image storage</li>
          </ul>
          <p className="mt-3">
            When you upload images, they are sent to AI services for analysis. These services process
            your images according to their privacy policies. We do not share your personal information
            with these services beyond what is necessary to provide our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Your Rights</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct your personal information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and all associated data</li>
            <li><strong>Data Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Opt-Out:</strong> Disconnect third-party integrations (e.g., Gmail) at any time</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, please contact us at the email address provided below.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to
            provide our services. If you delete your account, we will delete your personal information
            within 30 days, except where we are required to retain it by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Children's Privacy</h2>
          <p>
            Our service is not intended for children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you believe we have collected information
            from a child under 13, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by
            posting the new Privacy Policy on this page and updating the "Last updated" date. You are
            advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul className="list-none space-y-1 ml-4 mt-2">
            <li><strong>Email:</strong> privacy@stylr.app</li>
            <li><strong>Website:</strong> https://stylr.vercel.app</li>
          </ul>
        </section>

        <section className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">GDPR Compliance</h2>
          <p className="text-sm">
            If you are located in the European Economic Area (EEA), you have additional rights under
            the General Data Protection Regulation (GDPR). This includes the right to object to processing,
            the right to restrict processing, and the right to lodge a complaint with a supervisory authority.
          </p>
        </section>
      </div>
    </div>
  );
}






