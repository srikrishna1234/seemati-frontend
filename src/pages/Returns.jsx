// src/pages/Returns.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

const Returns = () => {
  return (
    <main className="page page-returns" style={{ padding: "3rem 1rem" }}>
      <Helmet>
        <title>Returns & Exchanges — Seemati</title>
        <meta
          name="description"
          content="Returns, exchanges and refund policy for Seemati by Sri Krishna Apparells. Simple steps to return or exchange your order within 15 days." 
        />
      </Helmet>

      <section className="container" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Returns & Exchanges</h1>

        <p style={{ color: "#555", marginBottom: "1.25rem", textAlign: "center" }}>
          We want you to love your Seemati purchase. If something isn’t right, here’s how returns, exchanges and refunds work.
        </p>

        <h2>Simple summary</h2>
        <ul>
          <li>Return & exchange window: <strong>15 days</strong> from delivery date (unless a product page states otherwise).</li>
          <li>Items must be returned in original condition — unworn, unwashed, with tags attached and in original packaging.</li>
          <li>Final sale / heavily discounted items may be excluded — check the product page for exceptions.</li>
          <li>Refunds are processed to the original payment method within 5–7 business days after we receive the returned item.</li>
        </ul>

        <h2 style={{ marginTop: "1.25rem" }}>How to request a return or exchange</h2>
        <ol>
          <li>
            Open your account orders page (or use the order email link) and click <strong>Request return</strong> next to the order.
          </li>
          <li>
            Choose whether you want an <strong>exchange</strong> (different size / color) or a <strong>refund</strong>.
          </li>
          <li>
            Pack the item securely — include the packing slip and any tags or freebies that came with the order.
          </li>
          <li>Drop the package at the assigned courier or wait for the scheduled pickup (if courier pickup was booked).</li>
          <li>
            Once we receive and inspect the item we will process the exchange or refund and notify you by email/SMS.
          </li>
        </ol>

        <h2 style={{ marginTop: "1.25rem" }}>Return shipping costs</h2>
        <p>
          For most returns due to change of mind the return shipping cost is the customer’s responsibility. If the return
          is due to a defect, incorrect item, or damage in transit we will provide a prepaid return label or refund the return
          shipping cost after inspection.
        </p>

        <h2 style={{ marginTop: "1.25rem" }}>Condition requirements</h2>
        <p>
          To be eligible for a return or exchange items must be:
        </p>
        <ul>
          <li>Unworn and unwashed.</li>
          <li>All original tags and hygiene stickers intact.</li>
          <li>Returned in the original packaging where possible.</li>
        </ul>

        <h2 style={{ marginTop: "1.25rem" }}>Refunds — timeline & method</h2>
        <p>
          After we receive and inspect the returned item, refunds will be processed to the original payment method within
          5–7 business days. Your bank or payment provider may take extra time to reflect the refund in your account.
        </p>

        <h2 style={{ marginTop: "1.25rem" }}>Exchanges</h2>
        <p>
          Exchanges are subject to stock availability. If the requested size or color is not available we will offer a refund.
          We will process exchanges promptly once the returned item is received and inspected.
        </p>

        <h2 style={{ marginTop: "1.25rem" }}>Damaged or incorrect items</h2>
        <p>
          If you receive an item that is damaged, defective or not what you ordered, please contact us immediately at
          <strong> rs.bravishankar@gmail.com</strong> (or through the Contact page) within 48 hours of delivery. Please include
          your order number and clear photos showing the issue. We will arrange a replacement or a full refund including
          return shipping in such cases.
        </p>

        <h2 style={{ marginTop: "1.25rem" }}>Cancellations</h2>
        <p>
          You may cancel your order before it has been dispatched. If the order has already been dispatched you must follow
          the returns process above. To cancel, use your order page or contact support with the order number.
        </p>

        <h2 style={{ marginTop: "1.25rem" }}>Wholesale & distributor returns</h2>
        <p>
          For B2B orders (wholesale / distributor) returns and replacement terms are governed by the purchase contract.
          Please contact <strong>sales@seemati.in</strong> or our B2B team for assistance with bulk returns.
        </p>

        <h2 style={{ marginTop: "1.25rem" }}>Return address</h2>
        <address>
          Seemati (Returns)<br />
          Sri Krishna Apparells<br />
          [Warehouse / Return center address here — update before publishing]<br />
          Email: <a href="mailto:srikrishnaapparells@gmail.com">srikrishnaapparells@gmail.com</a>
        </address>

        <hr style={{ margin: "2rem 0" }} />
        <p style={{ fontSize: "0.95rem", color: "#666" }}>
          This returns policy is intended as a clear summary for customers. For legal terms and exact liabilities please consult
          our <a href="/terms">Terms & Conditions</a>. We reserve the right to refuse returns that do not meet the condition
          requirements listed above.
        </p>
      </section>
    </main>
  );
};

export default Returns;
