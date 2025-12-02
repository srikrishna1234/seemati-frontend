// src/pages/Terms.jsx
import React from "react";
import "./StaticPage.css";

export default function Terms() {
  const year = new Date().getFullYear();

  return (
    <div className="static-page-container">
      <h1>Terms &amp; Conditions</h1>
      <p><strong>Last updated:</strong> {year}</p>

      <p>
        These Terms &amp; Conditions ("Terms") govern your use of the Seemati website and services
        (operated by <strong>Sri Krishna Apparells</strong>). By accessing or placing an order on this site,
        you agree to be bound by these Terms.
      </p>

      <h2>1. Orders &amp; Acceptance</h2>
      <p>
        When you place an order, you will receive an email acknowledging receipt of your order.
        This acknowledgement does not constitute acceptance of your order. Seemati reserves the right
        to accept or decline your order for any reason (including pricing or inventory issues). An order
        is accepted when we dispatch the product to you or confirm acceptance by email.
      </p>

      <h2>2. Pricing &amp; Payment</h2>
      <ul>
        <li>All prices are listed in Indian Rupees (₹) and are inclusive/exclusive of taxes as indicated on the checkout page.</li>
        <li>We use third-party payment gateways (for example Razorpay). You must comply with the payment gateway terms and we are not responsible for payment gateway failures.</li>
        <li>Seemati does not store full card details — payment processing is handled by the gateway.</li>
      </ul>

      <h2>3. Shipping &amp; Delivery</h2>
      <p>
        Delivery estimates provided on the site are approximate. Actual delivery times may vary due to
        external factors (logistics delays, force majeure, address errors). Shipping charges and delivery
        timelines are displayed at checkout.
      </p>

      <h2>4. Returns, Exchanges &amp; Refunds</h2>
      <p>
        Our returns and exchange policy is described in detail on the Returns page. In summary:
      </p>
      <ul>
        <li>Returns/exchanges must be initiated within the timeframe specified on the Returns page.</li>
        <li>Products must be unused, with original tags and packaging.</li>
        <li>Refunds are processed after inspection and may take several business days to reflect in your account.</li>
      </ul>

      <h2>5. Cancellations</h2>
      <p>
        Orders can be cancelled before they are dispatched. If you request cancellation after dispatch,
        it will be treated as a return once the shipment is received back by our warehouses (shipping charges may apply).
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        All content on the site — text, images, logos, product designs, and code — is the property of
        Seemati / Sri Krishna Apparells or its licensors. You may not reproduce, distribute, or use our
        content without prior written permission.
      </p>

      <h2>7. Product Information &amp; Availability</h2>
      <p>
        We attempt to provide accurate product descriptions and images. However colors and textures may vary
        between screens and actual products. Availability on the site is subject to change; an item may become
        unavailable after ordering due to inventory discrepancies.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Seemati and its affiliates are not liable for indirect,
        incidental, special, or consequential damages arising from your use of the site. Our aggregate liability
        for any claim arising out of these Terms shall not exceed the amount you paid for the relevant order.
      </p>

      <h2>9. Privacy</h2>
      <p>
        Our Privacy Policy explains how we collect and use your personal information. By using the site you
        consent to the collection and use described in the Privacy Policy.
      </p>

      <h2>10. Governing Law &amp; Dispute Resolution</h2>
      <p>
        These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the
        website will be subject to the exclusive jurisdiction of courts located in your local city/state or as
        specified by Sri Krishna Apparells. (If you prefer a specific jurisdiction for your business, update this
        section with that city/state.)
      </p>

      <h2>11. Bulk Orders &amp; Partnership / Distribution</h2>
      <p>
        For wholesale, bulk orders, or distributor inquiries, please contact us at
        <strong> srikrishnaapparells@gmail.com</strong> or use the Become a distributor page. Distributor terms are handled
        separately via a Super Stockist Agreement.
      </p>

      <h2>12. Changes to Terms</h2>
      <p>
        We may update these Terms occasionally. Changes will be posted on this page with a revised "Last updated" date.
        Continued use after changes confirms your acceptance of the updated Terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        If you have questions about these Terms, contact us at:<br />
        <strong>Email:</strong> srikrishnaapparells@gmail.com<br />
        <strong>Business name:</strong> Sri Krishna Apparells (Seemati)
      </p>

      <p>Thank you for shopping with Seemati. We appreciate your trust.</p>
    </div>
  );
}
