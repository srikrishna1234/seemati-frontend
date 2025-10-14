export function buildProductPayload(formState, originalProduct) {
  const payload = {
    title: formState.title,
    description: formState.description,
    price: Number(formState.price),
    // include other simple fields unconditionally if you want
  };

  // Images handling:
  // If you have a dedicated images array state (recommended), compare with original
  if (Array.isArray(formState.images)) {
    // if different from original, include it; otherwise omit to preserve backend
    const changed = JSON.stringify(formState.images) !== JSON.stringify(originalProduct.images || []);
    if (changed) {
      payload.images = formState.images;
    }
  } else if (typeof formState.imagesInput === 'string') {
    // imagesInput is the comma-separated text field
    const arr = formState.imagesInput.split(',').map(s => s.trim()).filter(Boolean);
    if (arr.length) payload.images = arr;
    // if arr is empty and originalProduct.images exists, omit -> keep existing
  }

  // Colors: parse comma-separated into array
  if (typeof formState.colorsInput === 'string') {
    const cArr = formState.colorsInput.split(',').map(s => s.trim()).filter(Boolean);
    if (cArr.length) payload.colors = cArr;
    // if empty, omit to preserve existing colors
  }

  return payload;
}
