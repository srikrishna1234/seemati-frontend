// src/pages/SizeGuide.jsx
import React from "react";
import "./StaticPage.css";

export default function SizeGuide() {
  return (
    <div className="static-page-container">
      <h1>Size Guide — Seemati Pants &amp; Palazzos</h1>

      <p>
        Below is a quick guide to help you pick the right size for Kurti pants, Palazzos and Leggings.
        Measurements are in centimetres (cm). If you prefer, measure a favourite pair of pants that fits well
        and compare.
      </p>

      <h2>How to Measure</h2>
      <ul>
        <li><strong>Waist:</strong> Measure around the narrowest part of your waist or where you normally wear your pants.</li>
        <li><strong>Hip:</strong> Measure around the fullest part of your hips.</li>
        <li><strong>Inseam:</strong> Measure from the crotch seam to the bottom hem (inside leg).</li>
        <li><strong>Rise:</strong> Measure from the crotch seam to the top of the waistband (front).</li>
      </ul>

      <h2>Seemati Size Chart (approx.)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
            <th style={{ padding: "8px 6px" }}>Size</th>
            <th style={{ padding: "8px 6px" }}>Waist (cm)</th>
            <th style={{ padding: "8px 6px" }}>Hip (cm)</th>
            <th style={{ padding: "8px 6px" }}>Inseam (cm)</th>
            <th style={{ padding: "8px 6px" }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "10px 6px" }}>S (28)</td>
            <td style={{ padding: "10px 6px" }}>66–72</td>
            <td style={{ padding: "10px 6px" }}>88–94</td>
            <td style={{ padding: "10px 6px" }}>66–70</td>
            <td style={{ padding: "10px 6px" }}>Slim/regular fit</td>
          </tr>
          <tr>
            <td style={{ padding: "10px 6px" }}>M (30)</td>
            <td style={{ padding: "10px 6px" }}>72–78</td>
            <td style={{ padding: "10px 6px" }}>94–100</td>
            <td style={{ padding: "10px 6px" }}>68–72</td>
            <td style={{ padding: "10px 6px" }}>Regular fit</td>
          </tr>
          <tr>
            <td style={{ padding: "10px 6px" }}>L (32)</td>
            <td style={{ padding: "10px 6px" }}>78–84</td>
            <td style={{ padding: "10px 6px" }}>100–106</td>
            <td style={{ padding: "10px 6px" }}>70–74</td>
            <td style={{ padding: "10px 6px" }}>Comfort fit / palazzos</td>
          </tr>
          <tr>
            <td style={{ padding: "10px 6px" }}>XL (34)</td>
            <td style={{ padding: "10px 6px" }}>84–90</td>
            <td style={{ padding: "10px 6px" }}>106–112</td>
            <td style={{ padding: "10px 6px" }}>70–74</td>
            <td style={{ padding: "10px 6px" }}>Relaxed fit</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ marginTop: 18 }}>Fit Recommendations</h2>
      <ul>
        <li>If you prefer a snug look, choose the lower end of the waist range.</li>
        <li>If you want comfortable movement, choose the higher end or a size above your measurement.</li>
        <li>For palazzos and wide-leg styles, fit is relaxed; focus on hip measurement for comfort.</li>
      </ul>

      <h2>Need help choosing?</h2>
      <p>
        If you're still unsure, message us with your waist &amp; hip measurements at <strong>srikrishnaapparells@gmail.com</strong>,
        and we’ll recommend the best size.
      </p>
    </div>
  );
}
