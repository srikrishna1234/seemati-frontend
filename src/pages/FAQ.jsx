// src/pages/FAQ.jsx
import React from "react";
import "./StaticPage.css";

export default function FAQ() {
  return (
    <div className="static-page-container">
      <h1>Frequently Asked Questions (FAQ)</h1>

      <h2>Orders &amp; Payments</h2>
      <h3>How can I pay for my order?</h3>
      <p>
        We accept major payment methods through our payment gateway (Razorpay): UPI, debit/credit cards,
        netbanking, and popular wallets where available. For bulk/distributor orders we can provide offline
        payment options — contact us at <strong>srikrishnaapparells@gmail.com</strong>.
      </p>

      <h3>Can I cancel or modify an order?</h3>
      <p>
        Orders can be cancelled or modified before dispatch. Once the order is shipped, cancellation is treated
        as a return once the shipment is received back at our warehouse. Contact support ASAP for requests.
      </p>

      <h2>Shipping &amp; Delivery</h2>
      <h3>How long does delivery take?</h3>
      <p>
        Typical delivery times: 4–7 business days to metro cities, 7–12 business days to remote locations.
        Exact timelines are shown at checkout and depend on your pin code.
      </p>

      <h3>Do you ship internationally?</h3>
      <p>
        Currently we ship within India only. For international or bulk shipping enquiries, contact us at
        <strong> srikrishnaapparells@gmail.com</strong>.
      </p>

      <h2>Returns &amp; Exchanges</h2>
      <h3>What is your return policy?</h3>
      <p>
        We accept returns/exchanges within the timeframe specified on the Returns page. Products must be unused,
        with original tags and packaging. Refunds are processed after inspection. See the Returns page for full details.
      </p>

      <h2>Product &amp; Sizing</h2>
      <h3>How do I choose the right size?</h3>
      <p>
        Check our <a href="/size-guide">Size Guide</a> for detailed measurements and tips. If you are unsure,
        contact customer support with your measurements and we’ll advise the best fit.
      </p>

      <h3>Do colors in images match the real product?</h3>
      <p>
        We do our best to show accurate product images, but colors may vary slightly due to screen differences
        and lighting. If color exactness is critical, contact us before ordering.
      </p>

      <h2>Bulk, Wholesale &amp; Distribution</h2>
      <h3>How can I become a super-stockist / distributor?</h3>
      <p>
        We welcome partnership enquiries. Visit the <a href="/become-distributor">Become a distributor</a> page
        or email <strong>srikrishnaapparells@gmail.com</strong> with your location and business details. We provide
        distributor terms and a Super Stockist Agreement on request.
      </p>

      <h2>Account &amp; Privacy</h2>
      <h3>How do you protect my personal data?</h3>
      <p>
        We take security seriously and only share data with trusted service partners (logistics, payment processors).
        See our <a href="/privacy-policy">Privacy Policy</a> for full details on data usage and rights.
      </p>

      <h2>Product Care</h2>
      <h3>How should I wash my Seemati pants?</h3>
      <p>
        For most fabrics: gentle machine wash cold or hand wash, mild detergent, do not bleach, line dry in shade.
        For specific fabric care refer to the product page where fabric-specific instructions appear.
      </p>

      <h2>Still need help?</h2>
      <p>
        If your question isn't answered above, email <strong>srikrishnaapparells@gmail.com</strong> or use the contact
        form on the <a href="/contact">Contact</a> page. We're happy to help.
      </p>
    </div>
  );
}
