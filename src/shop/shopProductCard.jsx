// src/shop/shopProductCard.jsx
import React from "react";
import PropTypes from "prop-types";

export default function ShopProductCard({ product, onClick }) {
  const thumb =
    product?.thumbnail || (product?.images && product.images[0]) || "";
  const altText = product?.title
    ? `${product.title} — Seemati`
    : "product image";

  const displayWidth = 240;
  const displayHeight = 240;

  return (
    <article
      className="group bg-white rounded-2xl shadow-sm p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick()}
    >
      <div className="w-full flex items-center justify-center overflow-hidden">
        <img
          src={thumb}
          alt={altText}
          loading="lazy"
          decoding="async"
          width={displayWidth}
          height={displayHeight}
          className="w-[240px] h-[240px] object-cover rounded-xl block"
        />
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-medium line-clamp-2">
          {product?.title}
        </h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-lg font-semibold">
            {typeof product?.price === "number"
              ? `₹${product.price.toFixed(2)}`
              : `₹${product?.price}`}
          </span>
          {product?.images && product.images.length > 1 && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
              {product.images.length} pics
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

ShopProductCard.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    slug: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    thumbnail: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onClick: PropTypes.func,
};
