// Service to handle dynamic images and category presets for items

export const getProductImage = (item) => {
  if (!item) return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';

  // 1. If user uploaded a custom file attachment and it is an image, use the Base64 representation
  if (item.fileAttachment && item.fileAttachment.base64 && item.fileAttachment.type.startsWith('image/')) {
    return item.fileAttachment.base64;
  }

  // 2. If user specified a custom image URL, use it
  if (item.imageUrl && item.imageUrl.trim()) {
    return item.imageUrl.trim();
  }

  // 3. Fallback to category-based preset Unsplash images
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (cat.includes('laptop') || cat.includes('computer') || cat.includes('electronic') || cat.includes('hardware') || name.includes('laptop') || name.includes('computer') || name.includes('pc') || name.includes('monitor')) {
    return 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; // Laptop
  }
  if (cat.includes('phone') || cat.includes('mobile') || name.includes('phone') || name.includes('mobile')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; // Smartphone
  }
  if (cat.includes('furniture') || cat.includes('chair') || cat.includes('table') || cat.includes('desk') || name.includes('chair') || name.includes('table') || name.includes('desk')) {
    return 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; // Furniture
  }
  if (cat.includes('stationery') || cat.includes('office') || cat.includes('book') || cat.includes('pen') || name.includes('pen') || name.includes('book') || name.includes('notebook')) {
    return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; // Books & Stationery
  }
  if (cat.includes('apparel') || cat.includes('cloth') || cat.includes('shirt') || cat.includes('shoe') || name.includes('shirt') || name.includes('tshirt') || name.includes('shoe')) {
    return 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; // Apparel
  }
  if (cat.includes('tool') || cat.includes('machinery') || cat.includes('asset') || name.includes('drill') || name.includes('tool') || name.includes('hammer')) {
    return 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; // Tools & Asset Hardware
  }

  // Default fallback cardboard box/warehouse image
  return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';
};
