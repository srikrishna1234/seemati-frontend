# ADMIN SYSTEM STABILITY NOTE

Admin Product system stabilized on Dec 2025.

LOCKED & WORKING:
- Product create
- Product edit
- Sizes, colors, videoUrl persistence
- Admin + public route separation

DO NOT casually modify:
- backend/models/Product.cjs
- backend/src/controllers/productController.cjs
- backend/src/routes/productRoutes.cjs
- backend/src/routes/adminProduct.cjs
- backend/app.cjs
- src/admin/AddProduct.js
- src/admin/AdminProductEdit.js
- src/admin/AdminProductList.js
- src/api/axiosInstance.js

Recovery point:
git checkout admin-stable-v1
