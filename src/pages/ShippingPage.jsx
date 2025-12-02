// src/pages/ShippingPage.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

const ShippingPage = () => {
  return (
    <main className="page page-shipping">
      <Helmet>
        <title>Shipping & Delivery — Seemati</title>
        <meta
          name="description"
          content="Shipping zones, lead times, tracking, costs and Cash-on-Delivery (COD) policy for Seemati (Sri Krishna Apparells)." 
        />
      </Helmet>

      <section className="container" style={{ padding: "3rem 1rem" }}>
        <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Shipping & Delivery</h1>
        <p style={{ textAlign: "center", color: "#555", marginBottom: "2rem" }}>
          We try to deliver your Seemati order as quickly and securely as possible. Below you'll find details about
          zones, delivery times, costs, tracking and COD policy.
        </p>

        <article style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2>Order processing</h2>
          <p>
            Orders are usually processed within <strong>1–2 business days</strong> (excluding weekends and public
            holidays). During sale periods or for custom/wholesale orders processing may take longer — we'll notify you
            by email or SMS if there are any expected delays.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Shipping zones & estimated delivery times</h2>
          <p>
            We ship across India. Below are the typical transit times after your order has been dispatched from our
            warehouse.
          </p>

          <div style={{ overflowX: "auto", margin: "1rem 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: "12px 8px" }}>Zone</th>
                  <th style={{ padding: "12px 8px" }}>Example states / cities</th>
                  <th style={{ padding: "12px 8px" }}>Transit time (dispatch → delivery)</th>
                  <th style={{ padding: "12px 8px" }}>Typical shipping cost</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f3f3f3" }}>
                  <td style={{ padding: "12px 8px" }}>Local (Same city / metro)</td>
                  <td style={{ padding: "12px 8px" }}>Hyderabad, Bengaluru, Chennai, Delhi (metro areas)</td>
                  <td style={{ padding: "12px 8px" }}>1–2 business days</td>
                  <td style={{ padding: "12px 8px" }}>Free over ₹499 / ₹40 below</td>
                </tr>

                <tr style={{ borderBottom: "1px solid #f3f3f3" }}>
                  <td style={{ padding: "12px 8px" }}>Domestic (Other major cities)</td>
                  <td style={{ padding: "12px 8px" }}>Mumbai, Pune, Kolkata, Ahmedabad</td>
                  <td style={{ padding: "12px 8px" }}>2–5 business days</td>
                  <td style={{ padding: "12px 8px" }}>Free over ₹799 / ₹60 below</td>
                </tr>

                <tr style={{ borderBottom: "1px solid #f3f3f3" }}>
                  <td style={{ padding: "12px 8px" }}>Rest of India</td>
                  <td style={{ padding: "12px 8px" }}>Tier-2 & tier-3 towns</td>
                  <td style={{ padding: "12px 8px" }}>4–8 business days</td>
                  <td style={{ padding: "12px 8px" }}>Flat ₹99 (or calculated at checkout)</td>
                </tr>

                <tr>
                  <td style={{ padding: "12px 8px" }}>Remote / Islands</td>
                  <td style={{ padding: "12px 8px" }}>Andaman & Nicobar, Lakshadweep, extreme remote PINs</td>
                  <td style={{ padding: "12px 8px" }}>7–15 business days</td>
                  <td style={{ padding: "12px 8px" }}>Calculated at checkout</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: "1.25rem" }}>Shipping cost details</h3>
          <ul>
            <li>Shipping rates shown above are indicative; final shipping at checkout may vary by weight and courier.</li>
            <li>Free shipping thresholds (₹499 / ₹799) are applied at cart checkout and shown before payment.</li>
            <li>For large or wholesale orders we provide customised rates — please contact us at the address below.</li>
          </ul>

          <h2 style={{ marginTop: "1.5rem" }}>Tracking your order</h2>
          <p>
            Once your order is dispatched you will receive an email and/or SMS with the tracking number and courier name.
            You can copy the tracking number into the courier website or use the order status page in your account to see
            live updates.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Delivery attempts & failed delivery</h2>
          <p>
            Couriers will normally attempt delivery once or twice. If delivery fails and the shipment is returned to the
            local hub or courier office we will contact you to arrange re-dispatch or provide a refund (if requested and
            eligible). Re-dispatch charges may apply.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Cash on Delivery (COD)</h2>
          <p>
            We offer COD for most Indian PINs. COD orders are subject to a small COD fee (applied at checkout). COD may be
            restricted or unavailable during large sale events or for certain high-value orders. We reserve the right to
            cancel COD on suspicious orders to prevent fraud.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>International shipping</h2>
          <p>
            Currently Seemati primarily ships within India. For international shipments please contact us at the email
            below — international rates, taxes, duties and longer transit times will apply.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Packaging & handling</h2>
          <p>
            Orders are packed carefully in protective packaging. If your order contains multiple items they may be shipped
            together in one package. Please inspect the parcel and report any obvious transit damage within 48 hours of
            delivery so we can initiate a claim with the courier.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Returns, exchanges & cancellations</h2>
          <p>
            We aim to make returns and exchanges simple. Please view our full <a href="/returns">Returns & Exchanges</a> page for
            complete instructions, timelines and the return address. Short summary:
          </p>
          <ul>
            <li>Cancellation: You can cancel before the order is dispatched. Once dispatched cancellations will be treated as returns.</li>
            <li>Returns: Return requests must be made within 15 days of delivery (unless otherwise stated). Items must be in
              original condition, unwashed with tags attached.</li>
            <li>Exchange: Exchanges are subject to stock availability. If the requested size/color is unavailable we will
              issue a refund.</li>
          </ul>

          <h2 style={{ marginTop: "1.5rem" }}>Wholesale, bulk & distributor orders</h2>
          <p>
            If you're placing a wholesale or distributor order (Super Stockist / Distributor) we offer tailored shipping
            plans and pricing. Please contact our B2B sales team at <strong>sales@seemati.in</strong> or use the Distributor page on the site.
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Contact & support</h2>
          <p>
            For questions about shipping, tracking, or returns contact:
          </p>
          <address>
            <strong>Seemati</strong><br />
            Sri Krishna Apparells<br />
            Email: <a href="mailto:rs.bravishankar@gmail.com">srikrishnaapparells@gmail.com</a><br />
            Phone / WhatsApp: +91 9042163246 (update to your official number)
          </address>

          <hr style={{ margin: "2rem 0" }} />

          <p style={{ fontSize: "0.95rem", color: "#666" }}>
            This page explains our typical shipping and delivery processes. Actual delivery speed and availability may vary
            by location and courier. If you need help, please contact us and include your order number so we can help
            quickly.
          </p>
        </article>
      </section>
    </main>
  );
};

export default ShippingPage;
