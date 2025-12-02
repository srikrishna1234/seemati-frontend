// src/pages/PrivacyPolicy.jsx
import React from "react";
import "./StaticPage.css";

export default function PrivacyPolicy() {
  return (
    <div className="static-page-container">
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> {new Date().getFullYear()}</p>

      <p>
        At <strong>Seemati</strong> (operated by <strong>Sri Krishna Apparells</strong>), 
        your privacy is extremely important to us. This Privacy Policy explains how 
        we collect, use, store, and protect your information when you visit our website,
        create an account, place an order, or communicate with us.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Personal information:</strong> Name, phone number, email, billing & shipping address.</li>
        <li><strong>Order information:</strong> Products purchased, payment method, transaction details.</li>
        <li><strong>Technical data:</strong> IP address, device type, browser, pages visited.</li>
        <li><strong>Cookies:</strong> Used to improve site performance and experience.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To process and deliver your orders.</li>
        <li>To communicate order updates, shipping notifications, and support.</li>
        <li>To improve website performance and personalize your experience.</li>
        <li>For legal, tax, accounting, and fraud-prevention requirements.</li>
      </ul>

      <h2>3. How We Store & Protect Your Data</h2>
      <p>
        Your data is stored securely on trusted cloud servers.  
        We follow industry-standard encryption and security practices.
      </p>

      <h2>4. Sharing of Information</h2>
      <p>We NEVER sell your personal data. We only share information with:</p>
      <ul>
        <li>Trusted logistics & shipping partners.</li>
        <li>Payment gateways (Razorpay, etc.).</li>
        <li>IT service providers to help operate our business.</li>
        <li>Government authorities when required by law.</li>
      </ul>

      <h2>5. Cookies & Tracking</h2>
      <p>
        Cookies help improve your browsing experience, remember your cart, 
        and show relevant products. You can disable cookies from your browser settings.
      </p>

      <h2>6. Your Rights</h2>
      <ul>
        <li>Access, update, or delete your account information.</li>
        <li>Request details about data stored.</li>
        <li>Opt-out of marketing communication anytime.</li>
      </ul>

      <h2>7. Contact Us</h2>
      <p>
        For privacy questions, reach us at:<br />
        <strong>Email:</strong> srikrishnaapparells@gmail.com<br />
        <strong>Business:</strong> Sri Krishna Apparells<br />
      </p>

      <p>Thank you for trusting Seemati.</p>
    </div>
  );
}
