# Seemati Ladies Wear — React Shop (Test Mode)

This is a ready-to-run React (Create React App) project for **Seemati Ladies Wear** with a demo shopping cart and **Razorpay Test Mode** checkout.

## Prerequisites
- Install **Node.js (LTS)** from https://nodejs.org
- Verify in terminal:
  ```bash
  node -v
  npm -v
  ```

## How to Run (Localhost)
1. Unzip the folder.
2. Open a terminal in the unzipped folder (where `package.json` is).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open http://localhost:3000 in your browser.

## Test a Payment
- Add any products to the cart.
- Click **Proceed to Checkout (Test)**.
- The Razorpay popup opens (Test Mode). Use any test method from the Razorpay dashboard docs.
- On success, you’ll see a success alert and the cart will clear.

> The project includes the Razorpay SDK via `<script>` in `public/index.html`. In **test mode**, payments are just simulated.

## Switch to Live Later
- In `src/App.js`, replace the `key`:
  ```js
  key: 'rzp_test_1234567890abcdef' // -> your Live Key ID like 'rzp_live_...'
  ```
- You also need a small backend to verify signatures for production (Node/PHP).

## Customizing
- Replace the placeholder images in `public/images/` with your real product photos (keep same file names or update paths in `src/App.js`).
- Update company contact details in the **Contact Us** section.
- Link a real PDF in the Catalog button (currently shows a demo alert).

## Build for Hosting
```bash
npm run build
```
This creates a production build in the `build/` folder. You can upload it to Netlify/Vercel/any static host.
